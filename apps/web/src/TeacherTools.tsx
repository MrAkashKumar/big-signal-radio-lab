import { useEffect, useState } from "react";
import { lessons, getLessonScenario } from "../../../content/lessons";
import {
  parseExperiment,
  type PortableExperiment,
  type TeacherChallenge,
} from "../../../packages/missions/product";
import { NumberField } from "./LabControls";
import { downloadExperiment } from "./productStorage";
export const defaultChallenge: TeacherChallenge = {
  objective:
    "Build a reliable link between two school buildings using at most 5 W.",
  environment: "School rooftops",
  frequencyOptionsHz: [146e6, 433e6],
  equipment: ["Quarter-wave vertical", "Dipole", "Yagi"],
  communicationGoal: "Short voice updates",
  constraints: [
    "Maximum transmitter power 5 W",
    "Explain how a return message would travel",
  ],
  targetConcepts: ["link budget", "antenna height"],
  hints: ["Try height before increasing power."],
  success: { minimumMarginDb: 10, maximumPowerW: 5, maximumHeightM: 30 },
};
export function TeacherTools({
  experiment,
  onOpen,
}: {
  experiment: PortableExperiment;
  onOpen: (e: PortableExperiment) => void;
}) {
  const [draft, setDraft] = useState<PortableExperiment>(() => {
    try {
      const saved = localStorage.getItem("bigsignal-teacher-draft-v1");
      if (saved) {
        const parsed = parseExperiment(JSON.parse(saved));
        if (parsed.teacher) return parsed;
      }
    } catch {
      /* An invalid saved draft falls back to the current experiment. */
    }
    return {
      ...structuredClone(experiment),
      title: experiment.teacher ? experiment.title : "School rooftop challenge",
      physics: undefined,
      teacher: experiment.teacher ?? structuredClone(defaultChallenge),
      settings: { ...experiment.settings, mode: "lab" },
    };
  });
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      parseExperiment(draft);
    } catch {
      setNotice(
        "Finish the required fields to save this draft. Your last valid draft is retained.",
      );
      return;
    }
    try {
      localStorage.setItem("bigsignal-teacher-draft-v1", JSON.stringify(draft));
      setNotice("Draft saved on this device.");
    } catch {
      setNotice(
        "This browser could not save the draft. Download the challenge to keep a copy.",
      );
    }
  }, [draft]);
  const t = draft.teacher!;
  const change = (fn: (t: TeacherChallenge) => void) =>
    setDraft((d) => {
      const n = structuredClone(d);
      fn(n.teacher!);
      return n;
    });
  const text = (
    label: string,
    key: "objective" | "environment" | "communicationGoal",
  ) => (
    <label>
      {label}
      <textarea
        maxLength={2000}
        value={t[key]}
        onChange={(e) => change((t) => (t[key] = e.target.value))}
      />
    </label>
  );
  return (
    <section className="teacher-page">
      <div className="page-heading">
        <span className="eyebrow">THE CLASSROOM FITS IN A FILE</span>
        <h1>
          Bring your class.
          <br />
          <em>Leave the accounts.</em>
        </h1>
        <p>
          Create a challenge, download it, and share the file with your
          students. They can open it locally and try any design that meets your
          requirements. Valid drafts are saved on this device.
        </p>
      </div>
      <div className="teacher-grid">
        <div className="surface teacher-form">
          <h2>Design the challenge</h2>
          <label>
            Challenge title
            <input
              value={draft.title}
              maxLength={500}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Start from a lesson
            <select
              value={draft.lesson?.id ?? ""}
              onChange={(e) => {
                const l = lessons.find((l) => l.id === e.target.value);
                if (l)
                  setDraft({
                    ...draft,
                    scenario: getLessonScenario(l.id),
                    lesson: { id: l.id, notes: l.objective },
                    teacher: {
                      ...t,
                      objective: l.objective,
                      targetConcepts: l.concepts,
                    },
                  });
                else
                  setDraft({
                    ...draft,
                    scenario: structuredClone(experiment.scenario),
                    lesson: null,
                  });
              }}
            >
              <option value="">Current lab configuration</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.tier} · {l.title}
                </option>
              ))}
            </select>
          </label>
          {text("Learning objective", "objective")}
          {text("Environment", "environment")}
          {text("What information must move?", "communicationGoal")}
          <label>
            Allowed frequencies / MHz, comma separated
            <input
              defaultValue={t.frequencyOptionsHz.map((h) => h / 1e6).join(", ")}
              onBlur={(e) => {
                const values = e.target.value
                  .split(",")
                  .map((x) => Number(x.trim()) * 1e6);
                if (
                  values.every(
                    (n) => Number.isFinite(n) && n >= 1e5 && n <= 1e11,
                  )
                )
                  change((t) => (t.frequencyOptionsHz = values));
                else
                  setNotice(
                    "Use frequencies from 0.1 to 100000 MHz, separated by commas.",
                  );
              }}
            />
          </label>
          {(
            ["equipment", "constraints", "targetConcepts", "hints"] as const
          ).map((key) => (
            <label key={key}>
              {
                {
                  equipment: "Available equipment",
                  constraints: "Planning constraints",
                  targetConcepts: "Target concepts",
                  hints: "Hints",
                }[key]
              }
              <textarea
                value={t[key].join("\n")}
                onChange={(e) =>
                  change(
                    (t) => (t[key] = e.target.value.split("\n").slice(0, 30)),
                  )
                }
              />
              <small>One item per line.</small>
            </label>
          ))}
          <div className="two-fields">
            <NumberField
              label="Maximum power / W"
              value={t.success.maximumPowerW}
              min={0.000001}
              max={1e8}
              step={0.1}
              onChange={(v) => change((t) => (t.success.maximumPowerW = v))}
            />
            <NumberField
              label="Target link margin / dB"
              value={t.success.minimumMarginDb}
              min={-100}
              max={200}
              onChange={(v) => change((t) => (t.success.minimumMarginDb = v))}
            />
            <NumberField
              label="Maximum antenna height / m"
              value={t.success.maximumHeightM ?? 30}
              min={0}
              max={20000}
              onChange={(v) => change((t) => (t.success.maximumHeightM = v))}
            />
          </div>
        </div>
        <aside className="teacher-preview surface">
          <span className="eyebrow">STUDENT BRIEF</span>
          <h2>{draft.title}</h2>
          <p>{t.objective}</p>
          <dl>
            <dt>Setting</dt>
            <dd>{t.environment}</dd>
            <dt>Communication goal</dt>
            <dd>{t.communicationGoal}</dd>
            <dt>Success</dt>
            <dd>
              At least {t.success.minimumMarginDb} dB margin, at most{" "}
              {t.success.maximumPowerW} W, and an available propagation path.
            </dd>
          </dl>
          <p>
            Allowed frequencies and equipment are checked in the lab. Other
            planning constraints are for your class to discuss.
          </p>
          <button
            className="primary"
            onClick={() => {
              try {
                onOpen(parseExperiment(draft));
              } catch (error) {
                setNotice(
                  error instanceof Error
                    ? error.message
                    : "Check the challenge fields.",
                );
              }
            }}
          >
            Open student challenge ↗
          </button>
          <button
            onClick={() => {
              try {
                downloadExperiment(draft);
                setNotice(
                  "Challenge downloaded. Send the .bigsignal.json file to your class.",
                );
              } catch (e) {
                setNotice(
                  e instanceof Error
                    ? e.message
                    : "Check the challenge fields.",
                );
              }
            }}
          >
            Download .bigsignal.json ↓
          </button>
          <p role="status">{notice}</p>
          <hr />
          <h3>A 30-minute classroom plan</h3>
          <ol>
            <li>Ask students to predict before they touch a control.</li>
            <li>Let pairs change one variable at a time.</li>
            <li>Compare successful designs. Which uses less power?</li>
            <li>Ask each pair to explain its weakest assumption.</li>
            <li>Export their experiment as evidence.</li>
          </ol>
          <p>
            Progress stays on each student's device. No names, account, cloud
            roster, or tracking service required.
          </p>
        </aside>
      </div>
    </section>
  );
}
