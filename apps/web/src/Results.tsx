import { useState } from "react";
import type {
  CalculationNode,
  Scenario,
  SimulationResult,
} from "../../../packages/contracts";
import { unavailableHfExplanation } from "../../../content/explanations/unavailablePath";
import { explanations } from "../../../content/explanations";
import { metricHelp } from "../../../content/explanations/radio-guide";

export function MathNode({ node }: { node: CalculationNode }) {
  return (
    <details>
      <summary>
        {node.label}
        <b>
          {Number(node.value.toPrecision(5))} {node.unit}
        </b>
      </summary>
      {node.equation && <code>{node.equation}</code>}
      {node.assumptions?.map((x) => (
        <p key={x}>{x}</p>
      ))}
      {node.children?.map((x) => (
        <MathNode key={x.id} node={x} />
      ))}
    </details>
  );
}
export function CandidatePathDiagnostics({ result }: { result: SimulationResult }) {
  return (
    <section aria-label="Hypothetical candidate-path diagnostics">
      <h3>Hypothetical candidate-path diagnostics</h3>
      <p>No supported path reaches the receiver. These values assume the candidate path worked. They are not a received signal or usable link.</p>
      <dl>
        <dt>Candidate received power</dt><dd>{result.receivedPowerDbm.toFixed(1)} dBm</dd>
        <dt>Candidate SNR</dt><dd>{result.snrDb.toFixed(1)} dB</dd>
        <dt>Candidate link margin</dt><dd>{result.linkMarginDb.toFixed(1)} dB</dd>
      </dl>
      {result.calculations.map((node) => <MathNode key={node.id} node={node} />)}
    </section>
  );
}

function hfFailure(result: SimulationResult, scenario: Scenario) {
  if (result.propagationAvailable || !result.explanationKeys.includes("hf-above-muf")) return null;
  const nodes = result.calculations.flatMap(function flatten(node): CalculationNode[] {
    return [node, ...(node.children ?? []).flatMap(flatten)];
  });
  const value = (id: string) => nodes.find(node => node.id === id)?.value;
  return unavailableHfExplanation(scenario.frequencyHz, value("hf-muf"), value("hf-local-hour"), value("hf-critical-frequency"));
}

export function Results({
  result,
  scenario,
}: {
  result: SimulationResult | null;
  scenario: Scenario;
}) {
  const [tab, setTab] = useState<"WHY" | "MATH" | "TRY">("WHY");
  const hfExplanation = result ? hfFailure(result, scenario) : null;
  return (
    <section className="lab-results" aria-label="Simulation results">
      <div className="result-tabs">
        {(["WHY", "MATH", "TRY"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === "TRY" ? "What can I change?" : t === "WHY" ? "WHY · What happened" : "MATH · See the evidence"}
          </button>
        ))}
      </div>
      {!result ? (
        <div className="result-empty">
          <span>↗</span>
          <h3>Your experiment starts with a guess.</h3>
          <p>
            Predict, press SEND IT, then inspect what happened. Suggestions
            appear after your first attempt.
          </p>
        </div>
      ) : (
        <>
          <div className={`outcome outcome-${result.success}`} role="status">
            <b>
              {result.success === "good"
                ? "SIGNAL MADE IT"
                : result.success === "marginal"
                  ? "WEAK CONNECTION"
                  : "NO CLEAR CONNECTION"}
            </b>
            <span>
              {result.propagationAvailable
                ? "A modeled path reaches the receiver."
                : "No supported path reaches the receiver. Any numeric budget is hypothetical."}
            </span>
          </div>
          <div className="metric-grid">
            {[
              ["Received", result.propagationAvailable ? result.receivedPowerDbm : null, "dBm", metricHelp.received],
              ["Noise floor", result.noiseFloorDbm, "dBm", metricHelp.noise],
              ["SNR", result.propagationAvailable ? result.snrDb : null, "dB", metricHelp.snr],
              ["Link margin", result.propagationAvailable ? result.linkMarginDb : null, "dB", metricHelp.margin],
            ].map(([label, value, unit, help]) => (
              <div key={label}>
                <span>{label}</span>
                <b className={value === null ? "metric-unavailable" : undefined}>
                  {value === null ? "Unavailable" : Number(value).toFixed(1)}
                  <small>{value === null ? "No modeled path" : ` ${unit}`}</small>
                </b>
                <small className="metric-explanation">{help}</small>
              </div>
            ))}
          </div>
          {hfExplanation && <p className="route-warning">{hfExplanation}</p>}
          {result.explanationKeys.includes("hf-above-muf") && (
            <p className="sky-refusal">
              THE IONOSPHERE HAS DECLINED YOUR REQUEST.
            </p>
          )}
          <div className="result-body">
            {tab === "WHY" ? (
              <>
                {result.explanationKeys.map((key) => (
                  <p key={key}>
                    {explanations[key]?.[scenario.difficulty] ??
                      explanations[key]?.beginner ??
                      key.replaceAll("-", " ")}
                  </p>
                ))}
                <div className="assumption-note">
                  Confidence {result.confidence.level}.{" "}
                  {result.confidence.reasons.join(" ")} Values describe the
                  configured educational model, not a field measurement.
                </div>
              </>
            ) : tab === "MATH" ? (
              <>
                <p>
                  Every result below comes from the simulation engine. Expand a
                  calculation to inspect its equation, inputs, units, and
                  assumptions.
                </p>
                {result.propagationAvailable ? result.calculations.map((n) => (
                  <MathNode key={n.id} node={n} />
                )) : <CandidatePathDiagnostics result={result} />}
              </>
            ) : (
              <>
                <p>
                  These estimates come from changing one input and rerunning the
                  model. Improvements may interact; do not add them blindly.
                </p>
                {result.limitingFactors.length ? (
                  result.limitingFactors.map((f, i) => (
                    <article className="suggestion" key={f.id}>
                      <span>{i + 1}</span>
                      <div>
                        <b>{f.label}</b>
                        <p>
                          {explanations[f.explanationKey]?.[
                            scenario.difficulty
                          ] ?? explanations[f.explanationKey]?.beginner}
                        </p>
                      </div>
                      <strong>
                        {f.possibleImprovementDb > 0
                          ? `+${f.possibleImprovementDb.toFixed(1)} dB`
                          : "Restore path"}
                      </strong>
                    </article>
                  ))
                ) : (
                  <p>
                    No modeled single-control improvement was found. Review the
                    assumptions and communication requirements.
                  </p>
                )}
              </>
            )}
            <details className="model-warnings">
              <summary>
                Model limits and warnings ({result.warnings.length})
              </summary>
              {result.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </details>
          </div>
        </>
      )}
    </section>
  );
}
