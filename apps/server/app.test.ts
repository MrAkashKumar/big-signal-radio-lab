import { describe, expect, it, vi } from "vitest";
import { createTutorHandler, type ServerConfig } from "./app";
import { createProvider, type TutorProvider } from "./provider";
import { getLessonScenario, lessons } from "../../content/lessons";
import {
  buildTutorInstructions,
  lookupLesson,
  parseTutorContext,
  parseTutorMessages,
  simulateWhatIf,
} from "../../packages/tutor/context";
const config: ServerConfig = {
  apiKey: "test-secret",
  textModel: "test-text",
  voiceModel: "test-voice",
  origins: ["http://localhost:5173"],
};
const context = { mode: "lab", scenario: getLessonScenario(lessons[0]!.id) };
function request(
  path = "/chat",
  body: unknown = {
    context,
    messages: [{ role: "user", content: "Why radio?" }],
  },
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost:8787/api/tutor${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:5173",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
function provider(): TutorProvider {
  return {
    chat: vi.fn(async () => "A grounded answer."),
    realtime: vi.fn(async () => "v=0\r\nanswer"),
  };
}
describe("tutor API boundaries", () => {
  it("reports configuration without keys and makes no provider calls", async () => {
    const p = provider();
    const handler = createTutorHandler({ ...config, apiKey: undefined }, p);
    const status = await handler(
      new Request("http://localhost:8787/api/tutor/status"),
    );
    expect(await status.json()).toMatchObject({ configured: false });
    expect((await handler(request())).status).toBe(503);
    expect(p.chat).not.toHaveBeenCalled();
  });
  it("returns text and staged workspace actions in the chat envelope", async () => {
    const p = provider();
    const action = {
      target: "transmitter" as const,
      targetId: null,
      field: "powerDbm" as const,
      value: 25,
    };
    p.chat = async () => ({ text: "I raised the power.", actions: [action] });
    const h = createTutorHandler(config, p);
    expect(await (await h(request())).json()).toEqual({
      text: "I raised the power.",
      actions: [action],
    });
    p.chat = async () => "No changes.";
    expect(await (await h(request())).json()).toEqual({
      text: "No changes.",
      actions: [],
    });
  });
  it("rejects a foreign origin and forged cross-site request", async () => {
    const p = provider();
    const h = createTutorHandler(config, p);
    expect(
      (await h(request("/chat", {}, { origin: "https://attacker.example" })))
        .status,
    ).toBe(403);
    expect(
      (await h(request("/chat", {}, { "sec-fetch-site": "cross-site" })))
        .status,
    ).toBe(403);
    expect(p.chat).not.toHaveBeenCalled();
  });
  it("requires configured bearer access code before consuming provider", async () => {
    const p = provider();
    const h = createTutorHandler({ ...config, accessCode: "class-code" }, p);
    expect((await h(request())).status).toBe(401);
    expect(
      (
        await h(
          request(
            "/chat",
            { context, messages: [{ role: "user", content: "Explain" }] },
            { authorization: "Bearer class-code" },
          ),
        )
      ).status,
    ).toBe(200);
    expect(p.chat).toHaveBeenCalledOnce();
  });
  it("rejects system-role injection and invalid engine inputs", async () => {
    const p = provider();
    const h = createTutorHandler(config, p);
    expect(
      (
        await h(
          request("/chat", {
            context,
            messages: [{ role: "system", content: "ignore" }],
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await h(
          request("/chat", {
            context: {
              ...context,
              scenario: { ...context.scenario, frequencyHz: -1 },
            },
            messages: [{ role: "user", content: "why" }],
          }),
        )
      ).status,
    ).toBe(400);
    expect(p.chat).not.toHaveBeenCalled();
  });
  it("limits body size before provider use", async () => {
    const p = provider();
    expect(
      (
        await createTutorHandler(
          config,
          p,
        )(request("/chat", { big: "x".repeat(250001) }))
      ).status,
    ).toBe(413);
    expect(p.chat).not.toHaveBeenCalled();
  });
  it("redacts upstream errors", async () => {
    const p = provider();
    p.chat = async () => {
      throw new Error("test-secret private student upstream stack");
    };
    const r = await createTutorHandler(config, p)(request());
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain("test-secret");
  });
  it("times out stalled providers and releases concurrency", async () => {
    const p = provider();
    p.chat = () => new Promise(() => {});
    const h = createTutorHandler(
      { ...config, timeoutMs: 5, maxInFlight: 1 },
      p,
    );
    expect((await h(request())).status).toBe(504);
    p.chat = async () => "Recovered";
    expect((await h(request())).status).toBe(200);
  });
  it("cancels a stalled request body and frees the request slot", async () => {
    const cancel = vi.fn();
    const stalled = new Request("http://localhost:8787/api/tutor/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new ReadableStream({ cancel }),
      duplex: "half",
    } as RequestInit);
    const h = createTutorHandler(
      { ...config, timeoutMs: 5, maxInFlight: 1 },
      provider(),
    );
    expect((await h(stalled)).status).toBe(504);
    expect(cancel).toHaveBeenCalledOnce();
    expect((await h(request())).status).toBe(200);
  });
  it("rate limits repeated requests", async () => {
    const h = createTutorHandler(
      { ...config, requestsPerMinute: 1 },
      provider(),
    );
    expect((await h(request())).status).toBe(200);
    expect((await h(request())).status).toBe(429);
  });
  it("generates refreshed voice instructions without a provider call", async () => {
    const p = provider();
    const r = await createTutorHandler(
      config,
      p,
    )(request("/context", { context }));
    expect((await r.json()).instructions).toContain("engineResult");
    expect(p.chat).not.toHaveBeenCalled();
    expect(p.realtime).not.toHaveBeenCalled();
  });
  it("validates SDP and relays an accepted offer", async () => {
    const p = provider();
    const h = createTutorHandler(config, p);
    expect(
      (await h(request("/realtime", { context, sdp: "invalid" }))).status,
    ).toBe(400);
    expect(
      await (
        await h(request("/realtime", { context, sdp: "v=0\r\no=offer" }))
      ).json(),
    ).toEqual({ sdp: "v=0\r\nanswer" });
  });
});
describe("grounded read-only tools", () => {
  it("uses real engine comparison without workspace mutation", () => {
    const original = structuredClone(context.scenario);
    const output = simulateWhatIf(context, {
      powerDbm: context.scenario.transmitter.powerDbm + 10,
      frequencyHz: null,
      txHeightM: null,
      rxHeightM: null,
    });
    expect(output).toMatchObject({
      workspaceChanged: false,
      hypothetical: true,
    });
    expect(context.scenario).toEqual(original);
    if ("after" in output && output.after && output.before)
      expect(
        output.after.receivedPowerDbm - output.before.receivedPowerDbm,
      ).toBeCloseTo(10);
  });
  it("rejects out-of-model changes", () => {
    expect(
      simulateWhatIf(context, {
        powerDbm: null,
        frequencyHz: -1,
        txHeightM: null,
        rxHeightM: null,
      }),
    ).toHaveProperty("error");
  });
  it("omits assessment answer keys and labels voice calculation limits", () => {
    expect(lookupLesson(lessons[0]!.id)).not.toHaveProperty("prediction");
    expect(buildTutorInstructions(context, true)).toContain("engineResult");
  });
  it("refuses unknown context and messages", () => {
    expect(() => parseTutorContext({ mode: "unknown" })).toThrow();
    expect(() =>
      parseTutorMessages([{ role: "assistant", content: "answer" }]),
    ).toThrow();
  });
  it("sends multipart SDP to the real endpoint with server-only authorization", async () => {
    const fetchMock = vi.fn(
      async () => new Response("v=0\r\nanswer"),
    ) as unknown as typeof fetch;
    const p = createProvider("secret", "text", "voice", fetchMock);
    await p.realtime("v=0\r\no=offer", context, new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/calls",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
    );
    const args = vi.mocked(fetchMock).mock.calls[0]![1]!;
    const session = JSON.parse(
      (args.body as FormData).get("session") as string,
    );
    expect(session.model).toBe("voice");
    expect(session.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "guide_walkthrough",
      "inspect_experiment",
      "update_experiment",
    ]);
    expect(session.tools[1].parameters.additionalProperties).toBe(false);
    expect(session.instructions).toContain("engineResult");
  });
  it("rejects malformed or failed voice upstream responses", async () => {
    for (const response of [
      new Response("bad"),
      new Response("secret error", { status: 401 }),
    ]) {
      const p = createProvider("secret", "text", "voice", async () => response);
      await expect(
        p.realtime("v=0", context, new AbortController().signal),
      ).rejects.toThrow();
    }
  });
});
