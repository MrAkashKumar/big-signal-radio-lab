import {
  Agent,
  Runner,
  OpenAIProvider,
  tool,
  user,
  assistant,
  setTracingDisabled,
} from "@openai/agents";
import { z } from "zod";
import { DEFAULT_VOICE_TUNING, type VoiceTuning } from "./tuning";
import {
  buildTutorInstructions,
  describeTutorContext,
  lookupLesson,
  simulateWhatIf,
  type TutorContext,
  type TutorMessage,
} from "../../packages/tutor/context";
import {
  applyTutorAction,
  tutorActionSchema,
  tutorActionJsonSchema,
  tutorActionDescription,
  type TutorAction,
} from "../../packages/tutor/actions";
setTracingDisabled(true);
export interface TutorChatResult {
  text: string;
  actions: TutorAction[];
}
export interface TutorProvider {
  chat(
    messages: TutorMessage[],
    context: TutorContext,
    signal: AbortSignal,
  ): Promise<string | TutorChatResult>;
  realtime(
    sdp: string,
    context: TutorContext,
    signal: AbortSignal,
  ): Promise<string>;
}
export function createProvider(
  apiKey: string,
  textModel: string,
  voiceModel: string,
  request: typeof fetch = fetch,
  voiceTuning: VoiceTuning = DEFAULT_VOICE_TUNING,
): TutorProvider {
  const runner = new Runner({
    modelProvider: new OpenAIProvider({ apiKey, useResponses: true }),
    tracingDisabled: true,
    traceIncludeSensitiveData: false,
  });
  return {
    async chat(messages, context, signal) {
      let workingContext = structuredClone(context);
      const actions: TutorAction[] = [];
      const agent = new Agent({
        name: "Signal radio tutor",
        model: textModel,
        instructions: buildTutorInstructions(context),
        modelSettings: {
          maxTokens: 1200,
          ...(/^gpt-5\.4-mini(?:-|$)/.test(textModel)
            ? {
                maxTokens: 4096,
                reasoning: { effort: "low" as const },
                text: { verbosity: "low" as const },
              }
            : {}),
          store: false,
          parallelToolCalls: false,
        },
        tools: [
          tool({
            name: "inspect_experiment",
            description:
              "Read the current authoritative simulation result and model assumptions.",
            parameters: z.object({}),
            execute: async () =>
              JSON.stringify(describeTutorContext(workingContext)),
          }),
          tool({
            name: "update_experiment",
            description:
              tutorActionDescription +
              " Changes are staged together until this reply finishes successfully. Each result includes the updated authoritative experiment, so inspect again only when needed.",
            parameters: tutorActionSchema,
            strict: true,
            execute: async (input) => {
              try {
                if (signal.aborted)
                  throw new Error("The request was cancelled.");
                if (actions.length >= 20)
                  throw new Error("Limit this explanation to 20 edits.");
                const action = tutorActionSchema.parse(input);
                const next = applyTutorAction(workingContext, action);
                const experiment = describeTutorContext(next);
                workingContext = next;
                actions.push(action);
                return JSON.stringify({
                  pendingWorkspaceUpdate: true,
                  action,
                  experiment,
                });
              } catch (error) {
                return JSON.stringify({
                  error:
                    error instanceof Error
                      ? error.message
                      : "Invalid experiment change.",
                });
              }
            },
          }),
          tool({
            name: "lookup_lesson",
            description:
              "Look up BIG SIGNAL teaching content by lesson ID, without quiz answer keys.",
            parameters: z.object({ id: z.string().max(100) }),
            execute: async ({ id }) => JSON.stringify(lookupLesson(id)),
          }),
          tool({
            name: "simulate_what_if",
            description:
              "Run a hypothetical read-only engine comparison. Null leaves an input unchanged. Never changes the workspace.",
            parameters: z.object({
              powerDbm: z.number().min(-100).max(100).nullable(),
              frequencyHz: z.number().min(100000).max(100000000000).nullable(),
              txHeightM: z.number().min(0).max(20000).nullable(),
              rxHeightM: z.number().min(0).max(20000).nullable(),
            }),
            execute: async (changes) =>
              JSON.stringify(simulateWhatIf(workingContext, changes)),
          }),
        ],
      });
      const result = await runner.run(
        agent,
        messages.map((message) =>
          message.role === "user"
            ? user(message.content)
            : assistant(message.content),
        ),
        { maxTurns: 8, signal },
      );
      if (typeof result.finalOutput !== "string" || !result.finalOutput.trim())
        throw new Error("Empty provider response");
      if (signal.aborted) throw new Error("The request was cancelled.");
      return { text: result.finalOutput, actions };
    },
    async realtime(sdp, context, signal) {
      const form = new FormData();
      form.set("sdp", sdp);
      form.set(
        "session",
        JSON.stringify({
          type: "realtime",
          model: voiceModel,
          instructions: buildTutorInstructions(context, true),
          max_output_tokens: 1000,
          tools: [
            {
              type: "function",
              name: "guide_walkthrough",
              description: "Open one visual project walkthrough stop (0 overview, 1 lab, 2 disaster, 3 extreme engineering, 4 physics), or close the tour. No experiment values are changed. Call only in response to a walkthrough/navigation request. After navigating, narrate that stop before another tool call.",
              parameters: { type: "object", properties: { action: { type: "string", enum: ["show", "stop"] }, step: { type: "integer", minimum: 0, maximum: 4 } }, required: ["action", "step"], additionalProperties: false },
            },
            {
              type: "function",
              name: "inspect_experiment",
              description:
                "Read the current visible experiment, component IDs, and authoritative simulation result.",
              parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false,
              },
            },
            {
              type: "function",
              name: "update_experiment",
              description: tutorActionDescription,
              parameters: tutorActionJsonSchema,
            },
          ],
          tool_choice: "auto",
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe" },
              noise_reduction: { type: voiceTuning.noiseReduction },
              turn_detection: {
                type: "server_vad",
                threshold: voiceTuning.threshold,
                prefix_padding_ms: 300,
                silence_duration_ms: voiceTuning.silenceMs,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: "marin" },
          },
        }),
      );
      const response = await request(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal,
        },
      );
      if (!response.ok) throw new Error("Voice provider rejected request");
      const answer = await response.text();
      if (!answer.startsWith("v=0") || answer.length > 100000)
        throw new Error("Invalid voice response");
      return answer;
    },
  };
}
