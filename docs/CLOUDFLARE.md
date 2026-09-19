# Run and deploy on Cloudflare Workers

The `bigsignal` Worker serves the built web app and the existing tutor API at `https://bigsignal.edmundlim.systems`. Static Assets serves the public site. `/api` and `/api/*` always reach the Worker, including browser navigation requests, so unknown API routes return JSON 404 responses instead of the SPA.

## Check locally

```sh
bun install --frozen-lockfile
bun run test
bun run build
bun run check:worker
bun run test:worker-runtime
```

`check:worker` packages the Worker without uploading or provisioning resources. `test:worker-runtime` starts an isolated local workerd process, uses temporary fake credentials, and checks static assets, SPA navigation, API status, strict origin, a valid context response without authorization, and the per-client rate limit. It never calls an AI provider. The script stops its process and removes its temporary files afterward.

For interactive Workers development, copy `.dev.vars.example` to `.dev.vars`, set the local origin to match your browser, and run `bun run dev:worker`. With no API key, the site remains available and paid tutor endpoints fail closed. Local secret files are ignored by Git.

`bun run dev`, `bun run dev:server`, and `bun start` keep their existing Vite and local Node/Bun server behavior. The Worker adapter does not import the local server's filesystem or HTTP listener.

## Configure production

The deployment owner must securely set the `OPENAI_API_KEY` Worker secret for server-side provider requests. The deployed tutor does not require an access code and ignores any legacy `BIGSIGNAL_TUTOR_TOKEN` secret. The local Node/Bun server retains its existing optional access-code authentication.

Do not put the API key in Wrangler configuration, source files, GitHub workflow files, shell arguments, or browser environment variables. GitHub Actions only needs deployment credentials; provider credentials remain Worker secrets.

Add repository Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token needs permission to deploy Workers and update the configured custom domain in the intended account. Keep the account ID out of source so local and CI account selection stay explicit.

The public origin is fixed in `wrangler.jsonc` to `https://bigsignal.edmundlim.systems`. Production does not enable `workers.dev` or preview URLs. The configured compatibility date is `2026-09-13`, with `nodejs_compat` for the existing server's crypto and Buffer usage.

## Release through GitHub Actions

Pull requests and pushes to `main` run the full tests, both TypeScript checks, the web build, Wrangler dry run, and local Workers runtime checks. Only a verified push to `main` deploys. The deploy job downloads the exact web assets built by its verification job. The deployment job is serialized. Immediately before deployment, an authenticated GitHub API check compares the current `main` SHA with the run’s `GITHUB_SHA`. An older run skips deployment after `main` advances; an API failure stops the job. Serialization alone does not guarantee queue order.

The deploy command is `bun run deploy:worker`. It uploads the Worker and Static Assets and applies the configured custom domain. The coordinator owns the first deployment, DNS, and secret provisioning. No deployment occurs during local tests or the dry run.

## Runtime limits and observability

The adapter retains the handler per environment and refreshes it when configuration or credentials change. This preserves the existing rate and concurrency maps within an isolate without retaining request bodies or response objects. Cloudflare may run multiple isolates and replace them at any time. These limits are therefore best-effort per-isolate limits, not a global account spending cap.

Worker Logs records invocation status. Traces samples 10% of requests. Application logs include method, path, and status, without prompts, SDP, authorization headers, IP addresses, or secrets. The provider's Agents SDK tracing remains disabled as in the local server.

The generated `apps/worker/worker-configuration.d.ts` reflects pinned Wrangler `4.131.1` and the configured runtime. Run `bun run types:worker` after changing bindings or compatibility settings. Worker types are checked separately to avoid changing browser DOM and fetch types.

## Sources

- [Workers Static Assets routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Bindings and isolate reuse](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
