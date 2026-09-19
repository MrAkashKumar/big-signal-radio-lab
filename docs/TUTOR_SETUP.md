# Signal tutor setup

The optional tutor uses the OpenAI Agents SDK for text and OpenAI Realtime WebRTC for spoken conversation. The lessons and simulation remain usable without a key or internet. No simulated AI answers are substituted when the service is unavailable.

## Run locally

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to a project key with access to the configured models. Keep this file out of git. Never put the key in a `VITE_` variable or the browser.
2. Run `bun install`.
3. For development, run `bun run dev:server` and `bun run dev` in separate terminals. Vite proxies `/api` to port 8787.
4. For the complete production server, run `bun run build` followed by `bun run start`, then open `http://localhost:8787`.
5. Open Signal, send a question, then start voice and permit the microphone. Voice requires localhost or HTTPS, WebRTC, and network access to OpenAI. End voice when finished.

`GET /api/tutor/status` reports configuration presence, not provider connectivity or credit availability. No paid request occurs merely by loading the page. The bundled test suite uses mocks, not a live provider key.

## Voice-led project walkthrough

1. Select **Project walkthrough** in the header. The five-stop visual tour works without a key and preserves your current experiment.
2. Choose **Voice explanation language**: Auto, English, Tamil, Hindi, Malay, Mandarin, or Bengali. This sets the tutor's spoken/text explanation preference, not a full translation of the application. Language and accent quality require live testing.
3. Choose **Open voice guide**, review the OpenAI sharing notice, give consent, and press **Talk to Signal**. The selected stop's explanation is queued until voice connects. Microphone capture never starts merely by opening the tour.
4. Say “Please give a walkthrough of this project,” “Next,” or “Show the radio lab.” The voice model can call the bounded `guide_walkthrough` tool to open one of five tour stops. It pauses between stops for the audience rather than rapidly skipping screens.
5. In Radio lab, ask “Demonstrate raising the transmitter antenna to 15 metres and explain the result.” The existing validated edit tool reruns the authoritative engine. Use **Undo tutor change** to restore that change when no later manual edit would be overwritten.
6. Say “Explain that in Tamil” (or select another language). Keep English control names when following the on-screen instructions. Use **End voice** to release the microphone. **End tour** closes the visual guide only; it does not end a voice conversation.

Tour navigation does not reset, save, export, or complete experiments. Unknown stops, malformed arguments, duplicate calls, cancelled responses, and stale-context actions are rejected. After a navigation action, further tools in that response are rejected; the next model reply narrates the stop without tools. Settings edits from informational pages are blocked. Text chat can explain a tour but does not operate the navigation tool.

The walkthrough uses the existing server-created Realtime WebRTC session, not browser speech synthesis or a recorded voice. No fake voice is substituted when the service is unavailable. Its SVG teaching art is deliberately labelled illustrative, not field photography or simulation evidence.

**Credential safety:** never paste API keys into a chat or commit them. If one is exposed, revoke it and place a replacement only in the ignored local `.env` file or deployment secret store. Start/restart the tutor server after changing it. A configured status is not proof of model access or available credits.

### Node development fallback

If Bun is unavailable but Node 24 and the project's dependencies are installed, build and run the same server without changing the lockfile:

```sh
npx vite build --ssr apps/server/index.ts --outDir apps/server/dist
node --env-file-if-exists=.env apps/server/dist/index.js
```

Keep `bun run dev` (or the Vite development server) running separately on port 5173. Rebuild/restart this Node server after backend changes. `apps/server/dist` is generated and ignored by Git.

## Model and server configuration

| Variable                | Default                | Purpose                                                            |
| ----------------------- | ---------------------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`        | unset                  | Required for text and voice; server only                           |
| `OPENAI_TEXT_MODEL`     | `gpt-5.4-mini`         | Agents SDK model                                                   |
| `OPENAI_VOICE_MODEL`    | `gpt-realtime-2.1-mini`     | Realtime model; requires account access                            |
| `BIGSIGNAL_TUTOR_TOKEN` | unset                  | Optional local classroom access code; mandatory for public binding |
| `APP_ORIGIN`            | listed localhost ports | Exact allowed browser origins, comma separated                     |
| `HOST`                  | `127.0.0.1`            | Binding address; public binding requires origin and access code    |
| `PORT`                  | `8787`                 | Application and API server port                                    |

The default text model is GPT-5.4 Mini with low reasoning effort and low verbosity. Its 4,096-token output budget includes internal reasoning and tool arguments; the tutor prompt still targets 30–60 visible words. GPT-Realtime-2.1 Mini is the voice default, with GPT-4o Mini Transcribe for captions. These are speed/cost starting points, not a measured quality or latency guarantee for this course. Override the two model variables to compare against a larger model. Other text models retain their existing request settings to avoid sending unsupported reasoning options.

Voice uses a 0.7 activation threshold, 300 ms of leading audio, and 1,000 ms of silence before replying. Browser echo cancellation/noise suppression and server noise reduction are enabled; automatic microphone gain is disabled to avoid amplifying quiet background sounds. Natural interruptions remain enabled, subject to the higher threshold.

- `OPENAI_VOICE_THRESHOLD`: default `0.7`. Raise toward `0.8` if quiet noises still trigger speech; lower toward `0.6` if soft speech is missed.
- `OPENAI_VOICE_SILENCE_MS`: default `1000`, allowed `300`–`3000`. Increase for longer thinking pauses, at the cost of slower replies.
- `OPENAI_VOICE_NOISE_REDUCTION`: `near_field` (default) for a close microphone/headset, or `far_field` for a distant laptop microphone.

Restart your server after configuration edits and reconnect voice. Verify in your actual room: keyboard clicks and a brief breath should not start a turn; normal speech should; a short pause should not cut off your sentence. Microphone and room-specific behaviour requires listening tests.

To deploy the server, use a Bun-capable host behind HTTPS with `HOST=0.0.0.0`, `APP_ORIGIN=https://your-domain.example` and a strong `BIGSIGNAL_TUTOR_TOKEN`. Set provider spend limits in your OpenAI project. A static-only Pages deployment cannot run these API routes. No hosting target or paid infrastructure has been provisioned.

The access code is shared classroom access, not per-student identity. The server uses the direct socket address for rate limiting; it deliberately does not trust spoofable forwarding headers. Behind a reverse proxy all students may share that rate bucket. For larger deployments, use authenticated users and a shared rate limiter at your trusted ingress. Current limits are 12 provider requests per minute per direct client, 60 context refreshes, four concurrent requests, 250 KB request bodies, 20 chat messages, 24,000 conversation characters, eight agent turns, and a 45-second server timeout. Realtime audio travels directly between browser and OpenAI after the server creates the connection; HTTP limits govern connection creation, not ongoing audio spending. Classroom access control and provider spend limits remain important.

## Grounding and privacy

The text agent uses the OpenAI Agents SDK with the Responses API. A reused runner reduces setup overhead while each request retains isolated working state. Strict tool schemas, sequential edits, bounded tool turns, and a stable instruction prefix keep the agent focused. The existing integration does not create hosted Agents API sessions.

Four tools inspect the current experiment, retrieve a lesson, compare a read-only hypothetical change, and update the actual workspace. Editing supports transmitter/receiver settings, antenna presets, feedlines, positions, and existing disaster-network nodes and links. Both text and voice use the same validator and authoritative RF engine. The tutor cannot run arbitrary code or award mastery.

Text changes are staged until the reply succeeds and then applied as one batch. Voice executes completed tool calls once, supplies updated results back to the model, and ignores cancelled or duplicate calls. Stale responses cannot overwrite a changed setup. Demonstrations update the visible controls and results without counting as student attempts. Undo restores the previous setup if no later manual change would be overwritten.

A question sends the visible experiment settings and recent conversation to OpenAI. Starting voice sends microphone audio to OpenAI and may transcribe it. Do not share personal information in classroom experiments. The application server does not persist student conversations or log prompts, audio, credentials, or upstream error bodies. Agents SDK tracing is disabled and text Responses storage is disabled. Provider processing and retention are governed by the account's OpenAI data settings; these application controls are not a zero-retention guarantee. Browser experiment storage remains local. AI guidance may be mistaken; numerical claims should be checked against the deterministic results and model assumptions.

## Verification and live smoke check

`bun run test apps/server/app.test.ts` checks missing configuration, access code, origins, request bounds, rate limiting, timeout recovery, invalid scenarios, prompt roles, read-only engine comparisons, voice request format, and sanitized failures with mocked providers.

After setting a real key, perform this live check: ask why adding 10 dB of power changes received power, ask the tutor to apply that change and verify the actual power control and results update, undo it, start voice, interrupt a spoken answer, change the experiment, ask about the updated result, ask it to swap the receiver antenna to a yagi and verify the visible component changes, mute, and end voice. Confirm the microphone indicator stops. Live model quality, voice negotiation, billing and account permissions cannot be verified without your key.

## Official references

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [Running agents](https://openai.github.io/openai-agents-js/guides/running-agents/)
- [Tracing controls](https://openai.github.io/openai-agents-js/guides/tracing/)
- [Realtime API calls](https://platform.openai.com/docs/api-reference/realtime)
- [Realtime WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc)

Model and VAD choices follow the [official GPT-5.4 Mini documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [Realtime 2.1 Mini documentation](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), and [voice activity detection guide](https://developers.openai.com/api/docs/guides/realtime-vad).
