export type VoicePhase =
  "idle" | "connecting" | "listening" | "thinking" | "speaking";
export type VoiceEvent =
  | { type: "phase"; phase: VoicePhase }
  | { type: "transcript"; id: string; role: "user" | "assistant"; text: string }
  | { type: "error"; message: string };
export function parseVoiceEvent(value: unknown): VoiceEvent | null {
  if (!value || typeof value !== "object") return null;
  const e = value as Record<string, unknown>;
  if (e.type === "input_audio_buffer.speech_started")
    return { type: "phase", phase: "listening" };
  if (e.type === "input_audio_buffer.speech_stopped")
    return { type: "phase", phase: "thinking" };
  if (e.type === "response.output_audio_transcript.delta")
    return { type: "phase", phase: "speaking" };
  if (e.type === "response.done") {
    const response = e.response as Record<string, unknown> | undefined;
    if (response?.status === "failed")
      return {
        type: "error",
        message:
          "Voice could not complete that response. End the call and try again.",
      };
    return { type: "phase", phase: "listening" };
  }
  if (
    e.type === "conversation.item.input_audio_transcription.completed" ||
    e.type === "response.output_audio_transcript.done"
  ) {
    if (
      typeof e.transcript !== "string" ||
      !e.transcript.trim() ||
      typeof e.item_id !== "string"
    )
      return null;
    return {
      type: "transcript",
      id: e.item_id,
      role:
        e.type === "conversation.item.input_audio_transcription.completed"
          ? "user"
          : "assistant",
      text: e.transcript.slice(0, 12000),
    };
  }
  if (e.type === "error")
    return {
      type: "error",
      message:
        "The voice service reported a connection error. End the call and try again.",
    };
  return null;
}
export function releaseVoice(
  pc: RTCPeerConnection | null,
  stream: MediaStream | null,
  audio: HTMLAudioElement | null,
) {
  stream?.getTracks().forEach((track) => track.stop());
  if (pc) {
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
  }
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();
  }
}

export function boundedTutorHistory(
  messages: { role: "user" | "assistant"; content: string }[],
) {
  let remaining = 24000;
  const kept: { role: "user" | "assistant"; content: string }[] = [];
  for (const message of messages.slice(-20).reverse()) {
    const content = message.content.slice(0, 6000);
    if (content.length > remaining) break;
    kept.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return kept;
}
