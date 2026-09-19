import type { Scenario } from "../../../packages/contracts";
import { MODE_PROFILES } from "../../../packages/simulation/src";
import { dbmToWatts, wattsToDbm } from "../../../packages/units/src";
import type { ControlId } from "../../../packages/missions/product";

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="lab-number">
      {label}
      <input
        type="number"
        value={Number(value.toPrecision(10))}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (
            e.target.value !== "" &&
            Number.isFinite(e.target.valueAsNumber) &&
            e.target.valueAsNumber >= min &&
            e.target.valueAsNumber <= max
          )
            onChange(e.target.valueAsNumber);
        }}
      />
    </label>
  );
}
export const antennaPresets = [
  { type: "rubber-duck", label: "Rubber duck", gain: -2 },
  { type: "vertical", label: "Quarter-wave vertical", gain: 2.15 },
  { type: "dipole", label: "Dipole", gain: 2.15 },
  { type: "yagi", label: "Yagi", gain: 9 },
  { type: "custom", label: "Small loop", gain: -3 },
  { type: "dish", label: "Dish", gain: 24 },
] as const;
export function LabControls({
  scenario,
  onChange,
  controls,
  extreme = false,
}: {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
  controls?: ControlId[];
  extreme?: boolean;
}) {
  const s = scenario;
  const edit = (fn: (s: Scenario) => void) => {
    const next = structuredClone(s);
    fn(next);
    onChange(next);
  };
  const show = (id: ControlId) => !controls || controls.includes(id);
  const detailed = s.difficulty !== "beginner";
  return (
    <div className="lab-controls">
      {show("power") && (
        <fieldset>
          <legend>
            Transmit power{" "}
            <span>
              {Number(dbmToWatts(s.transmitter.powerDbm).toPrecision(3))} W
            </span>
          </legend>
          <div className="choice-grid">
            {[0.1, 1, 5, 10, 50, 100].map((w) => (
              <button
                key={w}
                aria-pressed={
                  Math.abs(dbmToWatts(s.transmitter.powerDbm) - w) < 0.001
                }
                onClick={() =>
                  edit((s) => (s.transmitter.powerDbm = wattsToDbm(w)))
                }
              >
                {w} W
              </button>
            ))}
          </div>
          {(detailed || extreme) && (
            <NumberField
              label="Power in watts"
              value={dbmToWatts(s.transmitter.powerDbm)}
              min={0.000001}
              max={extreme ? 1e8 : 10000}
              step={0.000001}
              onChange={(v) =>
                edit((s) => (s.transmitter.powerDbm = wattsToDbm(v)))
              }
            />
          )}{" "}
          {s.transmitter.powerDbm >= 60 && (
            <p className="humor">
              BIG SIGNAL acknowledges your commitment to solving problems
              incorrectly.
            </p>
          )}
        </fieldset>
      )}
      {show("frequency") && (
        <NumberField
          label="Frequency / MHz"
          value={s.frequencyHz / 1e6}
          min={s.environment.model === "hf-skywave" ? 1 : 0.1}
          max={s.environment.model === "hf-skywave" ? 30 : 100000}
          step={0.001}
          onChange={(v) => edit((s) => (s.frequencyHz = v * 1e6))}
        />
      )}
      {show("distance") && (
        <fieldset>
          <legend>Move the receiver</legend>
          <p>
            Choose a separation on the equator. Terrain remains a configured
            profile.
          </p>
          <div className="choice-grid">
            {[1, 10, 100, 1000].map((km) => (
              <button
                key={km}
                onClick={() =>
                  edit((s) => {
                    s.transmitter.position = {
                      latitudeDeg: 0,
                      longitudeDeg: 0,
                      altitudeM: 0,
                    };
                    s.receiver.position = {
                      latitudeDeg: 0,
                      longitudeDeg: km / 111.195,
                      altitudeM: 0,
                    };
                  })
                }
              >
                {km} km
              </button>
            ))}
          </div>
          <NumberField
            label="RX longitude / degrees"
            value={s.receiver.position.longitudeDeg}
            min={-180}
            max={180}
            step={0.001}
            onChange={(v) =>
              edit((s) => (s.receiver.position.longitudeDeg = v))
            }
          />
        </fieldset>
      )}
      {show("distance") && detailed && (
        <fieldset>
          <legend>Place stations on Earth</legend>
          {(["transmitter", "receiver"] as const).map((end) => (
            <div key={end}>
              <p>{end === "transmitter" ? "Transmitter" : "Receiver"}</p>
              <NumberField
                label={`${end === "transmitter" ? "TX" : "RX"} latitude / degrees`}
                value={s[end].position.latitudeDeg}
                min={-90}
                max={90}
                step={0.001}
                onChange={(v) => edit((s) => (s[end].position.latitudeDeg = v))}
              />
              {end === "transmitter" && (
                <NumberField
                  label="TX longitude / degrees"
                  value={s.transmitter.position.longitudeDeg}
                  min={-180}
                  max={180}
                  step={0.001}
                  onChange={(v) =>
                    edit((s) => (s.transmitter.position.longitudeDeg = v))
                  }
                />
              )}
              <NumberField
                label={`${end === "transmitter" ? "TX" : "RX"} ground altitude / m`}
                value={s[end].position.altitudeM}
                min={-500}
                max={9000}
                onChange={(v) => edit((s) => (s[end].position.altitudeM = v))}
              />
            </div>
          ))}
        </fieldset>
      )}
      {show("antenna") && (
        <fieldset>
          <legend>Antenna</legend>
          <label>
            TX antenna
            <select
              value={s.transmitter.antenna.id}
              onChange={(e) => {
                const p = antennaPresets.find(
                  (p) => p.label === e.target.value,
                );
                if (p)
                  edit((s) => {
                    s.transmitter.antenna = {
                      ...s.transmitter.antenna,
                      id: p.label,
                      type: p.type,
                      gainDbi: p.gain,
                    };
                  });
              }}
            >
              <option value={s.transmitter.antenna.id}>
                {s.transmitter.antenna.id} · {s.transmitter.antenna.gainDbi} dBi
              </option>
              {antennaPresets
                .filter((p) => p.label !== s.transmitter.antenna.id)
                .map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label} · {p.gain} dBi
                  </option>
                ))}
            </select>
          </label>
          <label>
            RX antenna
            <select
              value={s.receiver.antenna.id}
              onChange={(e) => {
                const preset = antennaPresets.find(
                  (p) => p.label === e.target.value,
                );
                if (preset)
                  edit((s) => {
                    s.receiver.antenna = {
                      ...s.receiver.antenna,
                      id: preset.label,
                      type: preset.type,
                      gainDbi: preset.gain,
                    };
                  });
              }}
            >
              <option value={s.receiver.antenna.id}>
                {s.receiver.antenna.id} · {s.receiver.antenna.gainDbi} dBi
              </option>
              {antennaPresets
                .filter((p) => p.label !== s.receiver.antenna.id)
                .map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label} · {p.gain} dBi
                  </option>
                ))}
            </select>
          </label>
          <p>
            Preset gains are illustrative, with the main beam aimed at the other
            station.
          </p>
          {detailed && (
            <>
              <NumberField
                label="TX gain / dBi"
                value={s.transmitter.antenna.gainDbi}
                min={-30}
                max={80}
                step={0.1}
                onChange={(v) =>
                  edit((s) => (s.transmitter.antenna.gainDbi = v))
                }
              />
              <NumberField
                label="RX gain / dBi"
                value={s.receiver.antenna.gainDbi}
                min={-30}
                max={80}
                step={0.1}
                onChange={(v) => edit((s) => (s.receiver.antenna.gainDbi = v))}
              />
            </>
          )}
        </fieldset>
      )}
      {show("height") && (
        <fieldset>
          <legend>Antenna height</legend>
          <div className="choice-grid">
            {[2, 15, 30, 100].map((h) => (
              <button
                key={h}
                aria-pressed={s.transmitter.antenna.heightM === h}
                onClick={() => edit((s) => (s.transmitter.antenna.heightM = h))}
              >
                {h} m
              </button>
            ))}
          </div>
          <NumberField
            label="TX height / m"
            value={s.transmitter.antenna.heightM}
            min={0}
            max={extreme ? 20000 : 1000}
            step={0.1}
            onChange={(v) => edit((s) => (s.transmitter.antenna.heightM = v))}
          />
          <NumberField
            label="RX height / m"
            value={s.receiver.antenna.heightM}
            min={0}
            max={extreme ? 20000 : 1000}
            step={0.1}
            onChange={(v) => edit((s) => (s.receiver.antenna.heightM = v))}
          />
        </fieldset>
      )}
      {show("mode") && (
        <label>
          Communication mode
          <select
            value={s.modeId}
            onChange={(e) =>
              edit((s) => {
                s.modeId = e.target.value;
                s.receiver.bandwidthHz =
                  MODE_PROFILES[e.target.value].bandwidthHz;
              })
            }
          >
            {Object.entries(MODE_PROFILES).map(([id, p]) => (
              <option key={id} value={id}>
                {p.label}
              </option>
            ))}
          </select>
          <small>
            Loads the mode's reference bandwidth. Thresholds are educational
            approximations.
          </small>
        </label>
      )}
      {show("bandwidth") && (
        <fieldset>
          <legend>Receiver bandwidth</legend>
          <div className="choice-grid">
            {[50, 500, 2400, 12500].map((b) => (
              <button
                key={b}
                aria-pressed={s.receiver.bandwidthHz === b}
                onClick={() => edit((s) => (s.receiver.bandwidthHz = b))}
              >
                {b} Hz
              </button>
            ))}
          </div>
          <NumberField
            label="Bandwidth / Hz"
            value={s.receiver.bandwidthHz}
            min={1}
            max={1e7}
            step={1}
            onChange={(v) => edit((s) => (s.receiver.bandwidthHz = v))}
          />
        </fieldset>
      )}
      {show("noise") && (
        <>
          <NumberField
            label="Noise figure / dB"
            value={s.receiver.noiseFigureDb}
            min={0}
            max={40}
            step={0.1}
            onChange={(v) => edit((s) => (s.receiver.noiseFigureDb = v))}
          />
          <NumberField
            label="External noise excess / dB"
            value={s.environment.externalNoiseDb ?? 0}
            min={0}
            max={80}
            step={0.1}
            onChange={(v) => edit((s) => (s.environment.externalNoiseDb = v))}
          />
        </>
      )}
      {show("feedline") && (
        <fieldset>
          <legend>Feedline loss</legend>
          <NumberField
            label="TX cable loss / dB"
            value={s.transmitter.feedline.lossDb}
            min={0}
            max={60}
            step={0.1}
            onChange={(v) => edit((s) => (s.transmitter.feedline.lossDb = v))}
          />
          <NumberField
            label="RX cable loss / dB"
            value={s.receiver.feedline.lossDb}
            min={0}
            max={60}
            step={0.1}
            onChange={(v) => edit((s) => (s.receiver.feedline.lossDb = v))}
          />
          <p>
            These are total cable losses. Use the antenna workbench to explore
            length, quality, and frequency.
          </p>
        </fieldset>
      )}
      {show("polarization") && (
        <fieldset>
          <legend>Polarization</legend>
          {(["transmitter", "receiver"] as const).map((end) => (
            <label key={end}>
              {end === "transmitter" ? "TX" : "RX"} polarization
              <select
                value={s[end].antenna.polarization}
                onChange={(e) =>
                  edit(
                    (s) =>
                      (s[end].antenna.polarization = e.target
                        .value as typeof s.transmitter.antenna.polarization),
                  )
                }
              >
                {["vertical", "horizontal", "circular", "unknown"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      )}
      {show("terrain") && s.environment.model === "vhf-terrain" && (
        <fieldset>
          <legend>The hill department</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={!!s.environment.obstruction}
              onChange={(e) =>
                edit((s) => {
                  if (s.environment.model === "vhf-terrain") {
                    if (e.target.checked)
                      s.environment.obstruction = {
                        fraction: 0.5,
                        altitudeM: 20,
                      };
                    else delete s.environment.obstruction;
                  }
                })
              }
            />
            Put a ridge in the path
          </label>
          {s.environment.obstruction && (
            <>
              <NumberField
                label="Ridge altitude / m AMSL"
                value={s.environment.obstruction.altitudeM}
                min={-100}
                max={5000}
                onChange={(v) =>
                  edit((s) => {
                    if (
                      s.environment.model === "vhf-terrain" &&
                      s.environment.obstruction
                    )
                      s.environment.obstruction.altitudeM = v;
                  })
                }
              />
              <NumberField
                label="Ridge position / fraction of path"
                value={s.environment.obstruction.fraction}
                min={0.01}
                max={0.99}
                step={0.01}
                onChange={(v) =>
                  edit((s) => {
                    if (
                      s.environment.model === "vhf-terrain" &&
                      s.environment.obstruction
                    )
                      s.environment.obstruction.fraction = v;
                  })
                }
              />
            </>
          )}
        </fieldset>
      )}
      {show("time") && (
        <fieldset>
          <legend>Time and sky</legend>
          <label>
            Simulation time / UTC
            <input
              type="datetime-local"
              value={s.time.utcIso.slice(0, 16)}
              onChange={(e) => {
                if (e.target.value)
                  edit(
                    (s) =>
                      (s.time.utcIso = new Date(
                        e.target.value + "Z",
                      ).toISOString()),
                  );
              }}
            />
          </label>
          <p>
            Time changes synthetic ionospheric conditions. This is not live
            space weather.
          </p>
        </fieldset>
      )}
    </div>
  );
}
