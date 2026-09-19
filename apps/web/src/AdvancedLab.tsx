import { useEffect, useMemo, useRef, useState } from "react";
import type { Scenario } from "../../../packages/contracts";
import {
  analyzeImpedance,
  analyzeReceiver,
  antennaDimensions,
  analyticalPatternPoints,
  estimateFeedline,
  type ImpedanceInput,
} from "../../../packages/simulation/src/laboratory";
import { simulateScenario } from "../../../packages/simulation/src";
import {
  AntennaView,
  RadiationView,
} from "../../../packages/visualization/AntennaView";
import {
  INITIAL_WIRE,
  parseWireGeometry,
  parseWireGeometryFile,
  decodeWireGeometryFile,
  type WireGeometry,
} from "../../../packages/visualization/wireGeometry";
import "./laboratory-panels.css";

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1e6,
  step = 1,
  note,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  note?: string;
}) {
  return (
    <label className="dl-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next))
            onChange(Math.min(max, Math.max(min, next)));
        }}
      />
      {note && <small>{note}</small>}
    </label>
  );
}
const initialWire = INITIAL_WIRE;
type WireState = WireGeometry;
function loadWire(): WireState {
  try {
    return parseWireGeometry(
      JSON.parse(localStorage.getItem("bigsignal.wire.v1") || "null"),
    );
  } catch {
    return structuredClone(initialWire);
  }
}
const fmt = (n: number | null, suffix = "") =>
  n === null ? "∞" : `${n.toFixed(2)}${suffix}`;

export function AdvancedLab({
  scenario,
  onChange,
}: {
  scenario: Scenario;
  onChange: (scenario: Scenario) => void;
}) {
  const [tab, setTab] = useState<"antenna" | "receiver" | "wire">("antenna");
  const [impedance, setImpedance] = useState<ImpedanceInput>({
    resistanceOhm: 50,
    reactanceOhm: 0,
    referenceOhm: 50,
    radiationResistanceOhm: 45,
  });
  const [pattern, setPattern] =
    useState<Scenario["transmitter"]["antenna"]["type"]>("dipole");
  const patternPoints = useMemo(
    () => analyticalPatternPoints(pattern),
    [pattern],
  );
  const [gain, setGain] = useState(20);
  const [noiseFigure, setNoiseFigure] = useState(0);
  const [clip, setClip] = useState(-10);
  const [blockerEnabled, setBlockerEnabled] = useState(false);
  const [blocker, setBlocker] = useState(-35);
  const [cableLength, setCableLength] = useState(20);
  const [cableLoss, setCableLoss] = useState(12);
  const [wire, setWire] = useState(loadWire);
  const [wireReferenceHz, setWireReferenceHz] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("bigsignal.wire.v1") || "null",
      );
      return typeof saved?.frequencyHz === "number" &&
        saved.frequencyHz >= 1e5 &&
        saved.frequencyHz <= 1e11
        ? saved.frequencyHz
        : scenario.frequencyHz;
    } catch {
      return scenario.frequencyHz;
    }
  });
  const [beforeImport, setBeforeImport] = useState<{
    wire: WireState;
    frequencyHz: number;
  } | null>(null);
  const wireFileInput = useRef<HTMLInputElement>(null);
  const [from, setFrom] = useState(wire.points[0].id);
  const [to, setTo] = useState(wire.points[wire.points.length - 1].id);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(
        "bigsignal.wire.v1",
        JSON.stringify({ ...wire, frequencyHz: wireReferenceHz }),
      );
    } catch {
      /* Private browsing can disable persistence. */
    }
  }, [wire, wireReferenceHz]);
  const analysis = useMemo(() => {
    try {
      const dimensions = antennaDimensions(scenario.frequencyHz);
      const match = analyzeImpedance(impedance);
      const cable = estimateFeedline({
        lengthM: cableLength,
        frequencyHz: scenario.frequencyHz,
        lossDbPer100MAt100MHz: cableLoss,
      });
      const result = simulateScenario(scenario);
      const receiver = analyzeReceiver({
        signalDbm: result.receivedPowerDbm,
        noiseDbm: result.noiseFloorDbm,
        gainDb: gain,
        noiseFigureDb: noiseFigure,
        bandwidthHz: scenario.receiver.bandwidthHz,
        outputClipDbm: clip,
        ...(blockerEnabled ? { blockerDbm: blocker } : {}),
      });
      return { dimensions, match, cable, result, receiver };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Check the lab inputs.",
      };
    }
  }, [
    scenario,
    impedance,
    cableLength,
    cableLoss,
    gain,
    noiseFigure,
    clip,
    blockerEnabled,
    blocker,
  ]);
  if ("error" in analysis)
    return (
      <section className="al-workspace">
        <p className="dl-error" role="status">
          This setup is outside the ordinary-universe diagnostic model.{" "}
          {analysis.error} Adjust the lab inputs to inspect the workbench.
        </p>
      </section>
    );
  const { dimensions, match, cable, result, receiver } = analysis;
  function updateImpedance(key: keyof ImpedanceInput, value: number) {
    setImpedance((current) => {
      const next = { ...current, [key]: value };
      next.radiationResistanceOhm = Math.min(
        next.radiationResistanceOhm,
        next.resistanceOhm,
      );
      return next;
    });
  }
  function addPoint() {
    let index = 1;
    while (wire.points.some((point) => point.id === `P${index}`)) index += 1;
    const id = `P${index}`;
    setWire({ ...wire, points: [...wire.points, { id, x: 0, y: 1, z: 1 }] });
    setTo(id);
  }
  function removePoint(id: string) {
    const segments = wire.segments.filter((s) => s.from !== id && s.to !== id);
    const points = wire.points.filter((p) => p.id !== id);
    setWire({
      ...wire,
      points,
      segments,
      feedpoint: segments.some((s) => s.id === wire.feedpoint)
        ? wire.feedpoint
        : (segments[0]?.id ?? ""),
    });
    setFrom(points[0].id);
    setTo(points[1].id);
  }
  function addWire() {
    if (
      !wire.points.some((p) => p.id === from) ||
      !wire.points.some((p) => p.id === to) ||
      from === to ||
      wire.segments.some(
        (s) =>
          (s.from === from && s.to === to) || (s.from === to && s.to === from),
      )
    ) {
      setNotice("Choose two different points that are not already connected.");
      return;
    }
    let index = 1;
    while (wire.segments.some((segment) => segment.id === `W${index}`))
      index += 1;
    const id = `W${index}`;
    setWire({
      ...wire,
      segments: [...wire.segments, { id, from, to }],
      feedpoint: wire.feedpoint || id,
    });
    setNotice("Wire segment added. Geometry is saved on this device.");
  }
  function download() {
    try {
      const file = parseWireGeometryFile({
        format: "bigsignal-wire",
        schemaVersion: 1,
        frequencyHz: wireReferenceHz,
        ...wire,
        model: "geometry-only-no-nec-solve",
      });
      const blob = new Blob([JSON.stringify(file, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-antenna.bigsignal-wire.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Wire geometry exported. It contains no solved gain or impedance.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Check the geometry before exporting.",
      );
    }
  }
  async function importWire(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1_000_000)
        throw new Error("Wire files must be smaller than 1 MB.");
      const imported = decodeWireGeometryFile(await file.text());
      const geometry = parseWireGeometry(imported);
      setBeforeImport({
        wire: structuredClone(wire),
        frequencyHz: wireReferenceHz,
      });
      setWire(geometry);
      setWireReferenceHz(imported.frequencyHz);
      setFrom(geometry.points[0].id);
      setTo(geometry.points[geometry.points.length - 1].id);
      setNotice(
        `Imported ${geometry.points.length} points and ${geometry.segments.length} wires. Reference frequency ${(imported.frequencyHz / 1e6).toFixed(3)} MHz. The lab link is unchanged; use Undo import to restore your previous drawing.`,
      );
    } catch (error) {
      setNotice(
        `Import failed. ${error instanceof Error ? error.message : "Choose a valid wire geometry file."} Your current drawing is unchanged.`,
      );
    }
    if (wireFileInput.current) wireFileInput.current.value = "";
  }
  return (
    <section className="al-workspace" aria-label="Advanced radio workbench">
      <div className="dl-kicker">OPEN THE EQUIPMENT</div>
      <h2>Under the radio’s hood</h2>
      <p className="dl-muted">
        Inspect a matched antenna, hear what gain actually buys you, or build a
        wonderfully strange wire. These instruments use ordinary-universe
        physics, even when the main lab uses fantasy settings. Each experiment
        names what it models.
      </p>
      <div className="al-tabs" role="group" aria-label="Advanced experiment">
        <button
          aria-pressed={tab === "antenna"}
          onClick={() => setTab("antenna")}
        >
          Antenna & cable
        </button>
        <button
          aria-pressed={tab === "receiver"}
          onClick={() => setTab("receiver")}
        >
          Receiver & overload
        </button>
        <button aria-pressed={tab === "wire"} onClick={() => setTab("wire")}>
          Custom wire editor
        </button>
      </div>
      {tab === "antenna" && (
        <div className="al-layout">
          <div className="dl-panel">
            <div className="dl-panel-head">
              <h3>Impedance is a complex relationship.</h3>
              <span className="dl-kicker">CALCULATED</span>
            </div>
            <div className="dl-panel-body">
              <p className="dl-muted">
                Resistance accepts power. Reactance stores and returns energy.
                An antenna can be resonant with zero reactance and still be
                poorly matched to its feedline.
              </p>
              <div className="dl-field-grid">
                <NumberField
                  label="Load resistance · Ω"
                  value={impedance.resistanceOhm}
                  onChange={(v) => updateImpedance("resistanceOhm", v)}
                  max={10000}
                />
                <NumberField
                  label="Load reactance · Ω"
                  value={impedance.reactanceOhm}
                  onChange={(v) => updateImpedance("reactanceOhm", v)}
                  min={-10000}
                  max={10000}
                />
                <NumberField
                  label="Line reference · Ω"
                  value={impedance.referenceOhm}
                  onChange={(v) => updateImpedance("referenceOhm", v)}
                  min={1}
                  max={1000}
                />
                <NumberField
                  label="Radiation resistance · Ω"
                  value={impedance.radiationResistanceOhm}
                  onChange={(v) => updateImpedance("radiationResistanceOhm", v)}
                  max={impedance.resistanceOhm}
                />
              </div>
              <div className="dl-toolbar">
                <button
                  onClick={() =>
                    setImpedance({
                      resistanceOhm: 50,
                      reactanceOhm: 0,
                      referenceOhm: 50,
                      radiationResistanceOhm: 45,
                    })
                  }
                >
                  Matched radiator
                </button>
                <button
                  onClick={() =>
                    setImpedance({
                      resistanceOhm: 50,
                      reactanceOhm: 0,
                      referenceOhm: 50,
                      radiationResistanceOhm: 1,
                    })
                  }
                >
                  Sneaky dummy load
                </button>
                <button
                  onClick={() =>
                    setImpedance({
                      resistanceOhm: 25,
                      reactanceOhm: 80,
                      referenceOhm: 50,
                      radiationResistanceOhm: 20,
                    })
                  }
                >
                  Reactive antenna
                </button>
              </div>
              <div className="dl-metrics">
                <div className="dl-metric">
                  <small>SWR</small>
                  <strong>{fmt(match.swr)}:1</strong>
                </div>
                <div className="dl-metric">
                  <small>Return loss</small>
                  <strong>{fmt(match.returnLossDb)}</strong>
                  <span>dB</span>
                </div>
                <div className="dl-metric">
                  <small>Mismatch loss</small>
                  <strong>{fmt(match.mismatchLossDb)}</strong>
                  <span>dB</span>
                </div>
                <div className="dl-metric">
                  <small>Efficiency</small>
                  <strong>
                    {(match.radiationEfficiency * 100).toFixed(0)}%
                  </strong>
                  <span>of accepted power radiated</span>
                </div>
              </div>
              <div className="dl-callout">
                {match.radiationEfficiency < 0.2
                  ? "Perfect SWR can hide a terrible antenna. A resistor can accept power beautifully and turn it into heat."
                  : `${(match.reflectedPowerFraction * 100).toFixed(1)}% of incident power is reflected. SWR describes the match; radiation efficiency describes what happens to accepted power.`}
              </div>
              <div className="al-equation">
                Γ = (Zload − Z₀) / (Zload + Z₀)
                <br />
                SWR = (1 + |Γ|) / (1 − |Γ|)
                <br />η = Rradiation / Rtotal
                <br />Γ = {match.reflectionReal.toFixed(3)}{" "}
                {match.reflectionImaginary >= 0 ? "+" : "−"} j
                {Math.abs(match.reflectionImaginary).toFixed(3)}
              </div>
              <svg
                viewBox="0 0 300 220"
                role="img"
                aria-label={`Reflection coefficient plane. Real ${match.reflectionReal.toFixed(3)}, imaginary ${match.reflectionImaginary.toFixed(3)}. Center is a perfect match.`}
                style={{ width: "100%", maxHeight: 230, marginTop: 15 }}
              >
                <circle
                  cx="140"
                  cy="105"
                  r="85"
                  fill="#101a12"
                  stroke="#46583b"
                />
                <path
                  d="M45 105H240 M140 10V200"
                  stroke="#46583b"
                  strokeDasharray="3 4"
                />
                <circle
                  cx={140 + match.reflectionReal * 85}
                  cy={105 - match.reflectionImaginary * 85}
                  r="6"
                  fill="#d1f888"
                />
                <circle cx="140" cy="105" r="3" fill="#ffbc72" />
                <text x="242" y="109" fill="#aabd9e" fontSize="10">
                  Re Γ
                </text>
                <text x="147" y="15" fill="#aabd9e" fontSize="10">
                  Im Γ
                </text>
                <text
                  x="140"
                  y="215"
                  textAnchor="middle"
                  fill="#aabd9e"
                  fontSize="10"
                >
                  Reflection coefficient plane · center = matched
                </text>
              </svg>
              <p className="dl-muted">
                This complex reflection plane introduces the coordinates behind
                a Smith chart. It omits the chart’s constant resistance and
                reactance grid. Distance from the center is |Γ|; points on the
                rim reflect all incident power.
              </p>
              <details className="dl-details">
                <summary>Assumptions & calculated values</summary>
                {match.assumptions.map((a) => (
                  <p key={a}>{a}</p>
                ))}
                {match.calculations.map((c) => (
                  <p key={c.id}>
                    {c.label}: {c.value.toFixed(3)} {c.unit}
                  </p>
                ))}
              </details>
            </div>
          </div>
          <div>
            <div className="dl-panel">
              <div className="dl-panel-head">
                <h3>Where the energy goes</h3>
                <span className="dl-kicker">SCHEMATIC PATTERN</span>
              </div>
              <div className="dl-panel-body">
                <label className="dl-field">
                  <span>Illustrative antenna family</span>
                  <select
                    value={pattern}
                    onChange={(e) =>
                      setPattern(e.target.value as typeof pattern)
                    }
                  >
                    <option value="vertical">Vertical</option>
                    <option value="dipole">Dipole</option>
                    <option value="yagi">Yagi</option>
                    <option value="dish">Dish</option>
                  </select>
                </label>
                <div className="al-view">
                  <RadiationView points={patternPoints} />
                </div>
                <p className="al-view-caption">
                  Drag to orbit the normalized 3D shape. The vertical and dipole
                  sketches have a broadside doughnut; directional presets
                  concentrate forward. These analytical teaching shapes omit
                  real side lobes, ground, and element geometry. They do not
                  calculate gain for your custom wire or change the lab link.
                </p>
              </div>
            </div>
            <div className="dl-panel dl-section-gap">
              <div className="dl-panel-head">
                <h3>Give the wave some room.</h3>
              </div>
              <div className="dl-panel-body">
                <p className="dl-muted">
                  At {(scenario.frequencyHz / 1e6).toFixed(3)} MHz, these are
                  useful dimension estimates. Nearby roofs and railings still
                  get a vote.
                </p>
                <div className="dl-metrics">
                  <div className="dl-metric">
                    <small>Wavelength</small>
                    <strong>{dimensions.wavelengthM.toFixed(3)}</strong>
                    <span>metres</span>
                  </div>
                  <div className="dl-metric">
                    <small>Quarter wave</small>
                    <strong>{dimensions.quarterWaveM.toFixed(3)}</strong>
                    <span>metres</span>
                  </div>
                  <div className="dl-metric">
                    <small>Half wave</small>
                    <strong>{dimensions.halfWaveM.toFixed(3)}</strong>
                    <span>metres</span>
                  </div>
                  <div className="dl-metric">
                    <small>Dipole estimate</small>
                    <strong>{dimensions.practicalDipoleM.toFixed(3)}</strong>
                    <span>metres, including shortening</span>
                  </div>
                </div>
                <p className="dl-muted">{dimensions.assumptions[1]}</p>
              </div>
            </div>
            <div className="dl-panel dl-section-gap">
              <div className="dl-panel-head">
                <h3>Sad spaghetti coax</h3>
                <span className="dl-kicker">APPROXIMATION</span>
              </div>
              <div className="dl-panel-body">
                <div className="dl-field-grid">
                  <NumberField
                    label="Cable length · m"
                    value={cableLength}
                    onChange={setCableLength}
                    max={1000}
                  />
                  <NumberField
                    label="Loss / 100 m at 100 MHz · dB"
                    value={cableLoss}
                    onChange={setCableLoss}
                    max={100}
                    step={0.1}
                  />
                </div>
                <div className="al-number">{cable.lossDb.toFixed(2)} dB</div>
                <p className="dl-muted">
                  {(cable.deliveredPowerFraction * 100).toFixed(1)}% of
                  transmitter power reaches the antenna through this matched
                  cable.
                </p>
                <button
                  disabled={cable.lossDb > 200}
                  onClick={() => {
                    const next = structuredClone(scenario);
                    next.transmitter.feedline = {
                      lengthM: cableLength,
                      lossDb: cable.lossDb,
                    };
                    onChange(next);
                    setNotice(
                      "Cable estimate applied to the transmitter. SEND IT again to compare.",
                    );
                  }}
                >
                  Apply cable to lab transmitter
                </button>
                {cable.lossDb > 200 && (
                  <p className="dl-error">
                    This cable exceeds the link simulator’s 200 dB feedline
                    limit. Reduce length or attenuation before applying it.
                  </p>
                )}
                <p className="dl-muted">
                  {cable.assumptions[0]} {cable.assumptions[2]}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === "receiver" && (
        <div className="al-layout">
          <div className="dl-panel">
            <div className="dl-panel-head">
              <h3>You made the noise louder too.</h3>
            </div>
            <div className="dl-panel-body">
              <p className="dl-muted">
                This amplifier sits after the lab’s modeled receiver input.
                Start with an ideal, zero-noise-figure stage. Raise its gain and
                compare input and output SNR.
              </p>
              <label className="dl-field">
                <span>
                  Additional gain <b>{gain} dB</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                />
              </label>
              <div className="dl-field-grid">
                <NumberField
                  label="Stage noise figure · dB"
                  value={noiseFigure}
                  onChange={setNoiseFigure}
                  max={30}
                  step={0.1}
                />
                <NumberField
                  label="Output overload threshold · dBm"
                  value={clip}
                  onChange={setClip}
                  min={-100}
                  max={30}
                />
              </div>
              <label className="dl-check">
                <input
                  type="checkbox"
                  checked={blockerEnabled}
                  onChange={(e) => setBlockerEnabled(e.target.checked)}
                />
                Add a nearby strong interfering signal
              </label>
              {blockerEnabled && (
                <NumberField
                  label="Blocker at input · dBm"
                  value={blocker}
                  onChange={setBlocker}
                  min={-150}
                  max={0}
                />
              )}
              <div
                className={`dl-callout ${receiver.clipping ? "dl-amber" : ""}`}
              >
                {receiver.clipping
                  ? "TOO MUCH OF A BIG SIGNAL. Total output exceeds the chosen threshold. Linear SNR below is now hypothetical; this model does not synthesize the distorted waveform."
                  : "Gain increases the signal and existing noise together. An amplifier can help later stages detect a level, but it cannot restore SNR that was already lost."}
              </div>
              {!result.propagationAvailable && (
                <p className="dl-error">
                  The current lab has no supported propagation path. The
                  amplifier inputs are hypothetical link-budget values.
                </p>
              )}
            </div>
          </div>
          <div className="dl-panel">
            <div className="dl-panel-head">
              <h3>Before / after amplification</h3>
              <span
                className={`dl-status ${receiver.clipping ? "failed" : ""}`}
              >
                {receiver.clipping ? "OVERLOAD" : "LINEAR"}
              </span>
            </div>
            <div className="dl-panel-body">
              <div className="al-spectrum">
                {[
                  {
                    label: "Signal",
                    input: result.receivedPowerDbm,
                    output: receiver.outputSignalDbm,
                  },
                  {
                    label: "Noise",
                    input: result.noiseFloorDbm,
                    output: receiver.outputNoiseDbm,
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="dl-muted">
                      {row.label} · input {row.input.toFixed(1)} dBm
                    </p>
                    <div className="al-spectrum-row">
                      <span>Output</span>
                      <div className="al-spectrum-track">
                        <i
                          style={{
                            width: `${Math.max(1, Math.min(100, (row.output + 160) / 1.8))}%`,
                            background:
                              row.label === "Noise" ? "#ffbc72" : undefined,
                          }}
                        />
                      </div>
                      <strong>{row.output.toFixed(1)} dBm</strong>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dl-metrics">
                <div className="dl-metric">
                  <small>Input SNR</small>
                  <strong>{receiver.inputSnrDb.toFixed(1)}</strong>
                  <span>dB</span>
                </div>
                <div className="dl-metric">
                  <small>Output SNR</small>
                  <strong>{receiver.outputSnrDb.toFixed(1)}</strong>
                  <span>dB {receiver.clipping && "· hypothetical"}</span>
                </div>
                <div className="dl-metric">
                  <small>Total output</small>
                  <strong>{receiver.outputTotalDbm.toFixed(1)}</strong>
                  <span>dBm, including blocker</span>
                </div>
                <div className="dl-metric">
                  <small>Headroom</small>
                  <strong>{receiver.headroomDb.toFixed(1)}</strong>
                  <span>dB to overload</span>
                </div>
              </div>
              <details className="dl-details">
                <summary>What this receiver model includes</summary>
                {receiver.assumptions.map((a) => (
                  <p key={a}>{a}</p>
                ))}
                {receiver.calculations.map((c) => (
                  <p key={c.id}>
                    {c.label}: {c.value.toFixed(2)} {c.unit}
                    <br />
                    <code>{c.equation}</code>
                  </p>
                ))}
              </details>
            </div>
          </div>
        </div>
      )}
      {tab === "wire" && (
        <>
          <div className="dl-callout dl-amber">
            <strong>GEOMETRY EDITOR. NO NEC SOLVE.</strong> This is a wire
            drawing with editable physical dimensions. Shape, conductor
            diameter, feedpoint, and orientation are saved, but they do not
            produce a solved impedance or radiation pattern. The analytical
            calculators above use separately supplied inputs.
          </div>
          <div className="al-layout">
            <div>
              <div className="al-view">
                <AntennaView {...wire} />
              </div>
              <p className="al-view-caption">
                Drag to orbit. Scroll to zoom. The orange wire contains the
                selected feedpoint at its center. Positions are in metres
                relative to the base height. Visual scale adjusts to keep the
                antenna in view.
              </p>
              <div className="dl-field-grid">
                <NumberField
                  label="Base height · m"
                  value={wire.heightM}
                  onChange={(v) => setWire({ ...wire, heightM: v })}
                  max={1000}
                  step={0.1}
                />
                <NumberField
                  label="Orientation · degrees"
                  value={wire.orientationDeg}
                  onChange={(v) => setWire({ ...wire, orientationDeg: v })}
                  min={-180}
                  max={180}
                />
                <NumberField
                  label="Conductor diameter · mm"
                  value={wire.diameterMm}
                  onChange={(v) => setWire({ ...wire, diameterMm: v })}
                  min={0.1}
                  max={100}
                  step={0.1}
                />
                <label className="dl-field">
                  <span>Feedpoint segment</span>
                  <select
                    value={wire.feedpoint}
                    onChange={(e) =>
                      setWire({ ...wire, feedpoint: e.target.value })
                    }
                  >
                    {wire.segments.length === 0 && (
                      <option value="">Add a wire first</option>
                    )}
                    {wire.segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} · {s.from} → {s.to}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="dl-muted">
                Drawing reference frequency {(wireReferenceHz / 1e6).toFixed(3)}{" "}
                MHz. Portable format <code>.bigsignal-wire.json</code>.
              </p>
              <input
                ref={wireFileInput}
                className="file-input"
                type="file"
                accept=".json,.bigsignal-wire.json,application/json"
                aria-label="Import wire geometry file"
                onChange={(event) => void importWire(event.target.files?.[0])}
              />
              <div className="dl-toolbar">
                <button onClick={download}>Export wire geometry</button>
                <button onClick={() => wireFileInput.current?.click()}>
                  Import wire geometry
                </button>
                {beforeImport && (
                  <button
                    onClick={() => {
                      setWire(beforeImport.wire);
                      setWireReferenceHz(beforeImport.frequencyHz);
                      setFrom(beforeImport.wire.points[0].id);
                      setTo(
                        beforeImport.wire.points[
                          beforeImport.wire.points.length - 1
                        ].id,
                      );
                      setBeforeImport(null);
                      setNotice("Restored the drawing from before the import.");
                    }}
                  >
                    Undo import
                  </button>
                )}
                <button
                  onClick={() => {
                    setWire(structuredClone(initialWire));
                    setWireReferenceHz(scenario.frequencyHz);
                    setFrom("P1");
                    setTo("P3");
                    setNotice("Restored the three-point starter wire.");
                  }}
                >
                  Reset wire
                </button>
                <button
                  onClick={() => {
                    const length = dimensions.practicalDipoleM / 2;
                    setWireReferenceHz(scenario.frequencyHz);
                    setWire({
                      ...structuredClone(initialWire),
                      points: [
                        { id: "P1", x: -length, y: 0, z: 0 },
                        { id: "P2", x: 0, y: 0, z: 0 },
                        { id: "P3", x: length, y: 0, z: 0 },
                      ],
                    });
                    setFrom("P1");
                    setTo("P3");
                    setNotice(
                      "Sized the starter wire to the approximate dipole length at this lab frequency.",
                    );
                  }}
                >
                  Size to this frequency
                </button>
              </div>
            </div>
            <div className="dl-panel">
              <div className="dl-panel-head">
                <h3>Your improbable antenna</h3>
                <button disabled={wire.points.length >= 24} onClick={addPoint}>
                  + Add point
                </button>
              </div>
              <div className="dl-panel-body">
                <div className="al-points">
                  {wire.points.map((p) => (
                    <div className="al-point" key={p.id}>
                      <header>
                        <strong>{p.id}</strong>
                        <button
                          disabled={wire.points.length <= 2}
                          onClick={() => removePoint(p.id)}
                        >
                          Remove {p.id}
                        </button>
                      </header>
                      <div className="dl-field-grid">
                        {(["x", "y", "z"] as const).map((axis) => (
                          <NumberField
                            key={axis}
                            label={`${axis.toUpperCase()} · m`}
                            value={p[axis]}
                            onChange={(v) =>
                              setWire({
                                ...wire,
                                points: wire.points.map((point) =>
                                  point.id === p.id
                                    ? { ...point, [axis]: v }
                                    : point,
                                ),
                              })
                            }
                            min={axis === "y" ? -wire.heightM : -1000}
                            max={1000}
                            step={0.1}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="dl-field-grid dl-section-gap">
                  {[
                    { label: "Wire from", value: from, update: setFrom },
                    { label: "Wire to", value: to, update: setTo },
                  ].map((field) => (
                    <label className="dl-field" key={field.label}>
                      <span>{field.label}</span>
                      <select
                        value={field.value}
                        onChange={(e) => field.update(e.target.value)}
                      >
                        {wire.points.map((p) => (
                          <option key={p.id}>{p.id}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <button onClick={addWire} disabled={wire.segments.length >= 48}>
                  + Connect points
                </button>
                <div className="dl-station-tabs dl-section-gap">
                  {wire.segments.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        const segments = wire.segments.filter(
                          (other) => other.id !== s.id,
                        );
                        setWire({
                          ...wire,
                          segments,
                          feedpoint:
                            wire.feedpoint === s.id
                              ? (segments[0]?.id ?? "")
                              : wire.feedpoint,
                        });
                      }}
                      aria-label={`Remove wire ${s.id}`}
                    >
                      {s.id} · {s.from}–{s.to} ×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {notice && (
        <p className="dl-callout" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
