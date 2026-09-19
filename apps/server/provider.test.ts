import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLessonScenario, lessons } from "../../content/lessons";
import {
  describeTutorContext,
  type TutorContext,
} from "../../packages/tutor/context";

const sdk = vi.hoisted(() => ({
  run: vi.fn(),
  runnerConfig: vi.fn(),
  providerConfig: vi.fn(),
}));
vi.mock("@openai/agents", () => ({
  Agent: class {
    constructor(options: object) {
      Object.assign(this, options);
    }
  },
  Runner: class {
    constructor(config: unknown) {
      sdk.runnerConfig(config);
    }
    run = sdk.run;
  },
  OpenAIProvider: class {
    constructor(config: unknown) {
      sdk.providerConfig(config);
    }
  },
  tool: (options: unknown) => options,
  user: (content: string) => ({ role: "user", content }),
  assistant: (content: string) => ({ role: "assistant", content }),
  setTracingDisabled: vi.fn(),
}));
import { createProvider } from "./provider";

type AgentTools = {
  tools: Array<{ name: string; execute: (input: unknown) => Promise<string> }>;
};
function execute(agent: AgentTools, name: string, input: unknown = {}) {
  return agent.tools
    .find((tool) => tool.name === name)!
    .execute(input)
    .then(JSON.parse);
}
const context: TutorContext = {
  mode: "lab",
  scenario: getLessonScenario(lessons[0]!.id),
};
const action = {
  target: "transmitter",
  targetId: null,
  field: "powerDbm",
  value: 25,
};
const messages = [
  { role: "user" as const, content: "Show me what more power changes." },
];

describe("tutor workspace tools", () => {
  beforeEach(() => {
    sdk.run.mockReset();
    sdk.runnerConfig.mockClear();
    sdk.providerConfig.mockClear();
  });

  it("reuses a Responses API runner while keeping tools and edits isolated per request", async () => {
    const agents: AgentTools[] = [];
    sdk.run.mockImplementation(async (agent: AgentTools) => {
      agents.push(agent);
      if (agents.length === 1)
        await execute(agent, "update_experiment", action);
      else
        expect(await execute(agent, "inspect_experiment")).toEqual(
          describeTutorContext(context),
        );
      return { finalOutput: "Explained." };
    });
    const provider = createProvider("test", "text", "voice");
    const first = await provider.chat(
      messages,
      context,
      new AbortController().signal,
    );
    const second = await provider.chat(
      messages,
      context,
      new AbortController().signal,
    );
    expect(first).toMatchObject({ actions: [action] });
    expect(second).toMatchObject({ actions: [] });
    expect(sdk.runnerConfig).toHaveBeenCalledOnce();
    expect(sdk.providerConfig).toHaveBeenCalledExactlyOnceWith({
      apiKey: "test",
      useResponses: true,
    });
    expect(sdk.runnerConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        tracingDisabled: true,
        traceIncludeSensitiveData: false,
      }),
    );
    expect(agents[0]).not.toBe(agents[1]);
    expect(
      agents[0]!.tools.find((tool) => tool.name === "update_experiment"),
    ).toMatchObject({
      strict: true,
      description: expect.stringContaining("antennaType selects"),
    });
    expect(agents[0]).toHaveProperty("modelSettings.parallelToolCalls", false);
    expect(sdk.run.mock.calls[0]![2]).toMatchObject({ maxTurns: 8 });
  });

  it("stages sequential edits and lets later inspection see authoritative changed inputs", async () => {
    const original = structuredClone(context);
    sdk.run.mockImplementation(async (agent: AgentTools) => {
      const output = await execute(agent, "update_experiment", action);
      expect(output.pendingWorkspaceUpdate).toBe(true);
      const expected = structuredClone(context);
      expected.scenario!.transmitter.powerDbm = 25;
      expect(await execute(agent, "inspect_experiment")).toEqual(
        describeTutorContext(expected),
      );
      const comparison = await execute(agent, "simulate_what_if", {
        powerDbm: 30,
        frequencyHz: null,
        txHeightM: null,
        rxHeightM: null,
      });
      expect(
        comparison.after.receivedPowerDbm - comparison.before.receivedPowerDbm,
      ).toBeCloseTo(5);
      return { finalOutput: "I raised transmit power to 25 dBm." };
    });
    const result = await createProvider("test", "test", "test").chat(
      messages,
      context,
      new AbortController().signal,
    );
    expect(result).toEqual({
      text: "I raised transmit power to 25 dBm.",
      actions: [action],
    });
    expect(context).toEqual(original);
  });

  it("returns invalid edits as tool errors without changing the pending context", async () => {
    sdk.run.mockImplementation(async (agent: AgentTools) => {
      expect(
        await execute(agent, "update_experiment", {
          ...action,
          field: "unknownField",
        }),
      ).toHaveProperty("error");
      expect(await execute(agent, "inspect_experiment")).toEqual(
        describeTutorContext(context),
      );
      return { finalOutput: "That setting cannot be changed." };
    });
    expect(
      await createProvider("test", "test", "test").chat(
        messages,
        context,
        new AbortController().signal,
      ),
    ).toEqual({ text: "That setting cannot be changed.", actions: [] });
  });

  it("does not return staged actions when a provider fails or cancellation arrives", async () => {
    const controller = new AbortController();
    sdk.run.mockImplementation(async (agent: AgentTools) => {
      await execute(agent, "update_experiment", action);
      controller.abort();
      return { finalOutput: "Changed." };
    });
    await expect(
      createProvider("test", "test", "test").chat(
        messages,
        context,
        controller.signal,
      ),
    ).rejects.toThrow("cancelled");
    expect(context.scenario!.transmitter.powerDbm).not.toBe(25);
  });
});

describe("tutor model and voice tuning", () => {
  it.each(["gpt-5.4-mini", "gpt-5.4-mini-2026-03-17"])(
    "uses concise reasoning settings and sufficient reasoning budget for %s",
    async (model) => {
      sdk.run.mockResolvedValue({ finalOutput: "Explained." });
      await createProvider("test", model, "voice").chat(
        messages,
        context,
        new AbortController().signal,
      );
      expect(sdk.run.mock.lastCall![0]).toMatchObject({
        model,
        modelSettings: {
          maxTokens: 4096,
          reasoning: { effort: "low" },
          text: { verbosity: "low" },
          store: false,
          parallelToolCalls: false,
        },
      });
    },
  );

  it.each(["gpt-4.1-mini", "custom-model", "gpt-5.4-minimal"])(
    "keeps unsupported model settings out of %s requests",
    async (model) => {
      sdk.run.mockResolvedValue({ finalOutput: "Explained." });
      await createProvider("test", model, "voice").chat(
        messages,
        context,
        new AbortController().signal,
      );
      expect(sdk.run.mock.lastCall![0]).toMatchObject({ model });
      expect(sdk.run.mock.lastCall![0].modelSettings).toEqual({
        maxTokens: 1200,
        store: false,
        parallelToolCalls: false,
      });
    },
  );

  it.each([
    {
      label: "default",
      tuning: undefined,
      threshold: 0.7,
      silence: 1000,
      noise: "near_field",
    },
    {
      label: "custom",
      tuning: {
        threshold: 0.85,
        silenceMs: 1500,
        noiseReduction: "far_field" as const,
      },
      threshold: 0.85,
      silence: 1500,
      noise: "far_field",
    },
  ])(
    "sends $label microphone tuning to the Realtime API",
    async ({ tuning, threshold, silence, noise }) => {
      const request = vi.fn<typeof fetch>(
        async () => new Response("v=0\r\nanswer"),
      );
      const signal = new AbortController().signal;
      await createProvider(
        "test",
        "text",
        "gpt-realtime-2.1-mini",
        request,
        tuning,
      ).realtime("v=0\r\no=offer", context, signal);
      expect(request).toHaveBeenCalledWith(
        "https://api.openai.com/v1/realtime/calls",
        expect.objectContaining({ signal }),
      );
      const form = request.mock.calls[0]![1]!.body as FormData;
      const session = JSON.parse(form.get("session") as string);
      expect(session.model).toBe("gpt-realtime-2.1-mini");
      expect(session.audio.input).toEqual({
        transcription: { model: "gpt-4o-mini-transcribe" },
        noise_reduction: { type: noise },
        turn_detection: {
          type: "server_vad",
          threshold,
          prefix_padding_ms: 300,
          silence_duration_ms: silence,
          create_response: true,
          interrupt_response: true,
        },
      });
      expect(session.tools.map((tool: { name: string }) => tool.name)).toEqual([
        "guide_walkthrough",
        "inspect_experiment",
        "update_experiment",
      ]);
    },
  );
});
