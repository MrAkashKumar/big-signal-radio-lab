import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createTutorHandler, type ServerConfig } from "./app";
import { createProvider } from "./provider";
import {
  DEFAULT_TEXT_MODEL,
  DEFAULT_VOICE_MODEL,
  readVoiceTuning,
} from "./tuning";
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const config: ServerConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  accessCode: process.env.BIGSIGNAL_TUTOR_TOKEN,
  textModel: process.env.OPENAI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
  voiceModel: process.env.OPENAI_VOICE_MODEL || DEFAULT_VOICE_MODEL,
  origins: process.env.APP_ORIGIN
    ? process.env.APP_ORIGIN.split(",").map(
        (value) => new URL(value.trim()).origin,
      )
    : [5173, 5176, 4181, 8787].flatMap((value) => [
        `http://localhost:${value}`,
        `http://127.0.0.1:${value}`,
      ]),
};
if (
  host !== "127.0.0.1" &&
  host !== "localhost" &&
  (!config.accessCode || !process.env.APP_ORIGIN)
)
  throw new Error(
    "Public serving requires APP_ORIGIN and BIGSIGNAL_TUTOR_TOKEN.",
  );
const handler = createTutorHandler(
  config,
  createProvider(
    config.apiKey ?? "",
    config.textModel,
    config.voiceModel,
    fetch,
    readVoiceTuning(process.env),
  ),
);
const root = resolve("apps/web/dist");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  const controller = new AbortController();
  req.on("aborted", () => controller.abort());
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (url.pathname.startsWith("/api/")) {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers))
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      let cleanup = () => {};
      const stream =
        req.method !== "GET" && req.method !== "HEAD"
          ? new ReadableStream<Uint8Array>({
              start(streamController) {
                const data = (chunk: Buffer) => {
                  streamController.enqueue(chunk);
                  if ((streamController.desiredSize ?? 0) <= 0) req.pause();
                };
                const end = () => {
                  cleanup();
                  streamController.close();
                };
                const error = (cause: Error) => {
                  cleanup();
                  streamController.error(cause);
                };
                cleanup = () => {
                  req.off("data", data);
                  req.off("end", end);
                  req.off("error", error);
                };
                req.on("data", data);
                req.on("end", end);
                req.on("error", error);
              },
              pull() {
                req.resume();
              },
              cancel() {
                cleanup();
                req.resume();
              },
            })
          : undefined;
      const request = new Request(url, {
        method: req.method,
        headers,
        signal: controller.signal,
        ...(req.method !== "GET" && req.method !== "HEAD"
          ? { body: stream, duplex: "half" }
          : {}),
      } as RequestInit);
      const response = await handler(
        request,
        req.socket.remoteAddress ?? "unknown",
      );
      if (stream && !stream.locked) await stream.cancel().catch(() => {});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let file = path;
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, "index.html");
    } catch {
      if (extname(path)) {
        res.writeHead(404);
        res.end();
        return;
      }
      file = resolve(root, "index.html");
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Cache-Control": file.includes(`${sep}assets${sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Permissions-Policy": "microphone=(self)",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end("Unable to serve this request.");
  }
});
server.requestTimeout = 60000;
server.headersTimeout = 10000;
server.listen(port, host, () =>
  console.log(
    `BIG SIGNAL at http://${host}:${port} — tutor ${config.apiKey ? "configured" : "awaiting OPENAI_API_KEY"}`,
  ),
);
