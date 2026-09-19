import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createMission } from "../apps/web/src/missions";

const root = resolve(import.meta.dirname, "..");
const config = JSON.parse(await readFile(join(root, "wrangler.jsonc"), "utf8"));
const directory = await mkdtemp(join(tmpdir(), "bigsignal-worker-check-"));
const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const address = listener.address();
assert(address && typeof address === "object");
const port = address.port;
await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
const origin = `http://127.0.0.1:${port}`;
const localConfig = {
  ...config,
  main: join(root, config.main),
  assets: { ...config.assets, directory: join(root, config.assets.directory) },
  vars: { ...config.vars, OPENAI_API_KEY: "runtime-test-unused" },
};
delete localConfig.routes;
delete localConfig.account_id;
delete localConfig.$schema;
await writeFile(join(directory, "wrangler.json"), JSON.stringify(localConfig));
await writeFile(join(directory, ".dev.vars"), "");
const processEnv = { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "true" };
delete processEnv.CLOUDFLARE_API_TOKEN;
delete processEnv.CLOUDFLARE_ACCOUNT_ID;
const child = spawn("node", [join(root, "node_modules/wrangler/bin/wrangler.js"), "dev", "--local", "--config", join(directory, "wrangler.json"),
  "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0", "--log-level", "error"], {
  cwd: directory, env: processEnv, stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (data) => { output = (output + data).slice(-12000); });
child.stderr.on("data", (data) => { output = (output + data).slice(-12000); });
const exited = once(child, "exit");
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Wrangler exited before readiness. ${output}`);
    try {
      const response = await fetch(`${origin}/api/tutor/status`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(250);
  }
  assert(ready, `Local Worker did not start. ${output}`);
  const status = await fetch(`${origin}/api/tutor/status`);
  assert.equal(status.headers.get("cache-control"), "no-store");
  assert.deepEqual(await status.json(), {
    configured: true, accessCodeRequired: false,
    textModel: config.vars.OPENAI_TEXT_MODEL, voiceModel: config.vars.OPENAI_VOICE_MODEL,
  });
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<div id="root"><\/div>/);
  const asset = /src="([^"]+\.js)"/.exec(html)?.[1];
  assert(asset, "Built JavaScript asset is linked");
  assert.equal((await fetch(new URL(asset, origin))).status, 200);
  const spa = await fetch(`${origin}/learn/radio`, { headers: { "Sec-Fetch-Mode": "navigate" } });
  assert.equal(spa.status, 200);
  assert.match(await spa.text(), /<div id="root"><\/div>/);
  const unknown = await fetch(`${origin}/api/not-a-route`, { headers: { "Sec-Fetch-Mode": "navigate" } });
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get("content-type") ?? "", /application\/json/);
  const body = JSON.stringify({ context: { mode: "lab", scenario: createMission("VHF") } });
  const requestContext = (originHeader = config.vars.APP_ORIGIN) => fetch(`${origin}/api/tutor/context`, {
    method: "POST", headers: { Origin: originHeader, "Content-Type": "application/json" }, body,
  });
  assert.equal((await requestContext("https://foreign.example")).status, 403);
  const authorized = await requestContext();
  assert.equal(authorized.status, 200);
  assert.match((await authorized.json()).instructions, /engineResult/);
  for (let i = 1; i < 60; i++) assert.equal((await requestContext()).status, 200);
  assert.equal((await requestContext()).status, 429, "Same environment preserves the rate bucket across Worker requests");
  console.log("PASS Workers runtime: status, public assets, SPA navigation, API 404, strict origin, context without authorization, persistent rate limit. No provider API calls made.");
} finally {
  child.kill("SIGTERM");
  await Promise.race([exited, delay(3000)]);
  if (child.exitCode === null) { child.kill("SIGKILL"); await exited; }
  await rm(directory, { recursive: true, force: true });
}
