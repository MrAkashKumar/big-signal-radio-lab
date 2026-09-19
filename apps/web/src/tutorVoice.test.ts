import { describe, expect, it, vi } from "vitest";
import {
  boundedTutorHistory,
  parseVoiceEvent,
  releaseVoice,
} from "./tutorVoice";
describe("voice event boundary", () => {
  it("keeps transcribed user and assistant turns distinct", () => {
    expect(
      parseVoiceEvent({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "u1",
        transcript: "Why the hill?",
      }),
    ).toEqual({
      type: "transcript",
      id: "u1",
      role: "user",
      text: "Why the hill?",
    });
    expect(
      parseVoiceEvent({
        type: "response.output_audio_transcript.done",
        item_id: "a1",
        transcript: "The path is obstructed.",
      }),
    ).toMatchObject({ role: "assistant", text: "The path is obstructed." });
  });
  it.each([
    null,
    {},
    { type: "unknown" },
    { type: "response.output_audio_transcript.done", transcript: 2 },
    {
      type: "response.output_audio_transcript.done",
      transcript: "",
      item_id: "x",
    },
  ])("ignores malformed or irrelevant events", (value) =>
    expect(parseVoiceEvent(value)).toBeNull(),
  );
  it("treats failed responses as failure rather than successful listening", () => {
    expect(
      parseVoiceEvent({ type: "response.done", response: { status: "failed" } })
        ?.type,
    ).toBe("error");
    expect(
      parseVoiceEvent({
        type: "response.done",
        response: { status: "completed" },
      }),
    ).toEqual({ type: "phase", phase: "listening" });
  });
  it("does not expose provider error payloads", () => {
    expect(
      JSON.stringify(
        parseVoiceEvent({
          type: "error",
          error: { message: "secret upstream payload" },
        }),
      ),
    ).not.toContain("secret");
  });
  it("releases every microphone track, peer and speaker", () => {
    const stop = vi.fn(),
      close = vi.fn(),
      pause = vi.fn(),
      remove = vi.fn();
    const stream = {
      getTracks: () => [{ stop }, { stop }],
    } as unknown as MediaStream;
    const pc = {
      close,
      ontrack: () => {},
      onconnectionstatechange: () => {},
    } as unknown as RTCPeerConnection;
    const audio = {
      pause,
      remove,
      srcObject: stream,
    } as unknown as HTMLAudioElement;
    releaseVoice(pc, stream, audio);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
    expect(audio.srcObject).toBeNull();
    expect(pc.ontrack).toBeNull();
    expect(pause).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });
});

it("keeps voice-to-text history within server limits and preserves newest question", () => {
  const messages = Array.from({ length: 30 }, (_, i) => ({
    role: "assistant" as const,
    content: String(i).padEnd(12000, "x"),
  }));
  const bounded = boundedTutorHistory([
    ...messages,
    { role: "user", content: "Explain this change" },
  ]);
  expect(bounded.at(-1)).toEqual({
    role: "user",
    content: "Explain this change",
  });
  expect(bounded.length).toBeLessThanOrEqual(20);
  expect(
    bounded.reduce((sum, m) => sum + m.content.length, 0),
  ).toBeLessThanOrEqual(24000);
  expect(bounded.every((m) => m.content.length <= 6000)).toBe(true);
});
