import { describe, expect, it, vi } from "vitest";
import { getLessonScenario } from "../../../content/lessons";
import type { TutorContext } from "../../../packages/tutor/context";
import { stageTutorActions, runVoiceTools } from "./tutorActions";

const context = (): TutorContext => ({
  mode: "lab",
  scenario: getLessonScenario("what-is-radio"),
});
const change = (value: number) => ({
  target: "transmitter",
  targetId: null,
  field: "powerDbm",
  value,
});
const call = (
  call_id: string,
  name = "update_experiment",
  args = JSON.stringify(change(40)),
) => ({ type: "function_call", call_id, name, arguments: args });
const response = (output: unknown[], status = "completed") => ({
  type: "response.done",
  response: { status, output },
});

describe("staged tutor actions", () => {
  it("stages all changes without mutating input", () => {
    const original = context();
    const copy = structuredClone(original);
    const next = stageTutorActions(original, [
      change(40),
      {
        target: "receiver",
        targetId: null,
        field: "antennaType",
        value: "yagi",
      },
    ]);
    expect(original).toEqual(copy);
    expect(next.scenario!.transmitter.powerDbm).toBe(40);
    expect(next.scenario!.receiver.antenna.type).toBe("yagi");
  });
  it("rejects an invalid batch atomically", () => {
    const original = context();
    const copy = structuredClone(original);
    expect(() =>
      stageTutorActions(original, [change(40), change(-1000)]),
    ).toThrow();
    expect(original).toEqual(copy);
  });
  it("rejects malformed or oversized batches", () => {
    expect(() => stageTutorActions(context(), {})).toThrow();
    expect(() =>
      stageTutorActions(
        context(),
        Array.from({ length: 21 }, () => change(40)),
      ),
    ).toThrow();
  });
});

describe("completed voice workspace tools", () => {
  it("opens only a validated tour stop once and blocks chained edits after navigation", () => {
    const original = context();
    const guide = vi.fn();
    const commit = vi.fn();
    const seen = new Set<string>();
    const event = response([call("tour", "guide_walkthrough", JSON.stringify({ action: "show", step: 2 })), call("edit")]);
    const outputs = runVoiceTools(event, original, original, seen, commit, guide);
    expect(guide).toHaveBeenCalledWith("show", 2);
    expect(JSON.parse(outputs[0].item.output).navigationRequested).toBe(true);
    expect(JSON.parse(outputs[1].item.output).error).toContain("Navigation");
    expect(commit).not.toHaveBeenCalled();
    expect(runVoiceTools(event, original, original, seen, commit, guide)).toEqual([]);
    expect(guide).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed, out-of-range, and cancelled tour requests", () => {
    const original = context();
    const guide = vi.fn();
    for (const args of [{ action: "show", step: 9 }, { action: "delete", step: 0 }, { action: "show", step: 1, code: "bad" }, null]) {
      const outputs = runVoiceTools(response([call("x", "guide_walkthrough", JSON.stringify(args))]), original, original, new Set(), vi.fn(), guide);
      expect(JSON.parse(outputs[0].item.output).error).toBeTruthy();
    }
    runVoiceTools(response([call("x", "guide_walkthrough", '{"action":"show","step":1}')], "cancelled"), original, original, new Set(), vi.fn(), guide);
    expect(guide).not.toHaveBeenCalled();
  });
  it("does not edit a background scenario while an informational page is visible", () => {
    const original = { ...context(), visiblePage: "physics" };
    const commit = vi.fn();
    const output = runVoiceTools(response([call("edit")]), original, original, new Set(), commit);
    expect(JSON.parse(output[0].item.output).error).toContain("Open a laboratory");
    expect(commit).not.toHaveBeenCalled();
  });
  it("commits a change and subsequent inspection sees updated engine results", () => {
    const original = context();
    const copy = structuredClone(original);
    const commit = vi.fn();
    const outputs = runVoiceTools(
      response([call("edit"), call("inspect", "inspect_experiment", "{}")]),
      original,
      original,
      new Set(),
      commit,
    );
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0][0].scenario.transmitter.powerDbm).toBe(40);
    expect(commit.mock.calls[0][1]).toEqual(original);
    const update = JSON.parse(outputs[0].item.output);
    const inspect = JSON.parse(outputs[1].item.output);
    expect(update.workspaceChanged).toBe(true);
    expect(inspect.scenario.transmitter.powerDbm).toBe(40);
    expect(inspect.engineResult).toEqual(update.after.engineResult);
    expect(original).toEqual(copy);
  });
  it.each(["cancelled", "failed", "incomplete", "in_progress"])(
    "never applies %s response calls",
    (status) => {
      const original = context();
      const commit = vi.fn();
      const seen = new Set<string>();
      expect(
        runVoiceTools(
          response([call("edit")], status),
          original,
          original,
          seen,
          commit,
        ),
      ).toEqual([]);
      expect(commit).not.toHaveBeenCalled();
      expect(seen.size).toBe(0);
    },
  );
  it("ignores partial function argument events", () => {
    const original = context();
    const commit = vi.fn();
    expect(
      runVoiceTools(
        { ...call("edit"), type: "response.function_call_arguments.done" },
        original,
        original,
        new Set(),
        commit,
      ),
    ).toEqual([]);
    expect(commit).not.toHaveBeenCalled();
  });
  it("deduplicates calls both within and across responses", () => {
    const original = context();
    const commit = vi.fn();
    const seen = new Set<string>();
    const event = response([call("edit"), call("edit")]);
    expect(runVoiceTools(event, original, original, seen, commit)).toHaveLength(
      1,
    );
    expect(runVoiceTools(event, original, original, seen, commit)).toEqual([]);
    expect(commit).toHaveBeenCalledTimes(1);
  });
  it("rejects stale snapshot changes without overwriting manual edits", () => {
    const original = context();
    const current = stageTutorActions(original, [change(45)]);
    const commit = vi.fn();
    const outputs = runVoiceTools(
      response([call("edit")]),
      original,
      current,
      new Set(),
      commit,
    );
    expect(JSON.parse(outputs[0].item.output)).toMatchObject({
      workspaceChanged: false,
      error: expect.stringContaining("workspace changed"),
    });
    expect(commit).not.toHaveBeenCalled();
    expect(current.scenario!.transmitter.powerDbm).toBe(45);
  });
  it.each([
    call("unknown", "delete_everything"),
    call("malformed", "update_experiment", "{"),
    call("oversized", "update_experiment", " ".repeat(4001)),
    call("invalid", "update_experiment", JSON.stringify(change(-1000))),
    { ...call("missing"), arguments: undefined },
  ])("returns a failed output for invalid tool call $call_id", (invalid) => {
    const original = context();
    const commit = vi.fn();
    const outputs = runVoiceTools(
      response([invalid]),
      original,
      original,
      new Set(),
      commit,
    );
    expect(outputs[0]).toMatchObject({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: invalid.call_id },
    });
    expect(JSON.parse(outputs[0].item.output)).toMatchObject({
      workspaceChanged: false,
      error: expect.any(String),
    });
    expect(commit).not.toHaveBeenCalled();
  });
  it("reports commit failure without claiming a changed workspace", () => {
    const original = context();
    const commit = vi.fn(() => {
      throw new Error("Workspace replaced");
    });
    const outputs = runVoiceTools(
      response([call("edit"), call("inspect", "inspect_experiment")]),
      original,
      original,
      new Set(),
      commit,
    );
    expect(JSON.parse(outputs[0].item.output)).toEqual({
      workspaceChanged: false,
      error: "Workspace replaced",
    });
    expect(JSON.parse(outputs[1].item.output).scenario).toEqual(
      original.scenario,
    );
  });
});
