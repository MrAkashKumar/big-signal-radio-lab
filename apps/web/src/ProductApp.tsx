import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import type { Difficulty, Scenario } from "../../../packages/contracts";
import { lessons, getLessonScenario } from "../../../content/lessons";
import {
  parseExperiment,
  hasAppliedDesign,
  emptyLessonProgress,
  getMastery,
  isLessonUnlocked,
  assessQuestion,
  decodeExperiment,
  type Lesson,
  type LessonProgress,
  type PortableExperiment,
} from "../../../packages/missions/product";
import { LabWorkspace } from "./LabWorkspace";
import { TutorPanel } from "./TutorPanel";
import type { TutorContext } from "../../../packages/tutor/context";
import type { NetworkScenario } from "../../../packages/simulation/src/network";
import { DisasterLab } from "./DisasterLab";
import { TsunamiLevel } from "./TsunamiLevel";
import { TeacherTools } from "./TeacherTools";
import {
  defaultExperiment,
  downloadExperiment,
  loadProduct,
  STORAGE_KEY,
} from "./productStorage";
import type { ProductState } from "./productStorage";
import type { PhysicsSettings } from "../../../packages/simulation/src/laboratory";
import { RescueScene, TabStory } from "./features/guides";
import { WalkthroughConsole } from "./features/walkthrough";
import { mainPages, toolPages, pageLabels, type Page } from "./app/navigation";
import { walkthroughStops, walkthroughLanguages } from "../../../content/explanations/walkthrough";
import "./product.css";
import "./workspace.css";

class ProductBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="product-error">
        <h1>The lab tripped a breaker.</h1>
        <p>
          Your saved experiments are still on this device. Reload to reopen the
          last valid configuration.
        </p>
        <button onClick={() => location.reload()}>Reload the laboratory</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function useOfflineStatus() {
  const [status, setStatus] = useState("Runs locally · no account needed");
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) {
      setStatus("Offline reload unavailable in this browser");
      return;
    }
    setStatus("Preparing offline classroom…");
    navigator.serviceWorker
      .register(
        `${import.meta.env.BASE_URL}sw.js?build=${encodeURIComponent(import.meta.url)}`,
      )
      .then(() => navigator.serviceWorker.ready)
      .then(() => setStatus("Ready offline · reopen after updates"))
      .catch(() =>
        setStatus("Offline cache unavailable · keep this page open"),
      );
  }, []);
  return status;
}

function Product() {
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourLanguage, setTourLanguage] = useState("auto");
  const [voiceReady, setVoiceReady] = useState(false);
  const [narrationRequest, setNarrationRequest] = useState<{ id: number; prompt: string }>();
  const [state, setState] = useState<ProductState>(loadProduct);
  const [page, setPage] = useState<Page>(() =>
    location.hash === "#tsunami" ? "tsunami" : state.experiment.settings.mode,
  );
  useEffect(() => {
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}${page === "tsunami" ? "#tsunami" : ""}`,
    );
  }, [page]);
  const [lessonPhase, setLessonPhase] = useState<
    "brief" | "experiment" | "reflect"
  >("brief");
  const [tutorNetwork, setTutorNetwork] = useState<NetworkScenario>();
  const [tutorRunRevision, setTutorRunRevision] = useState(0);
  const [tutorNetworkUpdate, setTutorNetworkUpdate] = useState<{
    network: NetworkScenario;
    revision: number;
  }>();
  const [tier, setTier] = useState<Difficulty>("beginner");
  const [notice, setNotice] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [removed, setRemoved] = useState<{
    experiment: PortableExperiment;
    index: number;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const offline = useOfflineStatus();
  const experiment = state.experiment;
  const lesson = lessons.find((l) => l.id === state.activeLesson) ?? null;
  const lessonProgress = lesson
    ? (state.progress[lesson.id] ?? emptyLessonProgress())
    : emptyLessonProgress();
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your experiment to keep it.",
      );
    }
  }, [state]);
  function changeExperiment(
    change: (e: PortableExperiment) => PortableExperiment,
  ) {
    setState((s) => ({ ...s, experiment: change(s.experiment) }));
  }
  function guideTour(action: "show" | "stop", step: number) {
    if (action === "stop") { setTourStep(null); setNarrationRequest(undefined); return; }
    const stop = walkthroughStops[step];
    if (!stop) throw new Error("Unknown tour stop.");
    setTourStep(step);
    navigate(stop.page);
  }
  function navigate(next: Page) {
    setNarrationRequest(undefined);
    if (tourStep !== null) {
      const matchingStop = walkthroughStops.findIndex(stop => stop.page === next);
      setTourStep(matchingStop < 0 ? null : matchingStop);
    }
    setTutorRunRevision(0);
    setTutorNetworkUpdate(undefined);
    if (next === "lab" && page === "learn" && lesson)
      setState((s) => ({
        ...s,
        applicationBaseline: structuredClone(s.experiment.scenario),
      }));
    setPage(next);
    setNotice("");
    if (["learn", "lab", "disaster", "unreasonable"].includes(next))
      changeExperiment((e) => ({
        ...e,
        settings: {
          ...e.settings,
          mode: next as PortableExperiment["settings"]["mode"],
        },
        ...(next === "unreasonable" ? {} : { physics: undefined }),
      }));
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openLesson(l: Lesson) {
    setTutorRunRevision(0);
    setLessonPhase("brief");
    setState((s) => ({
      ...s,
      onboarded: true,
      activeLesson: l.id,
      applicationBaseline: undefined,
      experiment: {
        ...defaultExperiment(),
        title: l.title,
        scenario: getLessonScenario(l.id),
        lesson: { id: l.id, notes: l.objective },
        settings: { ...s.experiment.settings, mode: "learn" },
      },
    }));
    setPage("learn");
    setResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function progress(change: Partial<LessonProgress>) {
    if (!lesson) return;
    setState((s) => ({
      ...s,
      progress: {
        ...s.progress,
        [lesson.id]: {
          ...(s.progress[lesson.id] ?? emptyLessonProgress()),
          ...change,
        },
      },
    }));
  }
  function openExperiment(e: PortableExperiment) {
    setTutorRunRevision(0);
    setState((s) => ({
      ...s,
      onboarded: true,
      applicationBaseline: undefined,
      experiment: {
        ...structuredClone(e),
        settings: {
          ...e.settings,
          mode: e.settings.mode === "unreasonable" ? "unreasonable" : "lab",
        },
      },
      activeLesson:
        e.lesson && lessons.some((l) => l.id === e.lesson!.id)
          ? e.lesson.id
          : null,
    }));
    setPage(e.settings.mode === "unreasonable" ? "unreasonable" : "lab");
    setResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function save() {
    if (state.saved.length >= 50) {
      setNotice(
        "Your notebook has 50 experiments. Export any designs you want to keep, then remove one from My Experiments to free a slot.",
      );
      return false;
    }
    try {
      parseExperiment(experiment);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Check the experiment inputs.",
      );
      return false;
    }
    setState((s) => ({
      ...s,
      saved: [
        {
          ...structuredClone(s.experiment),
          title: s.experiment.title || "Untitled experiment",
        },
        ...s.saved,
      ].slice(0, 50),
    }));
    setNotice(
      "Experiment saved on this device. Export a file to keep a portable copy.",
    );
    return true;
  }
  function exportFile(e: PortableExperiment) {
    try {
      downloadExperiment(e);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Check the experiment inputs before exporting.",
      );
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1_000_000)
        throw new Error("Experiment files must be smaller than 1 MB.");
      const e = decodeExperiment(await file.text());
      openExperiment(e);
      setNotice(
        `Opened ${e.title}. Your other saved experiments are unchanged.`,
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Could not read this experiment.",
      );
    }
    if (input.current) input.current.value = "";
  }
  const setScenario = (scenario: Scenario) =>
    changeExperiment((e) => ({ ...e, scenario }));
  const tutorContext: TutorContext =
    page === "disaster"
      ? { mode: "disaster", network: tutorNetwork }
      : {
          mode:
            page === "unreasonable"
              ? "unreasonable"
              : page === "learn" && lesson && state.onboarded
                ? "learn"
                : "lab",
          scenario: experiment.scenario,
          physics: experiment.physics,
          lessonId: lesson?.id,
        };
  tutorContext.language = tourLanguage;
  tutorContext.visiblePage = page;
  if (tourStep !== null) tutorContext.walkthroughStep = tourStep;
  const latestTutorContext = useRef(tutorContext);
  latestTutorContext.current = tutorContext;
  function applyTutorContext(next: TutorContext, expected: TutorContext) {
    if (!["lab", "unreasonable", "disaster"].includes(page) && !(page === "learn" && lesson && state.onboarded)) throw new Error("Open a laboratory before changing settings.");
    if (JSON.stringify(latestTutorContext.current) !== JSON.stringify(expected))
      throw new Error(
        "The workspace changed. Ask Signal to use your current setup.",
      );
    if (next.mode !== expected.mode)
      throw new Error("The tutor cannot switch learning modes.");
    if (next.mode === "disaster") {
      if (!next.network) throw new Error("No disaster network is open.");
      latestTutorContext.current = {
        ...latestTutorContext.current,
        network: next.network,
      };
      setTutorNetwork(next.network);
      setTutorNetworkUpdate((previous) => ({
        network: next.network!,
        revision: (previous?.revision ?? 0) + 1,
      }));
    } else {
      if (!next.scenario) throw new Error("No experiment is open.");
      latestTutorContext.current = {
        ...latestTutorContext.current,
        scenario: next.scenario,
      };
      setScenario(next.scenario);
      setTutorRunRevision((revision) => revision + 1);
      if (page === "learn" && lesson && state.onboarded)
        setLessonPhase("experiment");
      else if (page !== "lab" && page !== "unreasonable") setPage("lab");
    }
  }
  const workspace = (guided = false) => (
    <LabWorkspace
      key={`${resetKey}-${guided ? lesson?.id : "free"}-${page}`}
      scenario={experiment.scenario}
      tutorRunRevision={tutorRunRevision}
      onChange={setScenario}
      graphics={experiment.settings.graphics}
      onGraphics={(graphics) =>
        changeExperiment((e) => ({
          ...e,
          settings: { ...e.settings, graphics },
        }))
      }
      controls={guided ? lesson?.controls : undefined}
      predictionReady={!guided || lessonProgress.predictionIndex !== null}
      onAttempt={(result) => {
        if (guided) progress({ attempts: lessonProgress.attempts + 1 });
        else if (
          lesson &&
          hasAppliedDesign(
            lesson,
            lessonProgress,
            state.applicationBaseline,
            experiment.scenario,
            result,
            experiment.physics,
          )
        )
          progress({ applied: true });
      }}
      extreme={page === "unreasonable"}
      physics={experiment.physics}
      onPhysics={(physics: PhysicsSettings) =>
        changeExperiment((e) => ({ ...e, physics }))
      }
      teacher={experiment.teacher}
    />
  );
  return (
    <div
      data-page={page}
      className={`product-app ${page === "lab" || page === "unreasonable" || (page === "learn" && lesson && state.onboarded) ? "focused-app" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to the laboratory
      </a>
      <header className="product-header">
        <button
          className="product-brand"
          onClick={() => navigate("learn")}
          aria-label="BIG SIGNAL home"
        >
          <span className="signal-mark">◖)))</span>
          <span>
            BIG SIGNAL<small>A radio science workshop</small>
          </span>
        </button>
        <div className="header-actions">
          <span className="local-dot">No account needed</span>
          <button onClick={() => guideTour("show", 0)}>Project walkthrough ◉</button>
          <button onClick={() => input.current?.click()}>Open file ↗</button>
        </div>
      </header>
      <nav className="primary-nav" aria-label="Main navigation">
        {mainPages.map(
          (p) => (
            <button
              key={p}
              data-section={p}
              aria-current={page === p ? "page" : undefined}
              onClick={() => navigate(p)}
            >
              <span className="nav-section-dot" aria-hidden="true" />{pageLabels[p]}
            </button>
          ),
        )}
      </nav>
      <nav className="secondary-nav" aria-label="Tools">
        {toolPages.map((p) => (
          <button
            key={p}
            aria-current={page === p ? "page" : undefined}
            onClick={() => navigate(p)}
          >
            {pageLabels[p]}
          </button>
        ))}
        <span>{offline}</span>
      </nav>
      <input
        ref={input}
        type="file"
        accept=".json,.bigsignal.json,application/json"
        aria-label="Import experiment file"
        className="file-input"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <main id="main-content">
        {tourStep !== null && (
          <WalkthroughConsole
            step={tourStep}
            language={tourLanguage}
            onStep={step => guideTour("show", step)}
            onLanguage={language => { if (walkthroughLanguages.some(item => item.id === language)) setTourLanguage(language); }}
            onNarrate={() => setNarrationRequest(previous => ({
              id: (previous?.id ?? 0) + 1,
              prompt: `${walkthroughStops[tourStep].prompt} Explain in the selected audience language. Stay at this tour stop unless I ask to move. Do not change settings until I request a demonstration.`,
            }))}
            onClose={() => guideTour("stop", 0)}
            voiceReady={voiceReady}
          />
        )}
        {page !== "learn" && <TabStory key={page} page={page} />}
        {page === "learn" && (!state.onboarded || !lesson) ? (
          <section className="onboarding">
            <div>
              <span className="eyebrow">
                WHEN CONNECTION BECOMES A LIFELINE
              </span>
              <h1>
                Phones are down.<br />
                <em>Hope isn't.</em>
              </h1>
              <p>
                A hospital needs supplies. A relief team is waiting.
                Discover how radio can help a message cross the distance—when everyday connections fail.
              </p>
              <button
                className="primary"
                onClick={() => navigate("tsunami")}
              >
                Enter the hospital mission ↗
              </button>
              <button
                className="text-button"
                onClick={() => openLesson(lessons[0])}
              >
                New to radio? Start with the guided lessons.
              </button>
              <div className="onboard-facts">
                <span>No hardware needed</span>
                <span>Local simulation</span>
                <span>Learn by trying</span>
              </div>
            </div>
            <RescueScene />
          </section>
        ) : null}
        {page === "learn" && (!state.onboarded || !lesson) && (
          <section className="mission-launchpad" aria-labelledby="choose-experience">
            <div className="launchpad-heading"><div><span className="eyebrow">ONE IDEA, MANY WAYS TO EXPLORE</span><h2 id="choose-experience">Start with a human connection.</h2></div><p>Choose a story. Change one thing. See why it matters.</p></div>
            <div className="launchpad-cards">
              <button data-color="teal" onClick={() => openLesson(lessons[0])}><span className="launchpad-icon" aria-hidden="true">≋</span><small>START HERE · GUIDED</small><h3>Make your first connection</h3><p>Two radios and a simple question: will the message get through?</p><span className="launchpad-link">Learn the basics <span aria-hidden="true">↗</span></span></button>
              <button data-color="amber" onClick={() => navigate("tsunami")}><span className="launchpad-icon" aria-hidden="true">♡</span><small>A HUMAN STORY · HOSPITAL RADIO</small><h3>Help a message reach home</h3><p>Phones are down. A hospital operator needs to reach a relief hub.</p><span className="launchpad-link">When phones fail <span aria-hidden="true">↗</span></span></button>
              <button data-color="blue" onClick={() => navigate("lab")}><span className="launchpad-icon" aria-hidden="true">◎</span><small>YOUR EXPERIMENT · OPEN LAB</small><h3>See what changes the signal</h3><p>Explore the map, tune a radio, and inspect the reason behind each result.</p><span className="launchpad-link">Explore the radio lab <span aria-hidden="true">↗</span></span></button>
            </div>
            <div className="explain-strip"><span>EXPLAIN IT TO ANYONE</span><p>“We send a message. The world gets in the way. Let's change the setup and see if it arrives.”</p></div>
          </section>
        )}
        {state.onboarded && page === "learn" && !lesson && (
          <>
            <div className="page-heading course-heading">
              <div>
                <span className="eyebrow">THE RADIO FIELD GUIDE</span>
                <h1>
                  Less reading.
                  <br />
                  <em>More sending.</em>
                </h1>
                <p>
                  Start with a hunch. Make a link. Leave with an explanation.
                  <br />
                  Short experiments, real physics, occasionally a microwave
                  oven.
                </p>
              </div>
              <div className="course-counter">
                <b>
                  {
                    lessons.filter((l) =>
                      ["DEMONSTRATED", "APPLIED"].includes(
                        getMastery(l, state.progress[l.id]),
                      ),
                    ).length
                  }
                  <span> / {lessons.length}</span>
                </b>
                <small>IDEAS DEMONSTRATED</small>
              </div>
            </div>
            <div className="course-tiers" role="group" aria-label="Course tier">
              {(["beginner", "intermediate", "advanced"] as const).map(
                (t, i) => (
                  <button
                    key={t}
                    aria-pressed={tier === t}
                    onClick={() => setTier(t)}
                  >
                    <small>
                      0{i + 1} /{" "}
                      {t === "beginner"
                        ? "BUILD INTUITION"
                        : t === "intermediate"
                          ? "MEET THE UNITS"
                          : "OPEN THE HOOD"}
                    </small>
                    <b>{t}</b>
                    <span>
                      {t === "beginner"
                        ? "No radio knowledge needed."
                        : t === "intermediate"
                          ? "dB, noise, and engineering tradeoffs."
                          : "Antennas, receivers, and model limits."}
                    </span>
                  </button>
                ),
              )}
            </div>
            <div className="course-list">
              {lessons
                .filter((l) => l.tier === tier)
                .map((l) => {
                  const unlocked = isLessonUnlocked(l, lessons, state.progress);
                  const mastery = getMastery(l, state.progress[l.id]);
                  return (
                    <button
                      className={`lesson-card ${!unlocked ? "locked" : ""}`}
                      key={l.id}
                      disabled={!unlocked}
                      onClick={() => openLesson(l)}
                    >
                      <span className="lesson-number">
                        {String(l.number).padStart(2, "0")}
                      </span>
                      <div>
                        <span className="eyebrow">
                          {l.minutes} MIN /{" "}
                          {l.simulationStatus === "conceptual"
                            ? "CONCEPT + RELATED EXPERIMENT"
                            : "HANDS-ON EXPERIMENT"}
                        </span>
                        <h2>{l.title}</h2>
                        <p>{l.objective}</p>
                      </div>
                      <span className="lesson-state">
                        {unlocked
                          ? mastery === "UNSEEN"
                            ? "OPEN LAB ↗"
                            : mastery
                          : "Complete the previous lesson"}
                      </span>
                    </button>
                  );
                })}
            </div>
            <div className="course-footnote">
              <b>Learning, without the leaderboard.</b>
              <p>
                Encountered → demonstrated → applied. Your evidence stays on
                this device. Each tier has its own starting point.
              </p>
            </div>
          </>
        )}
        {state.onboarded && page === "learn" && lesson && (
          <>
            <div className="lesson-header">
              <button
                className="text-button"
                onClick={() => {
                  setState((s) => ({ ...s, activeLesson: null }));
                  setTier(lesson.tier);
                }}
              >
                ← All lessons
              </button>
              <span className="eyebrow">
                {lesson.tier} / EXPERIMENT{" "}
                {String(lesson.number).padStart(2, "0")} / {lesson.minutes} MIN
              </span>
              <h1>{lesson.title}</h1>
              <p>{lesson.objective}</p>
              <span className="mastery-badge">
                {getMastery(lesson, lessonProgress)}
              </span>
            </div>
            <nav className="lesson-phases" aria-label="Lesson steps">
              <button
                aria-pressed={lessonPhase === "brief"}
                onClick={() => setLessonPhase("brief")}
              >
                01 Brief & predict
              </button>
              <button
                aria-pressed={lessonPhase === "experiment"}
                disabled={lessonProgress.predictionIndex === null}
                onClick={() => setLessonPhase("experiment")}
              >
                02 Experiment
              </button>
              <button
                aria-pressed={lessonPhase === "reflect"}
                disabled={lessonProgress.attempts === 0}
                onClick={() => setLessonPhase("reflect")}
              >
                03 Reflect & apply
              </button>
            </nav>
            <div hidden={lessonPhase !== "brief"} className="lesson-stage">
              <div className="lesson-intro">
                <section className="surface">
                  <span className="eyebrow">01 / THE SITUATION</span>
                  <h2>{lesson.scenarioBrief}</h2>
                  {lesson.id === "wrong-microwave" && (
                    <svg
                      className="microwave"
                      viewBox="0 0 360 170"
                      role="img"
                      aria-label="A microwave oven. Wrong microwave."
                    >
                      <rect
                        x="12"
                        y="16"
                        width="336"
                        height="134"
                        rx="16"
                        fill="#dae5cd"
                      />
                      <rect
                        x="30"
                        y="32"
                        width="225"
                        height="100"
                        rx="9"
                        fill="#273827"
                      />
                      <path d="M70 90h130l-20 24H90z" fill="#c9f879" />
                      <path
                        d="M108 75q-12-10 0-20m28 20q-12-10 0-20m28 20q-12-10 0-20"
                        fill="none"
                        stroke="#c9f879"
                        strokeWidth="4"
                      />
                      <rect
                        x="274"
                        y="38"
                        width="55"
                        height="24"
                        rx="3"
                        fill="#162216"
                      />
                      <text x="282" y="55" fill="#c9f879" fontSize="12">
                        0:13
                      </text>
                      <circle cx="300" cy="91" r="14" fill="#536548" />
                      <path
                        d="M33 154v8m290-8v8"
                        stroke="#768769"
                        strokeWidth="10"
                      />
                    </svg>
                  )}
                  <ol>
                    {lesson.experiment.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {lesson.modelNote && (
                    <p className="assumption-note">{lesson.modelNote}</p>
                  )}
                </section>
                <section className="surface prediction-card">
                  <span className="eyebrow">02 / PREDICT</span>
                  <h3>{lesson.prediction.question}</h3>
                  <div className="question-choices">
                    {lesson.prediction.choices.map((choice, i) => (
                      <button
                        key={choice}
                        aria-pressed={lessonProgress.predictionIndex === i}
                        onClick={() => progress({ predictionIndex: i })}
                      >
                        <span>{String.fromCharCode(65 + i)}</span>
                        {choice}
                      </button>
                    ))}
                  </div>
                  <p>Commit to a guess. Being wrong is useful data.</p>
                  <button
                    className="primary"
                    disabled={lessonProgress.predictionIndex === null}
                    onClick={() => setLessonPhase("experiment")}
                  >
                    Try the experiment ↗
                  </button>
                </section>
              </div>
            </div>
            <div hidden={lessonPhase !== "experiment"}>
              <div className="lesson-run-guide">
                <details>
                  <summary>Experiment instructions</summary>
                  <ol>
                    {lesson.experiment.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {lesson.modelNote && <p>{lesson.modelNote}</p>}
                </details>
                <button
                  disabled={lessonProgress.attempts === 0}
                  onClick={() => setLessonPhase("reflect")}
                >
                  Reflect on your result ↗
                </button>
              </div>
              {workspace(true)}
            </div>
            <div hidden={lessonPhase !== "reflect"} className="lesson-stage">
              {lessonProgress.attempts > 0 && (
                <div className="lesson-debrief">
                  <section className="surface">
                    <span className="eyebrow">04 / OBSERVE & EXPLAIN</span>
                    <h2>{lesson.observation}</h2>
                    <p>{lesson.explanation}</p>
                    <p className="misconception">
                      <b>A common trap</b> {lesson.misconception}
                    </p>
                    {lessonProgress.predictionIndex !== null && (
                      <p>
                        {
                          assessQuestion(
                            lesson.prediction,
                            lessonProgress.predictionIndex,
                          ).feedback
                        }
                      </p>
                    )}
                  </section>
                  <section className="surface">
                    <span className="eyebrow">
                      05 / TAKE THE IDEA SOMEWHERE NEW
                    </span>
                    <h3>{lesson.transfer.question}</h3>
                    <div className="question-choices">
                      {lesson.transfer.choices.map((c, i) => (
                        <button
                          key={c}
                          aria-pressed={lessonProgress.transferIndex === i}
                          onClick={() => progress({ transferIndex: i })}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {lessonProgress.transferIndex !== null && (
                      <p
                        role="status"
                        className={
                          lessonProgress.transferIndex ===
                          lesson.transfer.correctIndex
                            ? "correct-feedback"
                            : "retry-feedback"
                        }
                      >
                        {
                          assessQuestion(
                            lesson.transfer,
                            lessonProgress.transferIndex,
                          ).feedback
                        }
                      </p>
                    )}
                    {lessonProgress.transferIndex ===
                      lesson.transfer.correctIndex && (
                      <div className="lesson-next">
                        <button
                          className="primary"
                          onClick={() => {
                            const next = lessons.find(
                              (l) =>
                                l.tier === lesson.tier &&
                                l.number === lesson.number + 1,
                            );
                            if (next) openLesson(next);
                            else {
                              setState((s) => ({ ...s, activeLesson: null }));
                              setTier(
                                lesson.tier === "beginner"
                                  ? "intermediate"
                                  : "advanced",
                              );
                            }
                          }}
                        >
                          Next experiment ↗
                        </button>
                        <button onClick={() => navigate("lab")}>
                          Try your own version in Lab
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
            <div className="lab-toolbar lesson-file-actions">
              <button
                onClick={() => {
                  setScenario(getLessonScenario(lesson.id));
                  setResetKey((k) => k + 1);
                }}
              >
                ↺ Reset this experiment
              </button>
              <button onClick={save}>Save experiment</button>
              <button onClick={() => exportFile(experiment)}>
                Export experiment ↓
              </button>
            </div>
          </>
        )}
        {(page === "lab" || page === "unreasonable") && (
          <>
            <div className="page-heading lab-page-heading">
              <span className="eyebrow">
                {page === "lab"
                  ? "FREE EXPERIMENTATION / SAME SERIOUS PHYSICS"
                  : "THE SCIENTIFIC METHOD, WITH POOR IMPULSE CONTROL"}
              </span>
              <h1>
                {page === "lab" ? (
                  <>
                    Your hunch.
                    <br />
                    <em>Your laboratory.</em>
                  </>
                ) : (
                  <>
                    Unreasonable
                    <br />
                    <em>engineering.</em>
                  </>
                )}
              </h1>
              <p>
                {page === "lab"
                  ? "Change one thing. Send a signal. Find out what matters."
                  : "Push equipment to absurd limits, or change the universe. Always know which experiment you are running."}
              </p>
            </div>
            <div className="experiment-bar">
              <label>
                Experiment name
                <input
                  value={experiment.title}
                  maxLength={500}
                  onChange={(e) =>
                    changeExperiment((x) => ({ ...x, title: e.target.value }))
                  }
                />
              </label>
              <button onClick={save}>Save</button>
              <button
                onClick={() => {
                  if (state.saved.length >= 50) {
                    setNotice(
                      "Notebook full. Remove an experiment from My Experiments to free a slot.",
                    );
                    return;
                  }
                  if (!save()) return;
                  changeExperiment((e) => ({
                    ...e,
                    title: e.title.slice(0, 495) + " copy",
                  }));
                  setNotice("Original saved. You are editing a duplicate.");
                }}
              >
                Duplicate
              </button>
              <button onClick={() => exportFile(experiment)}>Export ↓</button>
              <button
                onClick={() => {
                  changeExperiment((e) => ({
                    ...defaultExperiment(),
                    settings: e.settings,
                  }));
                  setResetKey((k) => k + 1);
                }}
              >
                ↺ Reset universe
              </button>
            </div>
            {workspace()}
          </>
        )}
        {page === "tsunami" && (
          <TsunamiLevel
            onExit={() => navigate("disaster")}
            onOpenLesson={(id) => {
              const selected = lessons.find((lesson) => lesson.id === id);
              if (selected) openLesson(selected);
            }}
          />
        )}
        {page === "disaster" && (
          <>
            <button
              className="tsunami-entry"
              onClick={() => navigate("tsunami")}
            >
              <span>REAL HISTORY · 2 MINUTES</span>
              <strong>When hospitals needed a voice.</strong>
              <span>Explore the 2004 tsunami hospital network ↗</span>
            </button>
            <DisasterLab
              onContextChange={setTutorNetwork}
              tutorUpdate={tutorNetworkUpdate}
              onOpenLab={(scenario) =>
                openExperiment({
                  ...defaultExperiment(),
                  title: scenario.title,
                  scenario,
                  settings: {
                    graphics: experiment.settings.graphics,
                    mode: "lab",
                  },
                })
              }
            />
          </>
        )}
        {page === "teacher" && (
          <TeacherTools experiment={experiment} onOpen={openExperiment} />
        )}
        {page === "saved" && (
          <section>
            <div className="page-heading">
              <span className="eyebrow">YOUR LAB NOTEBOOK</span>
              <h1>
                Good ideas.
                <br />
                <em>Questionable antennas.</em>
              </h1>
              <p>
                Saved on this device. Export files to move experiments between
                computers.
              </p>
            </div>
            {removed && (
              <div className="notice" role="status">
                Removed {removed.experiment.title}.{" "}
                <button
                  disabled={state.saved.length >= 50}
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      saved: [
                        ...s.saved.slice(0, removed.index),
                        removed.experiment,
                        ...s.saved.slice(removed.index),
                      ],
                    }));
                    setRemoved(null);
                  }}
                >
                  Undo removal
                </button>
              </div>
            )}
            {!state.saved.length ? (
              <div className="empty-notebook surface">
                <h2>No experiments saved. Yet.</h2>
                <p>
                  Run a lesson or explore the Lab, then save a design worth
                  trying again.
                </p>
                <button className="primary" onClick={() => navigate("lab")}>
                  Open the lab ↗
                </button>
                <button onClick={() => input.current?.click()}>
                  Import an experiment
                </button>
              </div>
            ) : (
              <div className="saved-grid">
                {state.saved.map((e, i) => (
                  <article key={i} className="surface">
                    <span className="eyebrow">
                      {e.scenario.environment.model} / {e.scenario.difficulty}
                    </span>
                    <h2>{e.title}</h2>
                    <p>
                      {(e.scenario.frequencyHz / 1e6).toFixed(2)} MHz ·{" "}
                      {e.scenario.modeId}
                    </p>
                    {e.teacher && <p>Classroom challenge included.</p>}
                    <div className="lab-toolbar">
                      <button onClick={() => openExperiment(e)}>Open ↗</button>
                      <button onClick={() => exportFile(e)}>Export ↓</button>
                      <button
                        onClick={() => {
                          if (state.saved.length >= 50) {
                            setNotice(
                              "Notebook full. Remove an experiment from My Experiments to free a slot.",
                            );
                            return;
                          }
                          setState((s) => ({
                            ...s,
                            saved: [
                              {
                                ...structuredClone(e),
                                title: e.title.slice(0, 495) + " copy",
                              },
                              ...s.saved,
                            ].slice(0, 50),
                          }));
                        }}
                      >
                        Duplicate
                      </button>
                      <button
                        aria-label={`Remove ${e.title}`}
                        onClick={() => {
                          setRemoved({
                            experiment: structuredClone(e),
                            index: i,
                          });
                          setState((s) => ({
                            ...s,
                            saved: s.saved.filter((_, index) => index !== i),
                          }));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {page === "physics" && (
          <section className="physics-page">
            <div className="page-heading">
              <span className="eyebrow">
                SERIOUS NUMBERS. VISIBLE ASSUMPTIONS.
              </span>
              <h1>
                Trust the experiment.
                <br />
                <em>Inspect the model.</em>
              </h1>
              <p>
                BIG SIGNAL is a nonprofit, experimental learning laboratory. It
                teaches mechanisms, not operational coverage predictions.
              </p>
            </div>
            <div className="physics-grid">
              {[
                [
                  "Free space",
                  "Inverse-square spreading with explicit antenna gains and cable losses. Valid in the far field; reflections and buildings are absent.",
                ],
                [
                  "Earth and terrain",
                  "Effective Earth radius, radio horizon, and one knife-edge obstruction. Terrain geometry is bundled and schematic, not a real elevation map.",
                ],
                [
                  "HF skywave",
                  "A synthetic ionospheric shell with time, frequency, absorption, and limited hops. No live ionosonde or space-weather inputs. MUF is model-specific.",
                ],
                [
                  "Receivers and modes",
                  "Thermal noise, noise figure, bandwidth, and approximate mode thresholds. A signal can exist without carrying usable voice or data.",
                ],
                [
                  "Antenna workbench",
                  "Analytical preset patterns and supplied complex impedance. Custom wires are geometry only. No NEC solve, automatic resonance, or trustworthy gain is inferred from an arbitrary wire.",
                ],
                [
                  "Networks and batteries",
                  "Bidirectional links form a graph. Redundancy and energy are shown separately. Endurance assumes fixed state power, efficiency, and usable capacity.",
                ],
                [
                  "What is conceptual",
                  "Ground effects, AGC dynamics, intermodulation, fading, sporadic E, and several satellite effects need richer models. Lessons label concepts that are not numerically simulated.",
                ],
                [
                  "Physics and permission",
                  "A simulated link does not establish permission to transmit. Services and operator requirements depend on jurisdiction. Emergency scenarios do not grant blanket authorization.",
                ],
              ].map(([title, body]) => (
                <article className="surface" key={title}>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </article>
              ))}
            </div>
            <div className="surface">
              <h2>Why radio matters when infrastructure fails</h2>
              <p>
                A storm can damage power lines, fiber, and cellular sites at the
                same time. Direct radio can move local messages without an
                Internet provider or cellular core. HF can sometimes reach
                beyond the affected area. Neither replaces planning, compatible
                equipment, trained people, and a reliable source of energy.
              </p>
              <p>
                Read the{" "}
                <a
                  href="https://www.itu.int/en/ITU-R/information/Pages/emergency.aspx"
                  target="_blank"
                  rel="noreferrer"
                >
                  ITU guide to emergency radiocommunications ↗
                </a>{" "}
                and{" "}
                <a
                  href="https://www.itu.int/en/mediacentre/backgrounders/Pages/emergency-telecommunications.aspx"
                  target="_blank"
                  rel="noreferrer"
                >
                  emergency telecommunications planning ↗
                </a>
                .
              </p>
            </div>
          </section>
        )}
      </main>
      {page !== "tsunami" && (
        <TutorPanel context={tutorContext} onApplyContext={applyTutorContext} onWalkthrough={guideTour} narrationRequest={narrationRequest} onVoiceReady={setVoiceReady} />
      )}
      <footer className="product-footer">
        <span>
          B I G S I G N A L <small>SMALL PLANET. ENDLESS QUESTIONS.</small>
        </span>
        <span>Educational simulation · built for curious humans.</span>
      </footer>
    </div>
  );
}
export function ProductApp() {
  return (
    <ProductBoundary>
      <Product />
    </ProductBoundary>
  );
}
