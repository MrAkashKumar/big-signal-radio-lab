import { timingSafeEqual } from "node:crypto";
import {
  buildTutorInstructions,
  parseTutorContext,
  parseTutorMessages,
} from "../../packages/tutor/context";
import type { TutorProvider } from "./provider";
export interface ServerConfig {
  apiKey?: string;
  accessCode?: string;
  textModel: string;
  voiceModel: string;
  origins: string[];
  timeoutMs?: number;
  maxInFlight?: number;
  requestsPerMinute?: number;
}
function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
class InputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
async function readBody(request: Request, signal: AbortSignal) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new InputError("Use application/json.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("A request body is required.");
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      if (signal.aborted) throw new Error("Aborted");
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error("Aborted");
      if (done) break;
      size += value.byteLength;
      if (size > 250000) {
        await reader.cancel();
        throw new InputError("Request is too large.", 413);
      }
      chunks.push(value);
    }
    try {
      const parsed: unknown = JSON.parse(
        Buffer.concat(chunks).toString("utf8"),
      );
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("Invalid object");
      return parsed as Record<string, unknown>;
    } catch {
      throw new InputError("Invalid JSON.");
    }
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
export function createTutorHandler(
  config: ServerConfig,
  provider: TutorProvider,
) {
  let inFlight = 0;
  const buckets = new Map<string, { count: number; until: number }>();
  return async (request: Request, clientId = "local"): Promise<Response> => {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    if (origin && !config.origins.includes(origin))
      return json({ error: "This origin is not allowed." }, 403);
    if (request.headers.get("sec-fetch-site") === "cross-site")
      return json({ error: "Cross-site requests are not allowed." }, 403);
    if (url.pathname === "/api/tutor/status" && request.method === "GET")
      return json({
        configured: Boolean(config.apiKey),
        accessCodeRequired: Boolean(config.accessCode),
        textModel: config.textModel,
        voiceModel: config.voiceModel,
      });
    if (
      ![
        "/api/tutor/chat",
        "/api/tutor/realtime",
        "/api/tutor/context",
      ].includes(url.pathname)
    )
      return json({ error: "Not found." }, 404);
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    if (config.accessCode) {
      const actual = Buffer.from(request.headers.get("authorization") ?? "");
      const expected = Buffer.from(`Bearer ${config.accessCode}`);
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        return json({ error: "Enter the tutor access code." }, 401);
    }
    if (!config.apiKey)
      return json(
        {
          error:
            "The tutor is not configured. The host needs to set OPENAI_API_KEY.",
        },
        503,
      );
    const now = Date.now();
    for (const [id, bucket] of buckets)
      if (bucket.until <= now) buckets.delete(id);
    const key = `${clientId}:${url.pathname === "/api/tutor/context" ? "context" : "provider"}`;
    const bucket = buckets.get(key) ?? { count: 0, until: now + 60000 };
    if (
      bucket.count >=
      (url.pathname === "/api/tutor/context"
        ? 60
        : (config.requestsPerMinute ?? 12))
    )
      return json({ error: "Please wait a minute before asking again." }, 429);
    if (buckets.size >= 10000 && !buckets.has(key))
      return json({ error: "Tutor is busy. Try again shortly." }, 503);
    bucket.count++;
    buckets.set(key, bucket);
    if (inFlight >= (config.maxInFlight ?? 4))
      return json({ error: "Tutor is busy. Try again shortly." }, 429);
    inFlight++;
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) controller.abort();
    const timer = setTimeout(abort, config.timeoutMs ?? 45000);
    try {
      const body = await readBody(request, controller.signal);
      let context;
      try {
        context = parseTutorContext(body.context);
      } catch {
        throw new InputError(
          "Invalid experiment context. Reopen a valid experiment and try again.",
        );
      }
      if (url.pathname === "/api/tutor/context")
        return json({ instructions: buildTutorInstructions(context, true) });
      let work: Promise<unknown>;
      if (url.pathname === "/api/tutor/chat") {
        let messages;
        try {
          messages = parseTutorMessages(body.messages);
        } catch (error) {
          throw new InputError((error as Error).message);
        }
        work = provider
          .chat(messages, context, controller.signal)
          .then((result) =>
            typeof result === "string" ? { text: result, actions: [] } : result,
          );
      } else {
        if (
          typeof body.sdp !== "string" ||
          !body.sdp.startsWith("v=0") ||
          body.sdp.length > 100000
        )
          throw new InputError("Invalid voice connection offer.");
        work = provider
          .realtime(body.sdp, context, controller.signal)
          .then((sdp) => ({ sdp }));
      }
      const result = await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          if (controller.signal.aborted) reject(new Error("Aborted"));
          else
            controller.signal.addEventListener(
              "abort",
              () => reject(new Error("Aborted")),
              { once: true },
            );
        }),
      ]);
      return json(result);
    } catch (error) {
      if (error instanceof InputError)
        return json({ error: error.message }, error.status);
      if (controller.signal.aborted)
        return json(
          {
            error:
              "The tutor request timed out or was cancelled. Please try again.",
          },
          504,
        );
      return json(
        {
          error:
            "The tutor could not respond. Check the host’s API configuration and try again.",
        },
        502,
      );
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abort);
      inFlight--;
    }
  };
}
