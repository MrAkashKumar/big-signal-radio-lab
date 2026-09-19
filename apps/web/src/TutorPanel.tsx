import { useEffect, useRef, useState } from "react";
import { TutorMarkdown } from "./TutorMarkdown";
import { runVoiceTools, stageTutorActions } from "./tutorActions";
import {
  buildTutorInstructions,
  type TutorContext,
  type TutorMessage,
} from "../../../packages/tutor/context";
import {
  boundedTutorHistory,
  parseVoiceEvent,
  releaseVoice,
  type VoicePhase,
} from "./tutorVoice";
import "./tutor.css";

type Entry = TutorMessage & {
  id: string;
  voice?: boolean;
  contextLabel?: string;
};
type Service = {
  configured: boolean;
  accessCodeRequired: boolean;
  textModel: string;
  voiceModel: string;
};
export function TutorPanel({
  context,
  onApplyContext,
  onWalkthrough,
  narrationRequest,
  onVoiceReady,
}: {
  context: TutorContext;
  onApplyContext: (next: TutorContext, expected: TutorContext) => void;
  onWalkthrough?: (action: "show" | "stop", step: number) => void;
  narrationRequest?: { id: number; prompt: string };
  onVoiceReady?: (ready: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [availability, setAvailability] = useState("");
  const [code, setCode] = useState("");
  const [messages, setMessages] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState<VoicePhase>("idle");
  const [muted, setMuted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [undo, setUndo] = useState<{
    before: TutorContext;
    after: TutorContext;
  } | null>(null);
  const [changeNotice, setChangeNotice] = useState("");
  const pendingNarration = useRef<{ prompt: string; contextKey: string } | null>(null);
  const [navigationReply, setNavigationReply] = useState(false);
  const guideCallback = useRef(onWalkthrough);
  guideCallback.current = onWalkthrough;
  useEffect(() => {
    if (!narrationRequest) { pendingNarration.current = null; return; }
    pendingNarration.current = { prompt: narrationRequest.prompt, contextKey: JSON.stringify(context) };
    setOpen(true);
    setDraft(narrationRequest.prompt);
  }, [narrationRequest]);
  useEffect(() => { onVoiceReady?.(voice !== "idle" && voice !== "connecting"); }, [voice, onVoiceReady]);
  useEffect(() => () => onVoiceReady?.(false), [onVoiceReady]);
  const peer = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const voiceRequest = useRef<AbortController | null>(null);
  const previousContext = useRef("");
  const voiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentContext = useRef(context);
  const voiceContext = useRef(context);
  const applyContext = useRef(onApplyContext);
  applyContext.current = onApplyContext;
  const end = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  currentContext.current = context;
  const contextKey = JSON.stringify(context);
  useEffect(() => {
    if (pendingNarration.current?.contextKey !== contextKey) pendingNarration.current = null;
  }, [contextKey]);
  useEffect(() => {
    if (!navigationReply || channel.current?.readyState !== "open") return;
    // React has now committed the destination page and its context.
    voiceContext.current = structuredClone(currentContext.current);
    channel.current.send(JSON.stringify({ type: "session.update", session: { type: "realtime", instructions: buildTutorInstructions(voiceContext.current, true) } }));
    channel.current.send(JSON.stringify({ type: "response.create", response: { tool_choice: "none" } }));
    setNavigationReply(false);
    setVoice("thinking");
  }, [navigationReply, contextKey]);
  useEffect(() => {
    if (voice !== "listening" || !pendingNarration.current || channel.current?.readyState !== "open") return;
    if (pendingNarration.current.contextKey !== contextKey) { pendingNarration.current = null; return; }
    const prompt = pendingNarration.current.prompt;
    pendingNarration.current = null;
    channel.current.send(JSON.stringify({ type: "session.update", session: { type: "realtime", instructions: buildTutorInstructions(currentContext.current, true) } }));
    voiceContext.current = structuredClone(currentContext.current);
    channel.current.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: prompt }] } }));
    channel.current.send(JSON.stringify({ type: "response.create" }));
    setMessages(m => [...m, { id: crypto.randomUUID(), role: "user", content: prompt }].slice(-40) as Entry[]);
    setDraft("");
    setVoice("thinking");
  }, [voice, narrationRequest]);
  function commitChanges(next: TutorContext, expected: TutorContext) {
    applyContext.current(next, expected);
    currentContext.current = next;
    setUndo({
      before: structuredClone(expected),
      after: structuredClone(next),
    });
    setChangeNotice("Signal updated the workspace and ran a demonstration.");
  }
  function undoChanges() {
    if (!undo) return;
    try {
      applyContext.current(undo.before, undo.after);
      currentContext.current = undo.before;
      setUndo(null);
      setChangeNotice("Restored the setup before Signal’s last change.");
    } catch {
      setUndo(null);
      setChangeNotice(
        "The setup has changed since then, so undo could not restore it.",
      );
    }
  }
  const headers = () => ({
    "Content-Type": "application/json",
    ...(code ? { Authorization: `Bearer ${code}` } : {}),
  });
  async function status() {
    setAvailability("Checking tutor connection…");
    try {
      const response = await fetch("/api/tutor/status", {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (typeof data.configured !== "boolean") throw new Error();
      setService(data);
      setAvailability(
        data.configured
          ? "Ready to help with this experiment"
          : "Your teacher needs to connect the tutor. The laboratory still works.",
      );
    } catch {
      setService(null);
      setAvailability(
        "Tutor server unavailable. You can keep experimenting and use WHY for explanations.",
      );
    }
  }
  useEffect(() => {
    if (open) void status();
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  function stopVoice() {
    pendingNarration.current = null;
    setNavigationReply(false);
    generation.current++;
    voiceRequest.current?.abort();
    voiceRequest.current = null;
    if (voiceTimer.current) clearTimeout(voiceTimer.current);
    if (connectTimer.current) clearTimeout(connectTimer.current);
    channel.current?.close();
    channel.current = null;
    releaseVoice(peer.current, stream.current, audio.current);
    peer.current = null;
    stream.current = null;
    audio.current = null;
    setVoice("idle");
    setMuted(false);
  }
  useEffect(
    () => () => {
      request.current?.abort();
      stopVoice();
    },
    [],
  );
  useEffect(() => {
    if (voice === "idle" || voice === "connecting") return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const snapshot = structuredClone(currentContext.current);
        const response = await fetch("/api/tutor/context", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ context: snapshot }),
          signal: abort.signal,
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (typeof data.instructions !== "string") throw new Error();
        if (
          channel.current?.readyState === "open" &&
          !abort.signal.aborted &&
          JSON.stringify(snapshot) === JSON.stringify(currentContext.current)
        ) {
          channel.current.send(
            JSON.stringify({
              type: "session.update",
              session: { type: "realtime", instructions: data.instructions },
            }),
          );
          voiceContext.current = snapshot;
        }
      } catch {
        if (!abort.signal.aborted) {
          setError(
            "The experiment changed but voice context could not refresh. Reconnect voice before discussing the new setup.",
          );
          stopVoice();
        }
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [contextKey, voice === "idle" || voice === "connecting", code]);
  useEffect(() => {
    if (
      previousContext.current &&
      previousContext.current !== contextKey &&
      request.current
    ) {
      request.current.abort("context-changed");
    }
    previousContext.current = contextKey;
  }, [contextKey]);
  const ready =
    service?.configured &&
    (!service.accessCodeRequired || !!code.trim()) &&
    consent;
  async function send(text = draft) {
    const content = text.trim();
    if (!content || busy || voice !== "idle" || !ready) return;
    const entry: Entry = { id: crypto.randomUUID(), role: "user", content };
    const snapshotLabel = context.network
      ? "Disaster network"
      : (context.scenario?.title ?? "Radio course");
    const conversation = [...messages, entry].slice(-40);
    setMessages(conversation);
    setDraft("");
    setBusy(true);
    setError("");
    const abort = new AbortController();
    request.current = abort;
    const snapshot = structuredClone(currentContext.current);
    const timer = setTimeout(() => abort.abort("timeout"), 60000);
    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          context: snapshot,
          messages: boundedTutorHistory(conversation),
        }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Tutor could not answer. Please try again.",
        );
      if (typeof data.text !== "string" || !data.text.trim())
        throw new Error("The tutor returned no answer. Please try again.");
      if (
        abort.signal.aborted ||
        JSON.stringify(snapshot) !== JSON.stringify(currentContext.current)
      )
        throw new Error(
          "The workspace changed. Send again to use the new setup.",
        );
      if (data.actions !== undefined) {
        const next = stageTutorActions(snapshot, data.actions);
        if (data.actions.length) commitChanges(next, snapshot);
      }
      setMessages((m) =>
        [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: data.text,
            contextLabel: snapshotLabel,
          },
        ].slice(-40),
      );
    } catch (e) {
      setError(
        abort.signal.aborted
          ? abort.signal.reason === "context-changed"
            ? "Experiment changed. The previous request was stopped; send again to discuss this setup."
            : "Response stopped. Your question is kept below so you can try again."
          : e instanceof Error
            ? e.message
            : "Connection failed. Try again.",
      );
      setDraft(content);
    } finally {
      clearTimeout(timer);
      request.current = null;
      setBusy(false);
    }
  }
  async function startVoice() {
    if (!ready || busy || voice !== "idle") return;
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError(
        "Voice needs a browser with microphone support on HTTPS or localhost. Text is still available.",
      );
      return;
    }
    setError("");
    setVoice("connecting");
    const version = ++generation.current;
    connectTimer.current = setTimeout(() => {
      if (generation.current === version) {
        stopVoice();
        setError(
          "Voice connection timed out. Check your microphone and connection, then retry.",
        );
      }
    }, 25000);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      if (version !== generation.current) {
        mic.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = mic;
      const pc = new RTCPeerConnection();
      peer.current = pc;
      const speaker = document.createElement("audio");
      speaker.autoplay = true;
      audio.current = speaker;
      pc.ontrack = (e) => {
        speaker.srcObject = e.streams[0] ?? new MediaStream([e.track]);
        void speaker
          .play()
          .catch(() =>
            setError(
              "Audio playback was blocked. Use the Play voice audio button.",
            ),
          );
      };
      mic.getTracks().forEach((track) => pc.addTrack(track, mic));
      const dc = pc.createDataChannel("oai-events");
      const seenCalls = new Set<string>();
      const responseSnapshots = new Map<string, TutorContext>();
      let toolRounds = 0;
      channel.current = dc;
      dc.onopen = () => {
        if (version !== generation.current) return;
        if (connectTimer.current) clearTimeout(connectTimer.current);
        setVoice("listening");
        messages.slice(-12).forEach((m) =>
          dc.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: m.role,
                content: [
                  {
                    type: m.role === "user" ? "input_text" : "text",
                    text: m.content,
                  },
                ],
              },
            }),
          ),
        );
        if (!pendingNarration.current) dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Briefly greet the learner and ask what they want to explore in the current radio experiment. Do not give away quiz answers.",
            },
          }),
        );
        voiceTimer.current = setTimeout(() => {
          stopVoice();
          setError(
            "Your 10-minute voice session ended. Start another whenever you are ready.",
          );
        }, 600000);
      };
      dc.onmessage = (e) => {
        if (version !== generation.current) return;
        try {
          const raw = JSON.parse(e.data);
          if (raw.type === "input_audio_buffer.speech_started") toolRounds = 0;
          if (
            raw.type === "response.created" &&
            typeof raw.response?.id === "string"
          )
            responseSnapshots.set(
              raw.response.id,
              structuredClone(voiceContext.current),
            );
          if (raw.type === "response.done") {
            const snapshot = responseSnapshots.get(raw.response?.id);
            if (snapshot) {
              const outputs = runVoiceTools(
                raw,
                snapshot,
                currentContext.current,
                seenCalls,
                commitChanges,
                (action, step) => {
                  pendingNarration.current = null;
                  if (!guideCallback.current) throw new Error("Walkthrough navigation is unavailable.");
                  guideCallback.current(action, step);
                },
              );
              outputs.forEach((output) => dc.send(JSON.stringify(output)));
              const navigated = outputs.some(output => output.item.output.includes('"navigationRequested":true'));
              if (navigated) {
                setNavigationReply(true);
              } else if (outputs.length) {
                voiceContext.current = structuredClone(currentContext.current);
                dc.send(
                  JSON.stringify({
                    type: "session.update",
                    session: {
                      type: "realtime",
                      instructions: buildTutorInstructions(
                        voiceContext.current,
                        true,
                      ),
                    },
                  }),
                );
                dc.send(
                  JSON.stringify({
                    type: "response.create",
                    response: {
                      tool_choice: ++toolRounds >= 8 ? "none" : "auto",
                    },
                  }),
                );
              } else toolRounds = 0;
            }
            responseSnapshots.delete(raw.response?.id);
          }
          const event = parseVoiceEvent(raw);
          if (event?.type === "phase") setVoice(event.phase);
          if (event?.type === "error") {
            setError(event.message);
            stopVoice();
          }
          if (event?.type === "transcript")
            setMessages((m) =>
              m.some((x) => x.id === event.id)
                ? m
                : [
                    ...m,
                    {
                      id: event.id,
                      role: event.role,
                      content: event.text,
                      voice: true,
                    },
                  ].slice(-40),
            );
        } catch {
          setError("A voice message could not be read. Please reconnect.");
          stopVoice();
        }
      };
      pc.onconnectionstatechange = () => {
        if (
          version === generation.current &&
          ["failed", "disconnected", "closed"].includes(pc.connectionState)
        ) {
          stopVoice();
          setError("Voice disconnected. Your conversation is still here.");
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const connectAbort = new AbortController();
      voiceRequest.current = connectAbort;
      voiceContext.current = structuredClone(currentContext.current);
      const response = await fetch("/api/tutor/realtime", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          sdp: offer.sdp,
          context: voiceContext.current,
        }),
        signal: connectAbort.signal,
      });
      if (version !== generation.current) return;
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Voice could not connect.");
      if (typeof data.sdp !== "string")
        throw new Error("Voice returned an invalid connection. Please retry.");
      await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
    } catch (e) {
      if (version !== generation.current) return;
      stopVoice();
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access to use voice, or continue with text."
          : e instanceof Error
            ? e.message
            : "Voice could not connect.",
      );
    }
  }
  const close = () => {
    request.current?.abort();
    stopVoice();
    setOpen(false);
    launcher.current?.focus();
  };
  return (
    <>
      <button
        ref={launcher}
        className="tutor-launcher"
        aria-expanded={open}
        aria-controls="signal-tutor"
        onClick={() => (open ? close() : setOpen(true))}
      >
        ◉ {open ? "Close tutor" : "Ask Signal"}
        <small>Your radio tutor</small>
      </button>
      {open && (
        <aside
          id="signal-tutor"
          className="tutor-panel"
          aria-label="Signal AI radio tutor"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <header>
            <div>
              <span className="eyebrow">YOUR LAB PARTNER · AI</span>
              <h2>Signal</h2>
            </div>
            <button onClick={close} aria-label="Close radio tutor">
              ×
            </button>
          </header>
          <div className="tutor-context">
            <span className="tutor-dot" />{" "}
            {context.network
              ? "Your disaster network"
              : (context.scenario?.title ?? "Your radio course")}
            <small>Can adjust your setup and explain the RF results</small>
            {changeNotice && <small role="status">{changeNotice}</small>}
            {undo && (
              <button type="button" onClick={undoChanges} disabled={busy}>
                Undo tutor change
              </button>
            )}
          </div>
          <div
            className="tutor-conversation"
            role="log"
            aria-label="Tutor conversation"
            aria-live="polite"
          >
            {!messages.length && (
              <div className="tutor-welcome">
                <h3>Let’s figure it out together.</h3>
                <p>
                  Ask why a link failed, explore a trade-off, or talk through
                  your next experiment. I’ll help you reason from the model.
                </p>
                <div className="tutor-prompts">
                  {[
                    "Explain my current setup",
                    "What should I try next?",
                    "Why does radio matter in a disaster?",
                  ].map((p) => (
                    <button
                      key={p}
                      disabled={!ready || busy || voice !== "idle"}
                      onClick={() => void send(p)}
                    >
                      {p} ↗
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <article className={`tutor-message ${m.role}`} key={m.id}>
                <strong>
                  {m.role === "user" ? "You" : "Signal"}
                  {m.voice ? " · voice" : ""}
                  {m.contextLabel ? ` · ${m.contextLabel}` : ""}
                </strong>
                {m.role === "assistant" ? (
                  <TutorMarkdown>{m.content}</TutorMarkdown>
                ) : (
                  <p>{m.content}</p>
                )}
              </article>
            ))}
            {busy && (
              <p className="tutor-thinking" role="status">
                Checking the physics and lesson…
              </p>
            )}
            <div ref={end} />
          </div>
          <div className="tutor-compose">
            <p className="tutor-availability" role="status">
              {availability}{" "}
              {!service?.configured && (
                <button onClick={() => void status()}>Retry connection</button>
              )}
            </p>
            {service?.accessCodeRequired && (
              <label>
                Classroom access code
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  maxLength={200}
                />
              </label>
            )}
            {!consent && (
              <label className="tutor-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Share my questions and current experiment with OpenAI. Voice
                also shares microphone audio. This is an AI tutor.
              </label>
            )}
            {error && (
              <p className="tutor-error" role="alert">
                {error}
              </p>
            )}
            {voice !== "idle" ? (
              <div className="tutor-call">
                <span role="status">
                  {muted
                    ? "Microphone muted"
                    : voice === "connecting"
                      ? "Connecting…"
                      : voice === "speaking"
                        ? "Signal is speaking"
                        : voice === "thinking"
                          ? "Signal is thinking"
                          : "Listening · speak naturally"}
                </span>
                <button
                  disabled={voice === "connecting"}
                  onClick={() => {
                    stream.current
                      ?.getAudioTracks()
                      .forEach((t) => (t.enabled = muted));
                    setMuted(!muted);
                  }}
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button onClick={stopVoice}>End voice</button>
                <button
                  onClick={() =>
                    void audio.current
                      ?.play()
                      .then(() => setError(""))
                      .catch(() =>
                        setError("Audio is still blocked by the browser."),
                      )
                  }
                >
                  Play voice audio
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label className="sr-only" htmlFor="tutor-question">
                  Ask your radio tutor
                </label>
                <textarea
                  id="tutor-question"
                  value={draft}
                  maxLength={4000}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="What are you curious about?"
                  rows={2}
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="tutor-actions">
                  <button
                    type="button"
                    disabled={!ready || busy}
                    onClick={() => void startVoice()}
                  >
                    ◉ Talk to Signal
                  </button>
                  {busy ? (
                    <button
                      type="button"
                      onClick={() => request.current?.abort()}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={!ready || !draft.trim()}
                      type="submit"
                    >
                      Send ↗
                    </button>
                  )}
                </div>
              </form>
            )}
            <div className="tutor-footnote">
              <span>AI can make mistakes. Check WHY / MATH.</span>
              <button
                disabled={busy || voice !== "idle"}
                onClick={() => {
                  setMessages([]);
                  setError("");
                  setDraft("");
                }}
              >
                Clear chat
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
