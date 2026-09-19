import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import type { Scenario, SimulationResult } from "../../../packages/contracts";
import type {
  ControlId,
  TeacherChallenge,
} from "../../../packages/missions/product";
import {
  simulateLaboratory,
  fresnelProfile,
  REAL_PHYSICS,
  DEFAULT_FANTASY,
  DEFAULT_BATTERY,
  estimateBattery,
  type PhysicsSettings,
} from "../../../packages/simulation/src/laboratory";
import { greatCircleDistanceM } from "../../../packages/propagation/src";
import { dbmToWatts } from "../../../packages/units/src";
import { type Graphics } from "./missions";
import { Scene } from "./Scene";
import { LabControls, NumberField } from "./LabControls";
import { Results } from "./Results";
import { RadioGuide } from "./features/guides";
import { AdvancedLab } from "./AdvancedLab";
import {
  evaluateTeacherChallenge,
  switchScenarioBand,
  switchPropagationModel,
  compareExperimentMeaning,
} from "./productDomain";

export function LabWorkspace({
  scenario,
  onChange,
  graphics,
  onGraphics,
  controls,
  predictionReady = true,
  onAttempt,
  extreme = false,
  teacher,
  physics = REAL_PHYSICS,
  onPhysics,
  tutorRunRevision = 0,
  renderScene,
  keepSceneOnSend = false,
}: {
  scenario: Scenario;
  tutorRunRevision?: number;
  renderScene?: (props: ComponentProps<typeof Scene>) => ReactNode;
  keepSceneOnSend?: boolean;
  onChange: (s: Scenario) => void;
  graphics: Graphics;
  onGraphics: (g: Graphics) => void;
  controls?: ControlId[];
  predictionReady?: boolean;
  onAttempt?: (r: SimulationResult) => void;
  extreme?: boolean;
  teacher?: TeacherChallenge | null;
  physics?: PhysicsSettings;
  onPhysics?: (p: PhysicsSettings) => void;
}) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"terrain" | "globe">(
    scenario.environment.model === "hf-skywave" ? "globe" : "terrain",
  );
  const [baseline, setBaseline] = useState<{
    scenario: Scenario;
    result: SimulationResult;
    physics: PhysicsSettings;
  } | null>(null);
  const [history, setHistory] = useState<Scenario[]>([]);
  const [instruments, setInstruments] = useState(false);
  const [panel, setPanel] = useState<
    "scene" | "results" | "compare" | "instruments" | "physics" | "challenge"
  >("scene");
  const [mobilePanel, setMobilePanel] = useState<"workspace" | "controls">(
    "workspace",
  );
  const [guess, setGuess] = useState<string | null>(null);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const lastInputs = useRef<{
    scenario: Scenario;
    physics: PhysicsSettings;
    extreme: boolean;
    revision: number;
  } | null>(null);
  useEffect(() => {
    const previous = lastInputs.current;
    if (
      previous?.scenario === scenario &&
      previous.physics === physics &&
      previous.extreme === extreme &&
      previous.revision === tutorRunRevision
    )
      return;
    lastInputs.current = {
      scenario,
      physics,
      extreme,
      revision: tutorRunRevision,
    };
    setResult(null);
    setRunning(false);
    if (scenario.environment.model === "hf-skywave") setView("globe");
    if (!tutorRunRevision || previous?.revision === tutorRunRevision) return;
    try {
      setResult(simulateLaboratory(scenario, extreme ? physics : REAL_PHYSICS));
      setPanel("results");
      setMobilePanel("workspace");
      setNotice(
        "Tutor demonstration. Try your own prediction and experiment next.",
      );
    } catch (error) {
      setResult(null);
      setNotice(
        error instanceof Error
          ? error.message
          : "The demonstration could not run.",
      );
    }
  }, [tutorRunRevision, scenario, physics, extreme]);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setRunning(false), reduced ? 100 : 1800);
    return () => clearTimeout(timer);
  }, [running, reduced]);
  function edit(s: Scenario) {
    setHistory((h) => [...h.slice(-19), structuredClone(scenario)]);
    onChange(s);
  }
  function send() {
    if (!predictionReady || running || (!controls && !guess)) return;
    try {
      const r = simulateLaboratory(scenario, extreme ? physics : REAL_PHYSICS);
      setResult(r);
      setPanel(keepSceneOnSend ? "scene" : "results");
      setMobilePanel("workspace");
      setRunning(true);
      setNotice("");
      onAttempt?.(r);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "The experiment could not run. Check your inputs.",
      );
      setResult(null);
    }
  }
  const band =
    scenario.environment.model === "hf-skywave"
      ? "HF"
      : scenario.frequencyHz >= 1e9
        ? "MICROWAVE"
        : scenario.frequencyHz >= 3e8
          ? "UHF"
          : "VHF";
  const fresnel = useMemo(
    () =>
      result &&
      greatCircleDistanceM(
        scenario.transmitter.position,
        scenario.receiver.position,
      ) >= 1 &&
      scenario.environment.model !== "hf-skywave" &&
      (scenario.frequencyHz >= 1e9 || controls?.includes("terrain"))
        ? fresnelProfile(
            greatCircleDistanceM(
              scenario.transmitter.position,
              scenario.receiver.position,
            ),
            scenario.frequencyHz,
            33,
            extreme && physics.mode === "fantasy"
              ? physics.speedOfLightMultiplier
              : 1,
          )
        : undefined,
    [result, scenario, controls, extreme, physics],
  );
  const endurance = (s: Scenario) =>
    estimateBattery({
      ...DEFAULT_BATTERY,
      rfPowerW: dbmToWatts(s.transmitter.powerDbm),
    }).runtimeHours;
  const teacherAssessment =
    teacher && result
      ? evaluateTeacherChallenge(scenario, result, teacher)
      : null;
  const comparisonMeaning =
    baseline && result
      ? compareExperimentMeaning(baseline, {
          physics: extreme ? physics : REAL_PHYSICS,
          result,
        })
      : null;
  const hasInstruments =
    !controls ||
    scenario.difficulty === "advanced" ||
    controls.some((c) =>
      ["antenna", "feedline", "noise", "bandwidth"].includes(c),
    );
  return (
    <div className="experiment-workspace">
      <RadioGuide />
      <div className="mobile-workspace-switch" aria-label="Workspace panels">
        <button
          aria-pressed={mobilePanel === "workspace"}
          onClick={() => setMobilePanel("workspace")}
        >
          Explore & results
        </button>
        <button
          aria-pressed={mobilePanel === "controls"}
          onClick={() => setMobilePanel("controls")}
        >
          Adjust radio
        </button>
      </div>
      <div className={`lab-workspace mobile-${mobilePanel}`}>
        <section className="visual-column">
          <nav className="workspace-views" aria-label="Experiment views">
            {(
              [
                ["scene", "Map"],
                ["results", result ? "Results ●" : "Results"],
                ["compare", "Compare A/B"],
                ...(hasInstruments ? [["instruments", "Workbench"]] : []),
                ...(extreme ? [["physics", "Physics"]] : []),
                ...(teacher ? [["challenge", "Challenge"]] : []),
              ] as [typeof panel, string][]
            ).map(([id, title]) => (
              <button
                key={id}
                aria-pressed={panel === id}
                onClick={() => {
                  setPanel(id);
                  if (id === "instruments") setInstruments(true);
                }}
              >
                {title}
              </button>
            ))}
          </nav>
          <div className="workspace-content">
            <div hidden={panel !== "physics"}>
              {extreme && (
                <div className="surface fantasy-controls">
                  <div className="result-tabs">
                    <button
                      aria-pressed={physics.mode === "real"}
                      onClick={() => onPhysics?.(REAL_PHYSICS)}
                    >
                      REAL PHYSICS
                    </button>
                    <button
                      aria-pressed={physics.mode === "fantasy"}
                      onClick={() => onPhysics?.(DEFAULT_FANTASY)}
                    >
                      FANTASY PHYSICS
                    </button>
                  </div>
                  {physics.mode === "fantasy" ? (
                    <>
                      <h3>FANTASY PHYSICS — THIS IS NOT THE REAL UNIVERSE.</h3>
                      <p>
                        Change a law, then compare with the real universe.
                        Numerical results are fictional under these assumptions.
                      </p>
                      {(
                        [
                          "disableEarthCurvature",
                          "removeIonosphere",
                          "disableFreeSpaceSpreading",
                        ] as const
                      ).map((key) => (
                        <label className="check" key={key}>
                          <input
                            type="checkbox"
                            checked={physics[key]}
                            onChange={(e) =>
                              onPhysics?.({
                                ...physics,
                                [key]: e.target.checked,
                              })
                            }
                          />
                          {
                            {
                              disableEarthCurvature: "Disable Earth curvature",
                              removeIonosphere: "Remove the ionosphere",
                              disableFreeSpaceSpreading:
                                "Remove free-space spreading",
                            }[key]
                          }
                        </label>
                      ))}
                      <NumberField
                        label="Speed of light / multiplier"
                        value={physics.speedOfLightMultiplier}
                        min={0.01}
                        max={100}
                        step={0.01}
                        onChange={(v) =>
                          onPhysics?.({ ...physics, speedOfLightMultiplier: v })
                        }
                      />
                    </>
                  ) : (
                    <p>
                      Ridiculous equipment, ordinary physical laws. Try 100 MW
                      or a kilometre-tall tower. Far-field and propagation
                      assumptions still have limits.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div hidden={panel !== "scene"}>
              <div className="scene-card">
                <div className="scene-top">
                  <span className="eyebrow">
                    {band} /{" "}
                    {scenario.environment.model === "free-space"
                      ? "IDEAL FREE SPACE"
                      : scenario.environment.model === "hf-skywave"
                        ? "SKYWAVE"
                        : "TERRAIN LINK"}
                  </span>
                  <span
                    className={`transmission-badge ${running ? "on-air" : ""}`}
                  >
                    {running
                      ? "● TRANSMITTING"
                      : result
                        ? "◉ RESULT READY"
                        : "○ READY TO EXPERIMENT"}
                  </span>
                </div>
                {renderScene ? (
                  renderScene({
                    band,
                    view,
                    graphics,
                    scenario,
                    paths: result?.propagationPaths ?? [],
                    running: running && !reduced,
                    fresnel,
                  })
                ) : (
                  <Scene
                    band={band}
                    view={view}
                    graphics={graphics}
                    scenario={scenario}
                    paths={result?.propagationPaths ?? []}
                    running={running && !reduced}
                    fresnel={fresnel}
                  />
                )}
                <div className="scene-bottom">
                  {!renderScene && (
                    <div className="segmented compact">
                      <button
                        aria-pressed={view === "terrain"}
                        disabled={scenario.environment.model === "hf-skywave"}
                        onClick={() => setView("terrain")}
                      >
                        △ Terrain
                      </button>
                      <button
                        aria-pressed={view === "globe"}
                        onClick={() => setView("globe")}
                      >
                        ◎ Earth
                      </button>
                    </div>
                  )}
                  <label>
                    Graphics
                    <select
                      aria-label="Graphics mode"
                      value={graphics}
                      onChange={(e) => onGraphics(e.target.value as Graphics)}
                    >
                      {["BIG", "NORMAL", "POTATO"].map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="lab-toolbar">
                {fresnel && (
                  <p className="fresnel-caption">
                    Blue rings show the first Fresnel zone along the direct ray.
                    Radius comes from the engine; terrain heights and zone width
                    are exaggerated together.
                  </p>
                )}
                <button
                  disabled={!result}
                  onClick={() => {
                    if (result)
                      setBaseline({
                        scenario: structuredClone(scenario),
                        result,
                        physics: structuredClone(
                          extreme ? physics : REAL_PHYSICS,
                        ),
                      });
                  }}
                >
                  Pin this design as A
                </button>
                <button
                  disabled={!history.length}
                  onClick={() => {
                    const previous = history.at(-1);
                    if (previous) {
                      onChange(previous);
                      setHistory(history.slice(0, -1));
                    }
                  }}
                >
                  ↶ Undo change
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={(e) => setReduced(e.target.checked)}
                  />
                  Reduce motion
                </label>
              </div>
            </div>
            <div hidden={panel !== "compare"}>
              {!baseline && (
                <section className="surface result-empty">
                  <h3>Compare two designs</h3>
                  <p>
                    Run an experiment, then pin it as A. Change one thing and
                    run again to discover what moved.
                  </p>
                  <button onClick={() => setPanel("scene")}>
                    Back to the map
                  </button>
                </section>
              )}
              {baseline && (
                <section className="comparison surface">
                  <span className="eyebrow">A / B EXPERIMENT</span>
                  <h3>One change. What moved?</h3>
                  <p>
                    A uses {baseline.physics.mode} physics. B uses{" "}
                    {extreme ? physics.mode : "real"} physics. A is pinned at{" "}
                    {(baseline.scenario.frequencyHz / 1e6).toFixed(2)} MHz and{" "}
                    {Number(
                      dbmToWatts(
                        baseline.scenario.transmitter.powerDbm,
                      ).toPrecision(3),
                    )}{" "}
                    W. Modify the current design and SEND IT for B.
                  </p>
                  {comparisonMeaning && (
                    <p className="assumption-note">
                      <b>{comparisonMeaning.label}.</b>{" "}
                      {comparisonMeaning.explanation}
                    </p>
                  )}
                  {result && (
                    <table>
                      <thead>
                        <tr>
                          <th>Measurement</th>
                          <th>A</th>
                          <th>B</th>
                          <th>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          ["receivedPowerDbm", "snrDb", "linkMarginDb"] as const
                        ).map((key, i) => (
                          <tr key={key}>
                            <th>
                              {["Received / dBm", "SNR / dB", "Margin / dB"][i]}
                            </th>
                            <td>{baseline.result[key].toFixed(1)}</td>
                            <td>{result[key].toFixed(1)}</td>
                            <td>
                              {(result[key] - baseline.result[key]).toFixed(1)}{" "}
                              dB
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <th>Battery / h</th>
                          <td>{endurance(baseline.scenario)?.toFixed(1)}</td>
                          <td>{endurance(scenario)?.toFixed(1)}</td>
                          <td>120 Wh, 10% TX</td>
                        </tr>
                        <tr>
                          <th>Propagation</th>
                          <td>
                            {baseline.result.propagationPaths
                              .map((p) => p.type)
                              .join(", ") || "None"}
                          </td>
                          <td>
                            {result.propagationPaths
                              .map((p) => p.type)
                              .join(", ") || "None"}
                          </td>
                          <td>
                            {result.propagationAvailable
                              ? "Available"
                              : "Unavailable"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                  <button
                    onClick={() => {
                      edit(structuredClone(baseline.scenario));
                      if (extreme)
                        onPhysics?.(structuredClone(baseline.physics));
                    }}
                  >
                    Restore A
                  </button>
                  <button onClick={() => setBaseline(null)}>
                    Clear comparison
                  </button>
                </section>
              )}
            </div>
            <div hidden={panel !== "challenge"}>
              {teacher && (
                <section className="surface challenge-result">
                  <h3>Your classroom challenge</h3>
                  <p>{teacher.objective}</p>
                  <p>
                    Move {teacher.communicationGoal.toLowerCase()}.{" "}
                    {teacher.constraints.join(". ")}
                  </p>
                  {teacherAssessment && (
                    <>
                      <h4>
                        {teacherAssessment.status === "passed"
                          ? "Structured requirements met."
                          : teacherAssessment.status === "incomplete"
                            ? "Some requirements need discussion."
                            : "Keep experimenting."}
                      </h4>
                      {teacherAssessment.checks.map((check) => (
                        <p key={check.id}>
                          {check.status === "passed"
                            ? "✓"
                            : check.status === "not-assessed"
                              ? "?"
                              : "○"}{" "}
                          {check.label}
                          <small className="check-detail">{check.detail}</small>
                        </p>
                      ))}
                      <p className="assumption-note">
                        {teacherAssessment.planningNotes[0]}
                      </p>
                    </>
                  )}
                  <details>
                    <summary>Teacher hints</summary>
                    {teacher.hints.map((h) => (
                      <p key={h}>{h}</p>
                    ))}
                  </details>
                </section>
              )}
            </div>
            <div hidden={panel !== "results"}>
              <Results result={result} scenario={scenario} />
              {result && (
                <button
                  className="pin-result"
                  onClick={() => {
                    setBaseline({
                      scenario: structuredClone(scenario),
                      result,
                      physics: structuredClone(
                        extreme ? physics : REAL_PHYSICS,
                      ),
                    });
                    setPanel("compare");
                  }}
                >
                  Pin result as A & compare
                </button>
              )}
            </div>
            {hasInstruments && (
              <div hidden={panel !== "instruments"}>
                {instruments && (
                  <AdvancedLab scenario={scenario} onChange={edit} />
                )}
              </div>
            )}
          </div>
        </section>
        <aside className="configure surface">
          <div className="panel-title">
            <h2>Your radio.</h2>
            <span>TRY THINGS.</span>
          </div>
          <p className="configure-scroll-hint">Adjust your setup below · scroll for more controls ↓</p>
          <div className="configure-scroll" tabIndex={0} role="region" aria-label="Radio settings">
            {!controls && (
              <>
                <label>
                  Explanation depth
                  <select
                    value={scenario.difficulty}
                    onChange={(e) =>
                      edit({
                        ...scenario,
                        difficulty: e.target.value as Scenario["difficulty"],
                      })
                    }
                  >
                    {["beginner", "intermediate", "advanced"].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>Same problem, different band</legend>
                  <p>
                    Endpoints stay fixed. The model and mode change with the
                    band.
                  </p>
                  <div className="choice-grid">
                    {(["HF", "VHF", "UHF", "MICROWAVE"] as const).map((b) => (
                      <button
                        key={b}
                        aria-pressed={band === b}
                        onClick={() => edit(switchScenarioBand(scenario, b))}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  Propagation environment
                  <select
                    value={scenario.environment.model}
                    onChange={(e) =>
                      edit(
                        switchPropagationModel(
                          scenario,
                          e.target.value as Scenario["environment"]["model"],
                        ),
                      )
                    }
                  >
                    <option value="free-space">Ideal free space</option>
                    <option value="vhf-terrain">Earth and terrain</option>
                    <option value="hf-skywave">HF ionosphere</option>
                  </select>
                </label>
              </>
            )}
            <LabControls
              scenario={scenario}
              onChange={edit}
              controls={
                controls ??
                (scenario.difficulty === "beginner"
                  ? [
                      "power",
                      "frequency",
                      "antenna",
                      "height",
                      "distance",
                      "mode",
                    ]
                  : undefined)
              }
              extreme={extreme}
            />
          </div>
          <div className="configure-action">
            {!controls && (
              <fieldset>
                <legend>What do you expect?</legend>
                <div className="choice-grid">
                  {["Strong", "Marginal", "No link"].map((g) => (
                    <button
                      key={g}
                      aria-pressed={guess === g}
                      onClick={() => setGuess(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <button
              className="send"
              disabled={!predictionReady || running || (!controls && !guess)}
              onClick={send}
            >
              {running ? "TRANSMITTING…" : "SEND IT"} ↗
            </button>
            <p className="send-help">
              {running
                ? "Transmitting your experiment…"
                : !predictionReady
                ? "Make your prediction first."
                : !controls && !guess
                  ? "Choose Strong, Marginal, or No link above to enable SEND IT. Your guess does not change the result."
                  : "Ready to test. SEND IT calculates the result from your setup."}
            </p>
            <p role="alert" className="error-message">
              {notice}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
