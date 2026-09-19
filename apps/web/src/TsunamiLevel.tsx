import { useEffect, useMemo, useRef, useState } from "react";
import { hospitalDemoCopy as copy } from "../../../content/explanations/hospital-demo";
import { hospitalContent as history } from "../../../content/explanations/hospital";
import {
  hospitalNetworkNodes,
  hospitalNetworkLinks,
  hospitalNetworkCopy,
} from "../../../content/explanations/hospital-network";
import {
  assessHospitalContact,
  createHospitalOperatorScenario,
  type HospitalOperatorChannel,
  type HospitalOperatorPower,
  type HospitalContact,
} from "../../../packages/missions/tsunami";
import { simulateScenario } from "../../../packages/simulation/src";
import { HospitalNetworkScene } from "./HospitalNetworkScene";
import "./tsunami-level.css";

type RadioState =
  | { phase: "idle" }
  | { phase: "sending" | "received"; contact: HospitalContact }
  | { phase: "unheard"; contact: HospitalContact }
  | { phase: "unheard"; error: string };

export function TsunamiLevel({
  onExit,
  onOpenLesson,
}: {
  onExit?: () => void;
  onOpenLesson?: (id: string) => void;
}) {
  const [settings, setSettings] = useState<{
    channel: HospitalOperatorChannel;
    powerW: HospitalOperatorPower;
  }>({ channel: 7.055e6, powerW: 5 });
  const scenario = useMemo(
    () => createHospitalOperatorScenario(settings.channel, settings.powerW),
    [settings],
  );
  const [radio, setRadio] = useState<RadioState>({ phase: "idle" });
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contact = "contact" in radio ? radio.contact : undefined;
  const sending = radio.phase === "sending";

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function tune(channel: HospitalOperatorChannel) {
    if (timer.current !== null) return;
    setSettings((current) => ({ ...current, channel }));
    setRadio({ phase: "idle" });
  }
  function power(powerW: HospitalOperatorPower) {
    if (timer.current !== null) return;
    setSettings((current) => ({ ...current, powerW }));
    setRadio({ phase: "idle" });
  }
  function reset() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setSettings({ channel: 7.055e6, powerW: 5 });
    setRadio({ phase: "idle" });
  }
  function send() {
    if (timer.current !== null) return;
    try {
      const next = assessHospitalContact(scenario, simulateScenario(scenario));
      setRadio({ phase: "sending", contact: next });
      timer.current = setTimeout(() => {
        timer.current = null;
        setRadio(
          next.voiceReady
            ? { phase: "received", contact: next }
            : { phase: "unheard", contact: next },
        );
      }, 1200);
    } catch {
      setRadio({
        phase: "unheard",
        error:
          "The radio check could not finish. Reset the station and try again.",
      });
    }
  }

  return (
    <section
      className="tsunami-level hospital-level hospital-demo"
      aria-labelledby="hospital-title"
    >
      <header className="hospital-demo-heading">
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 id="hospital-title">{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <div className="hospital-demo-actions">
          {onExit && (
            <button type="button" onClick={onExit}>
              ← Back
            </button>
          )}
          <button type="button" onClick={reset} disabled={sending}>
            Start again
          </button>
        </div>
      </header>

      <div className="hospital-demo-workspace">
        <div className="hospital-demo-map">
          <HospitalNetworkScene
            demo
            band="HF"
            view="globe"
            graphics="NORMAL"
            scenario={scenario}
            paths={contact?.outward.propagationPaths ?? []}
            running={sending && !reducedMotion}
            voiceReady={contact?.voiceReady}
            nodes={hospitalNetworkNodes}
            routes={hospitalNetworkLinks}
            selectedRouteId="meulaboh-medan"
            onSelectRoute={() => undefined}
          />
        </div>
        <section
          className="hospital-operator"
          aria-labelledby="hospital-radio-title"
        >
          <div className="hospital-operator-header">
            <span className="eyebrow">YOU ARE THE RADIO OPERATOR</span>
            <h2 id="hospital-radio-title">A message home.</h2>
            <p>{copy.location}</p>
          </div>
          <div className="hospital-operator-message">
            <span>Practice message · fictional</span>
            <blockquote>{copy.message}</blockquote>
          </div>
          <fieldset className="hospital-operator-settings" disabled={sending}>
            <legend>Your radio</legend>
            <div
              className="hospital-operator-choice"
              role="group"
              aria-label="Reported HF channel"
            >
              <span>Channel</span>
              <div>
                {([7055000, 7060000] as const).map((frequencyHz) => (
                  <button
                    type="button"
                    key={frequencyHz}
                    aria-pressed={scenario.frequencyHz === frequencyHz}
                    onClick={() => tune(frequencyHz)}
                  >
                    {(frequencyHz / 1e6).toFixed(3)} <small>MHz</small>
                  </button>
                ))}
              </div>
            </div>
            <div
              className="hospital-operator-choice"
              role="group"
              aria-label="Transmit power"
            >
              <span>Power</span>
              <div>
                {([5, 50] as const).map((watts) => (
                  <button
                    type="button"
                    key={watts}
                    aria-pressed={settings.powerW === watts}
                    onClick={() => power(watts)}
                  >
                    {watts === 5 ? "Low" : "High"} <small>{watts} W</small>
                  </button>
                ))}
              </div>
            </div>
            <p className="hospital-operator-equipment">{copy.equipment}</p>
          </fieldset>
          <button
            type="button"
            className="hospital-send-message"
            disabled={sending}
            onClick={send}
          >
            {sending
              ? "Sending…"
              : radio.phase === "received"
                ? "Send again"
                : "Send the message"}
            <span aria-hidden="true">{sending ? "···" : "↗"}</span>
          </button>
          <div
            className={`hospital-operator-status hospital-operator-${radio.phase}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {radio.phase === "idle" && <p>{copy.waiting}</p>}
            {radio.phase === "sending" && <p>{copy.sending}</p>}
            {radio.phase === "received" && (
              <>
                <strong>{copy.received}</strong>
                <p>{copy.aftercare}</p>
              </>
            )}
            {radio.phase === "unheard" && (
              <>
                <strong>
                  {"error" in radio ? "Radio check interrupted." : copy.unheard}
                </strong>
                {"error" in radio && <p>{radio.error}</p>}
              </>
            )}
          </div>
        </section>
      </div>

      <details className="hospital-demo-details">
        <summary>The real story &amp; explore more</summary>
        <div className="hospital-demo-evidence">
          <article>
            <h2>For a family, a message changes everything.</h2>
            <p>{history.familyStory}</p>
            <p className="hospital-evidence-note">{history.familyLimit}</p>
            <h3>The equipment behind the message</h3>
            <p>{copy.equipment}</p>
            <p>{copy.assumptions}</p>
          </article>
          <article>
            <h3>What the historical sources show</h3>
            <ul className="hospital-demo-sources">
              {history.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title} ↗
                  </a>
                </li>
              ))}
            </ul>
            <ul className="hospital-demo-techniques">
              {hospitalNetworkCopy.techniques.map((technique) => (
                <li key={technique.title}>
                  <strong>{technique.title}</strong>
                  <p>
                    {technique.body}{" "}
                    <a href={technique.url} target="_blank" rel="noreferrer">
                      Source ↗
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </article>
        </div>
        {onOpenLesson && (
          <nav
            className="hospital-demo-lessons"
            aria-label="Explore the first learning levels"
          >
            {history.experiments.map((experiment) => (
              <button
                type="button"
                key={experiment.lessonId}
                onClick={() => onOpenLesson(experiment.lessonId)}
              >
                {experiment.title} ↗
              </button>
            ))}
          </nav>
        )}
      </details>
    </section>
  );
}
