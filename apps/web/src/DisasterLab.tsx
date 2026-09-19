import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Scenario } from "../../../packages/contracts";
import {
  createDisasterNetwork,
  simulateNetwork,
  type DisasterPresetId,
  type NetworkScenario,
  type NetworkNode,
  type NetworkResult,
  type NetworkLink,
  type CommunicationRequirement,
} from "../../../packages/simulation/src/network";
import { MODE_PROFILES } from "../../../packages/simulation/src/modes";
import { dbmToWatts, wattsToDbm } from "../../../packages/units/src";
import {
  disasters,
  radioResilienceIntroduction,
  disasterSafetyNote,
} from "../../../content/disasters";
import { NetworkView } from "../../../packages/visualization/NetworkView";
import "./laboratory-panels.css";
import "./disaster-focus.css";

interface DisasterState {
  preset: DisasterPresetId;
  network: NetworkScenario;
}
function createState(preset: DisasterPresetId): DisasterState {
  const network = createDisasterNetwork(preset);
  if (preset === "hill-relay") {
    network.nodes = network.nodes.filter((n) => n.id !== "shelter");
    network.links = network.links.filter(
      (l) => l.from !== "shelter" && l.to !== "shelter",
    );
  }
  if (preset === "emergency-network")
    network.nodes[network.nodes.length - 1].position.longitudeDeg = 0.22;
  return { preset, network };
}
function loadState(): DisasterState {
  try {
    const data = JSON.parse(
      localStorage.getItem("bigsignal.disaster.v1") || "null",
    ) as DisasterState;
    if (!data || !disasters.some((d) => d.id === data.preset))
      return createState("internet-gone");
    simulateNetwork(data.network);
    return data;
  } catch {
    return createState("internet-gone");
  }
}
function Field({
  label,
  value,
  onChange,
  min = 0,
  max = 1e6,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="dl-field">
      <span>{label}</span>
      <input
        type="number"
        value={Number(value.toFixed(6))}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = e.currentTarget.valueAsNumber;
          if (Number.isFinite(next))
            onChange(Math.max(min, Math.min(max, next)));
        }}
      />
    </label>
  );
}
const runtime = (hours: number | null) =>
  hours === null
    ? "No draw"
    : `${Math.floor(Math.round(hours * 60) / 60)}h ${Math.round(hours * 60) % 60}m`;
const requirements: { value: CommunicationRequirement; label: string }[] = [
  { value: "status", label: "Short status report" },
  { value: "text", label: "Text · operator Morse" },
  { value: "voice", label: "Voice conversation" },
  { value: "image", label: "Image · waveform not implemented" },
  { value: "video", label: "Live video · waveform not implemented" },
];
function linkScenario(network: NetworkScenario, link: NetworkLink): Scenario {
  const tx = network.nodes.find((n) => n.id === link.from)!;
  const rx = network.nodes.find((n) => n.id === link.to)!;
  return {
    schemaVersion: 1,
    id: link.id,
    title: `${tx.label} to ${rx.label}`,
    difficulty: "advanced",
    frequencyHz: link.frequencyHz,
    modeId: link.modeId,
    transmitter: {
      position: tx.position,
      powerDbm: tx.powerDbm,
      antenna: tx.antenna,
      feedline: tx.feedline,
    },
    receiver: {
      position: rx.position,
      antenna: rx.antenna,
      feedline: rx.feedline,
      bandwidthHz: rx.bandwidthHz,
      noiseFigureDb: rx.noiseFigureDb,
    },
    environment: link.environment,
    time: { utcIso: network.timeUtcIso },
  };
}

export function DisasterLab({
  onOpenLab,
  onContextChange,
  tutorUpdate,
}: {
  onOpenLab?: (scenario: Scenario) => void;
  onContextChange?: (network: NetworkScenario) => void;
  tutorUpdate?: { network: NetworkScenario; revision: number };
}) {
  const [state, setState] = useState(loadState);
  const [focus, setFocus] = useState<"brief" | "network" | "results">(
    "network",
  );
  const [control, setControl] = useState<"mission" | "station" | "links">(
    "station",
  );
  const [selectedId, setSelectedId] = useState(state.network.rootNodeId);
  const [selectedLink, setSelectedLink] = useState(
    state.network.links[0]?.id ?? "",
  );
  const [run, setRun] = useState<{
    network: NetworkScenario;
    result: NetworkResult;
    prediction: string;
  } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [view, setView] = useState<"map" | "3d">("3d");
  const [prediction, setPrediction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { network } = state;
  useEffect(() => {
    onContextChange?.(network);
  }, [network, onContextChange]);
  const appliedTutorRevision = useRef(0);
  useEffect(() => {
    if (!tutorUpdate || tutorUpdate.revision === appliedTutorRevision.current)
      return;
    appliedTutorRevision.current = tutorUpdate.revision;
    try {
      const nextNetwork = tutorUpdate.network;
      const result = simulateNetwork(nextNetwork);
      setState((previous) => ({ ...previous, network: nextNetwork }));
      setRun({
        network: nextNetwork,
        result,
        prediction: "Tutor demonstration",
      });
      setPlacing(false);
      setFocus("results");
      setError("");
      setNotice(
        "Tutor demonstration. The network and results now show Signal’s changes.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The demonstration could not run.",
      );
    }
  }, [tutorUpdate]);
  const story = disasters.find((d) => d.id === state.preset)!;
  const node =
    network.nodes.find((n) => n.id === selectedId) ?? network.nodes[0];
  const activeLink =
    network.links.find((l) => l.id === selectedLink) ?? network.links[0];
  const result = run?.result;
  const stale = !!run && run.network !== network;
  useEffect(() => {
    try {
      localStorage.setItem("bigsignal.disaster.v1", JSON.stringify(state));
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your network to keep this plan.",
      );
    }
  }, [state]);
  const bounds = useMemo(() => {
    const lons = network.nodes.map((n) => n.position.longitudeDeg),
      lats = network.nodes.map((n) => n.position.latitudeDeg);
    const width = Math.max(0.04, Math.max(...lons) - Math.min(...lons));
    const height = Math.max(
      width * 0.5,
      Math.max(...lats) - Math.min(...lats),
      0.03,
    );
    return {
      minLon: Math.min(...lons) - width * 0.18,
      maxLon: Math.max(...lons) + width * 0.18,
      minLat: Math.min(...lats) - height * 0.6,
      maxLat: Math.max(...lats) + height * 0.6,
    };
  }, [network.nodes]);
  const mapPosition = (n: NetworkNode) => ({
    x:
      70 +
      ((n.position.longitudeDeg - bounds.minLon) /
        (bounds.maxLon - bounds.minLon)) *
        660,
    y:
      350 -
      ((n.position.latitudeDeg - bounds.minLat) /
        (bounds.maxLat - bounds.minLat)) *
        280,
  });
  function edit(change: (next: NetworkScenario) => void) {
    const next = structuredClone(network);
    change(next);
    setState({ ...state, network: next });
    setError("");
  }
  function updateNode(change: (next: NetworkNode) => void) {
    edit((next) => change(next.nodes.find((n) => n.id === node.id)!));
  }
  function choosePreset(preset: DisasterPresetId) {
    const next = createState(preset);
    setState(next);
    setSelectedId(next.network.rootNodeId);
    setSelectedLink(next.network.links[0]?.id ?? "");
    setRun(null);
    setPlacing(false);
    setError("");
    setNotice("");
    setPrediction("");
    setFocus("network");
  }
  function send() {
    try {
      const result = simulateNetwork(network);
      setRun({ network, result, prediction });
      setFocus("results");
      setError("");
      setNotice(
        "Network tested in both directions. Inspect the weakest route in Results.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your network settings.");
    }
  }
  function addRelay(position?: { latitudeDeg: number; longitudeDeg: number }) {
    const id = `relay-${Date.now()}`;
    const base = structuredClone(network.nodes[0]);
    const relay: NetworkNode = {
      ...base,
      id,
      label: `Relay ${network.nodes.filter((n) => n.id.startsWith("relay-")).length + 1}`,
      position: {
        latitudeDeg:
          position?.latitudeDeg ??
          network.nodes.reduce((sum, n) => sum + n.position.latitudeDeg, 0) /
            network.nodes.length,
        longitudeDeg:
          position?.longitudeDeg ??
          network.nodes.reduce((sum, n) => sum + n.position.longitudeDeg, 0) /
            network.nodes.length,
        altitudeM: state.preset === "hill-relay" ? 80 : 0,
      },
      antenna: { ...base.antenna, id, heightM: 10 },
    };
    const template =
      network.links[0] ?? createDisasterNetwork(state.preset).links[0];
    edit((next) => {
      for (const other of next.nodes) {
        const environment = structuredClone(template.environment);
        if (environment.model === "vhf-terrain") delete environment.obstruction;
        next.links.push({
          ...template,
          id: `${other.id}-${id}`,
          from: other.id,
          to: id,
          environment,
        });
      }
      next.nodes.push(relay);
    });
    setSelectedId(id);
    setControl("station");
    setPlacing(false);
    setNotice(
      "Relay added with candidate links to each station. New links assume no local ridge obstruction. Set terrain for any obstructed hop, then test both directions.",
    );
  }
  function placeOnMap(event: MouseEvent<SVGSVGElement>) {
    if (!placing || network.nodes.length >= 12) return;
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const p = point.matrixTransform(matrix.inverse());
    addRelay({
      longitudeDeg: Math.max(
        -180,
        Math.min(
          180,
          bounds.minLon +
            Math.max(0, Math.min(1, (p.x - 70) / 660)) *
              (bounds.maxLon - bounds.minLon),
        ),
      ),
      latitudeDeg: Math.max(
        -89,
        Math.min(
          89,
          bounds.minLat +
            Math.max(0, Math.min(1, (350 - p.y) / 280)) *
              (bounds.maxLat - bounds.minLat),
        ),
      ),
    });
  }
  function restoreLinks() {
    edit((next) => {
      const template = createDisasterNetwork(state.preset).links[0];
      for (let a = 0; a < next.nodes.length; a++)
        for (let b = a + 1; b < next.nodes.length; b++) {
          const from = next.nodes[a].id,
            to = next.nodes[b].id;
          if (
            !next.links.some(
              (l) =>
                (l.from === from && l.to === to) ||
                (l.from === to && l.to === from),
            )
          )
            next.links.push({
              ...structuredClone(template),
              id: `${from}-${to}`,
              from,
              to,
            });
        }
    });
    setNotice(
      "Missing candidate links restored using the exercise radio defaults. Review terrain on each restored hop.",
    );
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { format: "bigsignal-network", schemaVersion: 1, ...state },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.preset}.bigsignal-network.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Network exported with station, link, and energy settings.");
  }
  const labelFor = (id: string) =>
    network.nodes.find((n) => n.id === id)?.label ?? id;
  return (
    <section
      className="dl-workspace"
      aria-label="Disaster communications laboratory"
    >
      <header className="df-header">
        <div>
          <div className="dl-kicker">DISASTER LAB / CIVIL RESILIENCE</div>
          <h1 className="df-title">Keep the message moving.</h1>
        </div>
        <label className="dl-field df-mission-picker">
          <span>Exercise</span>
          <select
            value={state.preset}
            onChange={(e) => choosePreset(e.target.value as DisasterPresetId)}
          >
            {disasters.map((d, i) => (
              <option key={d.id} value={d.id}>
                {i + 1}. {d.title}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p className="df-objective">
        <strong>Objective:</strong> {story.objective}
      </p>
      <nav className="df-focus-nav" aria-label="Disaster workspace views">
        {(["brief", "network", "results"] as const).map((section) => (
          <button
            key={section}
            aria-current={focus === section ? "page" : undefined}
            onClick={() => setFocus(section)}
          >
            {section === "brief"
              ? "01 · Brief"
              : section === "network"
                ? "02 · Network"
                : "03 · Results"}
            {section === "results" && stale ? " · Outdated" : ""}
          </button>
        ))}
        <button className="dl-send df-test" onClick={send}>
          Test network ↗
        </button>
      </nav>
      <div hidden={focus !== "brief"} className="df-brief">
        <div className="dl-intro">
          <div>
            <div className="dl-kicker">DISASTER LAB / CIVIL RESILIENCE</div>
            <h2 className="dl-heading">
              When the network goes down,
              <br />
              the message still matters.
            </h2>
            <p className="dl-muted">
              Get a shelter’s request to the people who can help. Build direct
              links, place a relay, and stretch a battery through the night.
            </p>
          </div>
          <aside className="dl-why">
            <h3>Why radio matters in a natural disaster</h3>
            <p>{radioResilienceIntroduction}</p>
            <a
              href="https://www.itu.int/en/ITU-R/information/Pages/emergency.aspx"
              target="_blank"
              rel="noreferrer"
            >
              ITU · Radio for disaster relief ↗
            </a>
            <br />
            <a
              href="https://www.itu.int/en/mediacentre/backgrounders/Pages/emergency-telecommunications.aspx"
              target="_blank"
              rel="noreferrer"
            >
              ITU · Preparedness and resilient communication ↗
            </a>
          </aside>
        </div>
        <div className="dl-callout">{story.whyRadio}</div>
        <article className="dl-brief">
          <div>
            <div className="dl-kicker">THE SITUATION</div>
            <h2>{story.title}</h2>
            <p>{story.whatHappened}</p>
            <p>
              <strong>Your objective</strong>
              <br />
              {story.objective}
            </p>
          </div>
          <div>
            <h3>What failed</h3>
            <ul>
              {story.whatFailed.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <h3 style={{ marginTop: 20 }}>Who needs to communicate</h3>
            <p>{story.participants.join(" · ")}</p>
          </div>
          <div>
            <h3>What information must move</h3>
            <ul>
              {story.information.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <h3 style={{ marginTop: 20 }}>Constraints</h3>
            <ul>
              {story.constraints.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </article>
      </div>
      <div
        className={`dl-layout df-layout ${focus === "results" ? "df-results-layout" : ""}`}
        hidden={focus === "brief"}
      >
        <div>
          <div hidden={focus !== "network"}>
            <div className="dl-panel">
              <div className="dl-panel-head">
                <h3>Build the route. Then test the route.</h3>
                <div className="dl-toolbar">
                  <button
                    aria-pressed={view === "3d"}
                    onClick={() => setView("3d")}
                  >
                    3D
                  </button>
                  <button
                    aria-pressed={view === "map"}
                    onClick={() => setView("map")}
                  >
                    Map
                  </button>
                  <button
                    aria-pressed={placing}
                    disabled={network.nodes.length >= 12}
                    onClick={() => setPlacing(!placing)}
                  >
                    {placing ? "Cancel placement" : "+ Place relay on map"}
                  </button>
                  <button
                    disabled={network.nodes.length >= 12}
                    onClick={() => addRelay()}
                  >
                    + Add central relay
                  </button>
                </div>
              </div>
              {view === "3d" ? (
                <>
                  <div className="dl-network-view">
                    <NetworkView
                      selectedId={node.id}
                      placing={placing}
                      onSelect={(id) => {
                        setSelectedId(id);
                        setControl("station");
                      }}
                      onFallback={() => setView("map")}
                      onPlace={(x, z) => {
                        if (network.nodes.length < 12)
                          addRelay({
                            longitudeDeg:
                              bounds.minLon +
                              Math.max(0, Math.min(1, (x + 5) / 10)) *
                                (bounds.maxLon - bounds.minLon),
                            latitudeDeg:
                              bounds.minLat +
                              Math.max(0, Math.min(1, (3 - z) / 6)) *
                                (bounds.maxLat - bounds.minLat),
                          });
                      }}
                      nodes={network.nodes.map((n) => ({
                        id: n.id,
                        label: n.label,
                        x:
                          -5 +
                          ((n.position.longitudeDeg - bounds.minLon) /
                            (bounds.maxLon - bounds.minLon)) *
                            10,
                        z:
                          3 -
                          ((n.position.latitudeDeg - bounds.minLat) /
                            (bounds.maxLat - bounds.minLat)) *
                            6,
                        groundHeight: n.position.altitudeM,
                        antennaHeight: n.antenna.heightM,
                      }))}
                      links={network.links.map((l) => {
                        const response = !stale
                          ? result?.links.find((r) => r.id === l.id)
                          : undefined;
                        return {
                          id: l.id,
                          from: l.from,
                          to: l.to,
                          color: !response
                            ? "#71886a"
                            : response.meetsRequirement
                              ? "#d1f888"
                              : response.usable
                                ? "#ffbc72"
                                : "#a46d66",
                          ...(l.environment.model === "vhf-terrain" &&
                          l.environment.obstruction
                            ? {
                                obstruction: {
                                  fraction: l.environment.obstruction.fraction,
                                  height: l.environment.obstruction.altitudeM,
                                },
                              }
                            : {}),
                        };
                      })}
                    />
                  </div>
                  <p className="al-view-caption" style={{ padding: "0 20px" }}>
                    {placing
                      ? "Click the ground to place a relay. "
                      : "Drag to orbit. Scroll to zoom. "}
                    Heights are exaggerated for visibility. Terrain is set per
                    link, not fetched from a map. Use Map for geographic labels.
                  </p>
                </>
              ) : (
                <svg
                  className="dl-map"
                  viewBox="0 0 800 430"
                  onClick={placeOnMap}
                  role="img"
                  aria-label={`Network planning map with ${network.nodes.length} stations. Select a station to edit. Use Add central relay as the keyboard alternative to map placement.`}
                  style={{ cursor: placing ? "crosshair" : undefined }}
                >
                  <defs>
                    <pattern
                      id="dl-grid"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="#344631"
                        strokeWidth=".5"
                      />
                    </pattern>
                  </defs>
                  <rect width="800" height="430" fill="url(#dl-grid)" />
                  <path
                    d="M-20 290 Q120 80 230 200 T430 170 T820 120 M-20 310 Q120 100 230 220 T430 190 T820 140 M-20 330 Q120 120 230 240 T430 210 T820 160"
                    fill="none"
                    stroke="#34513a"
                    opacity=".5"
                  />
                  <text
                    x="22"
                    y="27"
                    fill="#8da184"
                    fontSize="10"
                    letterSpacing="2"
                  >
                    {placing
                      ? "CLICK TO PLACE A RELAY"
                      : "PLANNING MAP · GEOGRAPHIC POSITIONS"}
                  </text>
                  <text x="22" y="409" fill="#7f9776" fontSize="10">
                    N ↑{" "}
                    {state.preset === "wide-area"
                      ? "REGIONAL HF NETWORK"
                      : "LOCAL RADIO NETWORK"}{" "}
                    · terrain set per link
                  </text>
                  {network.links.map((link) => {
                    const a = mapPosition(
                      network.nodes.find((n) => n.id === link.from)!,
                    );
                    const b = mapPosition(
                      network.nodes.find((n) => n.id === link.to)!,
                    );
                    const response = !stale
                      ? result?.links.find((l) => l.id === link.id)
                      : undefined;
                    const color = !response
                      ? "#75846e"
                      : response.meetsRequirement
                        ? "#d1f888"
                        : response.usable
                          ? "#ffbc72"
                          : "#986e66";
                    return (
                      <g key={link.id}>
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke={color}
                          strokeWidth={selectedLink === link.id ? 3 : 1.5}
                          strokeDasharray={
                            response?.meetsRequirement ? undefined : "6 6"
                          }
                        />
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="transparent"
                          strokeWidth={18}
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            if (!placing) {
                              e.stopPropagation();
                              setSelectedLink(link.id);
                              setControl("links");
                            }
                          }}
                        />
                        {link.environment.model === "vhf-terrain" &&
                          link.environment.obstruction && (
                            <g
                              transform={`translate(${a.x + (b.x - a.x) * link.environment.obstruction.fraction},${a.y + (b.y - a.y) * link.environment.obstruction.fraction - 22})`}
                            >
                              <path
                                d="M-22 20 L0 -17 L22 20Z"
                                fill="#445238"
                                stroke="#8a9c69"
                              />
                              <text
                                y="36"
                                textAnchor="middle"
                                fontSize="9"
                                fill="#afbc9b"
                              >
                                RIDGE {link.environment.obstruction.altitudeM}m
                              </text>
                            </g>
                          )}
                      </g>
                    );
                  })}
                  {network.nodes.map((station, index) => {
                    const p = mapPosition(station);
                    const active = station.id === node.id;
                    return (
                      <g
                        key={station.id}
                        className="dl-station"
                        role="button"
                        tabIndex={0}
                        aria-label={`Edit ${station.label}`}
                        transform={`translate(${p.x},${p.y})`}
                        onClick={(e) => {
                          if (!placing) {
                            e.stopPropagation();
                            setSelectedId(station.id);
                            setControl("station");
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(station.id);
                            setControl("station");
                          }
                        }}
                      >
                        <circle
                          r={active ? 25 : 21}
                          fill="#131e15"
                          stroke={active ? "#d1f888" : "#8a9d7b"}
                          strokeWidth={active ? 2 : 1}
                        />
                        <circle
                          r={active ? 32 : 28}
                          fill="none"
                          stroke="#829764"
                          opacity=".18"
                        />
                        <text
                          textAnchor="middle"
                          y="5"
                          fontSize="14"
                          fill={active ? "#d1f888" : "#d9e3cd"}
                        >
                          {station.id === network.rootNodeId
                            ? "◎"
                            : station.id.startsWith("relay-")
                              ? "↗"
                              : index + 1}
                        </text>
                        <rect
                          x="-61"
                          y="33"
                          width="122"
                          height="25"
                          rx="4"
                          fill="#121d14"
                          opacity=".93"
                        />
                        <text
                          textAnchor="middle"
                          y="50"
                          fontSize="11"
                          fill="#d9e3cd"
                        >
                          {station.label.slice(0, 21)}
                        </text>
                        <text
                          textAnchor="middle"
                          y="72"
                          fontSize="9"
                          fill="#9baa8f"
                        >
                          {station.antenna.heightM}m antenna ·{" "}
                          {dbmToWatts(station.powerDbm).toFixed(1)}W
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
              <div className="dl-map-legend">
                <span>Meets information & margin target</span>
                <span>RF works, requirement unsupported</span>
                <span>Link target not met</span>
              </div>
            </div>
          </div>
          <div hidden={focus !== "network"} className="df-predict-wrapper">
            <div className="dl-prediction">
              <span>Predict the result</span>
              {[
                "Everyone connected",
                "Someone isolated",
                "Battery runs short",
              ].map((p) => (
                <button
                  key={p}
                  aria-pressed={prediction === p}
                  onClick={() => setPrediction(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <details className="df-file-tools">
            <summary>Network files & recovery</summary>
            <div className="dl-actionbar">
              <p>
                {stale
                  ? "Settings changed. Test again to update the results."
                  : run
                    ? `Last prediction: ${run.prediction || "Not recorded"}`
                    : "Test every candidate link in both directions."}
              </p>
              <button className="dl-download" onClick={download}>
                Export network
              </button>
              <button
                className="dl-download"
                onClick={restoreLinks}
                disabled={
                  network.links.length ===
                  (network.nodes.length * (network.nodes.length - 1)) / 2
                }
              >
                Restore missing links
              </button>
              <label
                className="dl-download"
                style={{ cursor: "pointer", textDecoration: "underline" }}
              >
                Import network
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 1e6)
                        throw new Error("Network file must be below 1 MB.");
                      const data = JSON.parse(await file.text());
                      if (
                        data.format !== "bigsignal-network" ||
                        data.schemaVersion !== 1 ||
                        !disasters.some((d) => d.id === data.preset)
                      )
                        throw new Error(
                          "Choose an exported BIG SIGNAL network file.",
                        );
                      simulateNetwork(data.network);
                      setState({ preset: data.preset, network: data.network });
                      setSelectedId(data.network.rootNodeId);
                      setSelectedLink(data.network.links[0]?.id ?? "");
                      setRun(null);
                      setNotice(
                        "Network imported. Test it to inspect the results.",
                      );
                      setError("");
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : "Unable to read network file.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </details>
          {error && (
            <p className="dl-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="dl-muted" role="status">
              {notice}
            </p>
          )}
          {focus === "results" && !result && (
            <div className="dl-panel df-empty">
              <h2>Test your network to see what works.</h2>
              <p>
                Choose a prediction in Network, then test every candidate link
                in both directions.
              </p>
              <button onClick={() => setFocus("network")}>
                Build your network
              </button>
            </div>
          )}
          {focus === "results" && stale && (
            <p className="dl-error" role="status">
              These results describe your previous configuration. Test network
              again to evaluate your changes.
            </p>
          )}
          {focus === "results" && result && (
            <div style={{ opacity: stale ? 0.6 : 1 }}>
              <div className="dl-metrics">
                <div className="dl-metric">
                  <small>Coverage</small>
                  <strong>{(result.coverageFraction * 100).toFixed(0)}%</strong>
                  <span>
                    {result.reachableNodeIds.length} /{" "}
                    {run!.network.nodes.length} stations reachable from
                    coordination
                  </span>
                </div>
                <div className="dl-metric">
                  <small>Redundancy</small>
                  <strong>{result.hasRedundantPaths ? "GOOD" : "LOW"}</strong>
                  <span>
                    {result.bridgeLinkIds.length} links with no alternate route
                  </span>
                </div>
                <div className="dl-metric">
                  <small>Energy endurance</small>
                  <strong>
                    {result.enduranceAssessed
                      ? runtime(result.minimumRuntimeHours)
                      : "NOT ASSESSED"}
                  </strong>
                  <span>
                    {!result.enduranceAssessed
                      ? "Set a transmit and receive workload"
                      : result.meetsEndurance
                        ? "Meets target"
                        : "Below endurance target"}
                  </span>
                </div>
                <div className="dl-metric">
                  <small>Infrastructure</small>
                  <strong>DIRECT</strong>
                  <span>No cellular or Internet route required</span>
                </div>
              </div>
              <div
                className={`dl-callout ${!result.meetsCoverage || !result.meetsEndurance ? "dl-amber" : ""}`}
              >
                <strong>
                  {result.meetsCoverage && result.meetsEndurance
                    ? "The essential messages have a route."
                    : "Your network still has a weak point."}
                </strong>{" "}
                {!result.meetsCoverage
                  ? `${run!.network.nodes.length - result.reachableNodeIds.length} station(s) cannot reach coordination while meeting the selected requirement.`
                  : !result.enduranceAssessed
                    ? "Set positive transmit and receive duty cycles at every station. A radio that never sends or listens cannot demonstrate communication endurance."
                    : !result.meetsEndurance
                      ? "At least one station runs below the battery endurance target. Lower its duty cycle or power, improve the antenna, or add energy."
                      : !result.hasRedundantPaths
                        ? "A single link failure could still split this network. Add and test an alternate route."
                        : "Each station remains connected after any single usable link fails. Station failures and correlated outages are different tests."}
              </div>
              <div className="dl-panel">
                <div className="dl-panel-head">
                  <h3>Every hop counts</h3>
                  <span className="dl-kicker">
                    {stale ? "PREVIOUS RUN" : "BIDIRECTIONAL LINK RESULTS"}
                  </span>
                </div>
                <div className="dl-table-wrap">
                  <table className="dl-table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Both-way margin</th>
                        <th>RF / requirement</th>
                        <th>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.links.map((response) => {
                        const link = run!.network.links.find(
                          (l) => l.id === response.id,
                        )!;
                        const names = (id: string) =>
                          run!.network.nodes.find((n) => n.id === id)?.label ??
                          id;
                        return (
                          <tr key={response.id}>
                            <td>
                              {names(response.from)} ↔ {names(response.to)}
                              <small>
                                {(link.frequencyHz / 1e6).toFixed(3)} MHz ·{" "}
                                {MODE_PROFILES[link.modeId]?.label}
                              </small>
                            </td>
                            <td>
                              {response.marginDb.toFixed(1)} dB
                              <small>
                                {!response.forward.propagationAvailable ||
                                !response.reverse.propagationAvailable
                                  ? "Hypothetical budget · no supported route"
                                  : `Forward ${response.forward.linkMarginDb.toFixed(1)} / reverse ${response.reverse.linkMarginDb.toFixed(1)}`}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`dl-status ${response.meetsRequirement ? "" : response.usable ? "marginal" : "failed"}`}
                              >
                                {response.meetsRequirement
                                  ? "READY"
                                  : response.usable
                                    ? "WRONG FORMAT"
                                    : !response.forward.propagationAvailable ||
                                        !response.reverse.propagationAvailable
                                      ? "NO PATH"
                                      : "BELOW TARGET"}
                              </span>
                              <small>
                                {response.requirement.supported
                                  ? "Information format supported"
                                  : "Information format not implemented"}
                              </small>
                            </td>
                            <td>
                              {onOpenLab ? (
                                <button
                                  onClick={() =>
                                    onOpenLab(linkScenario(run!.network, link))
                                  }
                                >
                                  Open link lab ↗
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSelectedLink(response.id)}
                                >
                                  Edit link
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="dl-panel dl-section-gap">
                <div className="dl-panel-head">
                  <h3>Batteries are part of the route.</h3>
                  <span className="dl-kicker">
                    {result.totalAveragePowerW.toFixed(1)} W NETWORK AVERAGE
                  </span>
                </div>
                <div className="dl-table-wrap">
                  <table className="dl-table">
                    <thead>
                      <tr>
                        <th>Station</th>
                        <th>Average draw</th>
                        <th>Transmit draw</th>
                        <th>Runtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run!.network.nodes.map((n) => {
                        const energy = result.nodeEnergy[n.id];
                        return (
                          <tr key={n.id}>
                            <td>
                              {n.label}
                              <small>{n.battery.capacityWh} Wh battery</small>
                            </td>
                            <td>{energy.averagePowerW.toFixed(2)} W</td>
                            <td>
                              {energy.transmitPowerW.toFixed(1)} W
                              <small>Includes RF amplifier loss</small>
                            </td>
                            <td>
                              {runtime(energy.runtimeHours)}
                              <div className="dl-battery">
                                <span
                                  style={{
                                    width: `${Math.min(100, ((energy.runtimeHours ?? run!.network.targetRuntimeHours) / Math.max(1, run!.network.targetRuntimeHours)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <details className="dl-details">
                <summary>Inspect network model & energy assumptions</summary>
                {result.assumptions.map((a) => (
                  <p key={a}>{a}</p>
                ))}
                {result.links[0]?.requirement.assumptions.map((a) => (
                  <p key={a}>{a}</p>
                ))}
                {Object.values(result.nodeEnergy)[0]?.assumptions.map((a) => (
                  <p key={a}>{a}</p>
                ))}
              </details>
            </div>
          )}
          <details className="dl-details">
            <summary>Stuck? Try a small experiment.</summary>
            <ul>
              {story.hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <p>
              <strong>Think beyond this setup</strong>
              <br />
              {story.reflection}
            </p>
          </details>
        </div>
        <aside className="df-controls" hidden={focus !== "network"}>
          <nav className="df-control-nav" aria-label="Network controls">
            {(["mission", "station", "links"] as const).map((tab) => (
              <button
                key={tab}
                aria-current={control === tab ? "page" : undefined}
                onClick={() => setControl(tab)}
              >
                {tab === "mission"
                  ? "Mission"
                  : tab === "station"
                    ? "Station"
                    : "Links"}
              </button>
            ))}
          </nav>
          <div className="df-control-scroll">
            <div className="dl-panel" hidden={control !== "mission"}>
              <div className="dl-panel-head">
                <h3>Mission requirements</h3>
              </div>
              <div className="dl-panel-body">
                <label className="dl-field">
                  <span>Information to move</span>
                  <select
                    value={network.requirement}
                    onChange={(e) =>
                      edit((n) => {
                        n.requirement = e.target
                          .value as CommunicationRequirement;
                      })
                    }
                  >
                    {requirements.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="dl-field-grid">
                  <Field
                    label="Target margin · dB"
                    value={network.requiredMarginDb}
                    onChange={(v) =>
                      edit((n) => {
                        n.requiredMarginDb = v;
                      })
                    }
                    max={40}
                  />
                  <Field
                    label="Endurance · hours"
                    value={network.targetRuntimeHours}
                    onChange={(v) =>
                      edit((n) => {
                        n.targetRuntimeHours = v;
                      })
                    }
                    min={1}
                    max={168}
                  />
                </div>
                <label className="dl-field">
                  <span>Coordination station</span>
                  <select
                    value={network.rootNodeId}
                    onChange={(e) =>
                      edit((n) => {
                        n.rootNodeId = e.target.value;
                      })
                    }
                  >
                    {network.nodes.map((n) => (
                      <option value={n.id} key={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dl-field">
                  <span>Simulation time · UTC</span>
                  <input
                    type="datetime-local"
                    value={network.timeUtcIso.slice(0, 16)}
                    onChange={(e) => {
                      if (
                        e.target.value &&
                        Number.isFinite(Date.parse(`${e.target.value}Z`))
                      )
                        edit((n) => {
                          n.timeUtcIso = `${e.target.value}:00Z`;
                        });
                    }}
                  />
                </label>
                <p className="dl-muted">
                  Image and live video are deliberate capability checks. None of
                  the implemented voice, Morse, or FT8 waveforms carry them. A
                  positive RF budget does not establish application support.
                </p>
              </div>
            </div>
            <div className="dl-panel" hidden={control !== "station"}>
              <div className="dl-panel-head">
                <h3>Station equipment</h3>
              </div>
              <div className="dl-panel-body">
                <label className="dl-field">
                  <span>Edit station</span>
                  <select
                    value={node.id}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    {network.nodes.map((n) => (
                      <option value={n.id} key={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dl-field">
                  <span>Station name</span>
                  <input
                    maxLength={30}
                    value={node.label}
                    onChange={(e) =>
                      updateNode((n) => {
                        n.label = e.target.value;
                      })
                    }
                  />
                </label>
                <div className="dl-field-grid">
                  <Field
                    label="RF power · W"
                    value={dbmToWatts(node.powerDbm)}
                    min={0.01}
                    max={1000}
                    step={0.1}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.powerDbm = wattsToDbm(v);
                      })
                    }
                  />
                  <Field
                    label="Antenna height · m"
                    value={node.antenna.heightM}
                    min={0.1}
                    max={1000}
                    step={0.5}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.antenna.heightM = v;
                      })
                    }
                  />
                  <Field
                    label="Antenna gain · dBi"
                    value={node.antenna.gainDbi}
                    min={-10}
                    max={40}
                    step={0.5}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.antenna.gainDbi = v;
                      })
                    }
                  />
                  <Field
                    label="Feedline loss · dB"
                    value={node.feedline.lossDb}
                    max={30}
                    step={0.1}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.feedline.lossDb = v;
                      })
                    }
                  />
                  <Field
                    label="Latitude · °"
                    value={node.position.latitudeDeg}
                    min={-89}
                    max={89}
                    step={0.001}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.position.latitudeDeg = v;
                      })
                    }
                  />
                  <Field
                    label="Longitude · °"
                    value={node.position.longitudeDeg}
                    min={-180}
                    max={180}
                    step={0.001}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.position.longitudeDeg = v;
                      })
                    }
                  />
                  <Field
                    label="Ground altitude · m"
                    value={node.position.altitudeM}
                    min={-100}
                    max={9000}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.position.altitudeM = v;
                      })
                    }
                  />
                  <Field
                    label="RX bandwidth · Hz"
                    value={node.bandwidthHz}
                    min={50}
                    max={100000}
                    step={50}
                    onChange={(v) =>
                      updateNode((n) => {
                        n.bandwidthHz = v;
                      })
                    }
                  />
                </div>
                <label className="dl-field">
                  <span>Polarization</span>
                  <select
                    value={node.antenna.polarization}
                    onChange={(e) =>
                      updateNode((n) => {
                        n.antenna.polarization = e.target
                          .value as NetworkNode["antenna"]["polarization"];
                      })
                    }
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="circular">Circular</option>
                  </select>
                </label>
                <details className="dl-details">
                  <summary>Battery, duty cycle & electrical draw</summary>
                  <div className="dl-field-grid dl-section-gap">
                    <Field
                      label="Battery · Wh"
                      value={node.battery.capacityWh}
                      max={100000}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.capacityWh = v;
                        })
                      }
                    />
                    <Field
                      label="Usable battery · %"
                      value={node.battery.usableFraction * 100}
                      max={100}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.usableFraction = v / 100;
                        })
                      }
                    />
                    <Field
                      label="TX duty · %"
                      value={node.battery.transmitDutyCycle * 100}
                      max={100}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.transmitDutyCycle = v / 100;
                          n.battery.receiveDutyCycle = Math.min(
                            n.battery.receiveDutyCycle,
                            1 - v / 100,
                          );
                        })
                      }
                    />
                    <Field
                      label="RX duty · %"
                      value={node.battery.receiveDutyCycle * 100}
                      max={100 - node.battery.transmitDutyCycle * 100}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.receiveDutyCycle = v / 100;
                        })
                      }
                    />
                    <Field
                      label="Idle draw · W"
                      value={node.battery.idleW}
                      max={100}
                      step={0.1}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.idleW = v;
                        })
                      }
                    />
                    <Field
                      label="Receive draw · W"
                      value={node.battery.receiveW}
                      max={100}
                      step={0.1}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.receiveW = v;
                        })
                      }
                    />
                    <Field
                      label="TX circuit · W"
                      value={node.battery.transmitCircuitW}
                      max={100}
                      step={0.1}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.transmitCircuitW = v;
                        })
                      }
                    />
                    <Field
                      label="PA efficiency · %"
                      value={node.battery.amplifierEfficiency * 100}
                      min={1}
                      max={100}
                      onChange={(v) =>
                        updateNode((n) => {
                          n.battery.amplifierEfficiency = v / 100;
                        })
                      }
                    />
                  </div>
                  <p className="dl-muted">
                    Transmit, receive, and idle are separate states. A relay’s
                    traffic uses its battery too. Increase its entered duty
                    cycle to represent forwarding.
                  </p>
                </details>
                <button
                  className="dl-section-gap"
                  disabled={
                    network.nodes.length <= 2 || node.id === network.rootNodeId
                  }
                  onClick={() => {
                    edit((n) => {
                      n.nodes = n.nodes.filter((other) => other.id !== node.id);
                      n.links = n.links.filter(
                        (l) => l.from !== node.id && l.to !== node.id,
                      );
                    });
                    setSelectedId(network.rootNodeId);
                  }}
                >
                  Remove station
                </button>
              </div>
            </div>
            {control === "links" && !activeLink && (
              <p className="dl-muted">
                No candidate links remain. Restore missing links from Network
                files & recovery.
              </p>
            )}
            {activeLink && (
              <div className="dl-panel" hidden={control !== "links"}>
                <div className="dl-panel-head">
                  <h3>Link equipment & terrain</h3>
                </div>
                <div className="dl-panel-body">
                  <label className="dl-field">
                    <span>Edit candidate link</span>
                    <select
                      value={activeLink.id}
                      onChange={(e) => setSelectedLink(e.target.value)}
                    >
                      {network.links.map((l) => (
                        <option value={l.id} key={l.id}>
                          {labelFor(l.from)} ↔ {labelFor(l.to)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Link frequency · MHz"
                    value={activeLink.frequencyHz / 1e6}
                    min={0.1}
                    max={10000}
                    step={0.1}
                    onChange={(v) =>
                      edit((n) => {
                        n.links.find(
                          (l) => l.id === activeLink.id,
                        )!.frequencyHz = v * 1e6;
                      })
                    }
                  />
                  <label className="dl-field">
                    <span>Communication mode</span>
                    <select
                      value={activeLink.modeId}
                      onChange={(e) =>
                        edit((n) => {
                          const link = n.links.find(
                            (l) => l.id === activeLink.id,
                          )!;
                          link.modeId = e.target.value;
                          for (const station of n.nodes.filter(
                            (s) => s.id === link.from || s.id === link.to,
                          ))
                            station.bandwidthHz =
                              MODE_PROFILES[e.target.value].bandwidthHz;
                        })
                      }
                    >
                      {Object.values(MODE_PROFILES).map((m) => (
                        <option value={m.id} key={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <small>
                      Updates both endpoint receive bandwidths to the mode’s
                      reference setting.
                    </small>
                  </label>
                  {activeLink.environment.model === "vhf-terrain" && (
                    <>
                      <label className="dl-check">
                        <input
                          type="checkbox"
                          checked={!!activeLink.environment.obstruction}
                          onChange={(e) =>
                            edit((n) => {
                              const env = n.links.find(
                                (l) => l.id === activeLink.id,
                              )!.environment;
                              if (env.model === "vhf-terrain") {
                                if (e.target.checked)
                                  env.obstruction = {
                                    fraction: 0.5,
                                    altitudeM: 80,
                                  };
                                else delete env.obstruction;
                              }
                            })
                          }
                        />
                        Ridge obstructs this hop
                      </label>
                      {activeLink.environment.obstruction && (
                        <Field
                          label="Ridge altitude · m"
                          value={activeLink.environment.obstruction.altitudeM}
                          max={9000}
                          onChange={(v) =>
                            edit((n) => {
                              const env = n.links.find(
                                (l) => l.id === activeLink.id,
                              )!.environment;
                              if (
                                env.model === "vhf-terrain" &&
                                env.obstruction
                              )
                                env.obstruction.altitudeM = v;
                            })
                          }
                        />
                      )}
                    </>
                  )}
                  <button
                    onClick={() => {
                      edit((n) => {
                        n.links = n.links.filter((l) => l.id !== activeLink.id);
                      });
                      setNotice(
                        "Candidate link removed. Test the network to see whether another route carries the messages.",
                      );
                    }}
                  >
                    Remove this link
                  </button>
                  <p className="dl-muted">
                    {activeLink.environment.model === "hf-skywave"
                      ? "Educational HF skywave model. Change UTC time and frequency to explore ionospheric dependence."
                      : "Educational VHF terrain model. The map does not fetch terrain. Set an obstruction for each affected hop."}
                  </p>
                  {onOpenLab && (
                    <button
                      onClick={() =>
                        onOpenLab(linkScenario(network, activeLink))
                      }
                    >
                      Inspect this link in 3D ↗
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      <p className="dl-notice">
        <strong>
          Classroom simulation, not an operational emergency plan.
        </strong>{" "}
        {disasterSafetyNote}
      </p>
    </section>
  );
}
