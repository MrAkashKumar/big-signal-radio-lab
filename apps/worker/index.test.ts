import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMission } from "../web/src/missions";
import worker, { type WorkerBindings } from "./index";
import { createProvider } from "../server/provider";

const provider = vi.hoisted(() => ({ chat: vi.fn(), realtime: vi.fn() }));
vi.mock("../server/provider", () => ({ createProvider: vi.fn(() => provider) }));

function bindings(): WorkerBindings {
  return {
    ASSETS: { fetch: vi.fn(async () => new Response("static site")) },
    APP_ORIGIN: "https://bigsignal.edmundlim.systems",
    OPENAI_TEXT_MODEL: "gpt-5.4-mini", OPENAI_VOICE_MODEL: "gpt-realtime-2.1-mini",
    OPENAI_VOICE_THRESHOLD: "0.7", OPENAI_VOICE_SILENCE_MS: "1000", OPENAI_VOICE_NOISE_REDUCTION: "near_field",
    OPENAI_API_KEY: "test-only-key",
  };
}
const context = { mode: "lab", scenario: createMission("VHF") };
function chat(ip = "192.0.2.1") {
  return new Request("https://bigsignal.edmundlim.systems/api/tutor/chat", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://bigsignal.edmundlim.systems", "CF-Connecting-IP": ip },
    body: JSON.stringify({ context, messages: [{ role: "user", content: "Explain the link." }] }),
  });
}

beforeEach(() => {
  vi.mocked(createProvider).mockClear();
  provider.chat.mockReset().mockResolvedValue("Test explanation");
  provider.realtime.mockReset().mockResolvedValue("v=0\r\nanswer");
});

describe("Workers adapter", () => {
  it("serves public static content without initializing tutor credentials", async () => {
    const env = bindings();
    delete env.OPENAI_API_KEY;
    expect(await (await worker.fetch(new Request("https://bigsignal.edmundlim.systems/"), env)).text()).toBe("static site");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });
  it("never serves SPA HTML for an unknown API route", async () => {
    const env = bindings();
    const response = await worker.fetch(new Request("https://bigsignal.edmundlim.systems/api/unknown", { headers: { "Sec-Fetch-Mode": "navigate" } }), env);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });
  it("allows requests without an access code and enforces the exact origin", async () => {
    const env = bindings();
    const foreign = chat();
    foreign.headers.set("origin", "https://evil.example");
    expect((await worker.fetch(foreign, env)).status).toBe(403);
    expect(provider.chat).not.toHaveBeenCalled();
    expect((await worker.fetch(chat(), env)).status).toBe(200);
  });
  it("reports an unconfigured tutor when the API key is missing", async () => {
    const env = bindings();
    delete env.OPENAI_API_KEY;
    expect((await worker.fetch(chat(), env)).status).toBe(503);
    expect(provider.chat).not.toHaveBeenCalled();
    const status = await worker.fetch(new Request("https://bigsignal.edmundlim.systems/api/tutor/status"), env);
    expect(await status.json()).toMatchObject({ configured: false, accessCodeRequired: false });
  });
  it("retains per-client limits across fetch calls and separates client IPs", async () => {
    const env = bindings();
    for (let i = 0; i < 12; i++) expect((await worker.fetch(chat(), env)).status).toBe(200);
    expect((await worker.fetch(chat(), env)).status).toBe(429);
    expect((await worker.fetch(chat("192.0.2.2"), env)).status).toBe(200);
    expect(provider.chat).toHaveBeenCalledTimes(13);
  });
  it("retains concurrency limits across requests", async () => {
    const env = bindings();
    let release!: () => void;
    const pending = new Promise<string>((resolve) => { release = () => resolve("done"); });
    provider.chat.mockReturnValue(pending);
    const requests = Array.from({ length: 4 }, (_, i) => worker.fetch(chat(`192.0.2.${i}`), env));
    await vi.waitFor(() => expect(provider.chat).toHaveBeenCalledTimes(4));
    expect((await worker.fetch(chat("192.0.2.99"), env)).status).toBe(429);
    release();
    expect((await Promise.all(requests)).every((r) => r.status === 200)).toBe(true);
  });
  it("ignores legacy access-code secrets", async () => {
    const env = Object.assign(bindings(), { BIGSIGNAL_TUTOR_TOKEN: "legacy-test-code" });
    const status = await worker.fetch(new Request("https://bigsignal.edmundlim.systems/api/tutor/status"), env);
    expect(await status.json()).toMatchObject({ configured: true, accessCodeRequired: false });
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    env.BIGSIGNAL_TUTOR_TOKEN = "different-legacy-code";
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    expect(createProvider).toHaveBeenCalledOnce();
  });
  it("refreshes the provider when its API key rotates", async () => {
    const env = bindings();
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    expect(createProvider).toHaveBeenLastCalledWith("test-only-key", env.OPENAI_TEXT_MODEL, env.OPENAI_VOICE_MODEL, expect.any(Function), expect.any(Object));
    env.OPENAI_API_KEY = "rotated-test-key";
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    expect(createProvider).toHaveBeenCalledTimes(2);
    expect(createProvider).toHaveBeenLastCalledWith("rotated-test-key", env.OPENAI_TEXT_MODEL, env.OPENAI_VOICE_MODEL, expect.any(Function), expect.any(Object));
  });
});
