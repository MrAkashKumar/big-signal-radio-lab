import type { PropagationPath, Scenario } from "../../../packages/contracts";
import { greatCircleDistanceM } from "../../../packages/propagation/src";

export function terrainProjection(scenario: Scenario) {
  const tx = scenario.transmitter;
  const rx = scenario.receiver;
  const obstruction =
    scenario.environment.model === "vhf-terrain"
      ? scenario.environment.obstruction
      : undefined;
  const distance = greatCircleDistanceM(tx.position, rx.position);
  const baseline = Math.min(tx.position.altitudeM, rx.position.altitudeM);
  const span = Math.max(
    20,
    tx.position.altitudeM + tx.antenna.heightM - baseline,
    rx.position.altitudeM + rx.antenna.heightM - baseline,
    (obstruction?.altitudeM ?? baseline) - baseline,
  );
  const height = (altitudeM: number) =>
    0.2 + ((altitudeM - baseline) * 3) / span;
  const horizontal = (fraction: number) =>
    obstruction
      ? fraction <= obstruction.fraction
        ? -4 + (4 * fraction) / obstruction.fraction
        : (4 * (fraction - obstruction.fraction)) / (1 - obstruction.fraction)
      : -4 + 8 * fraction;
  const ground = (x: number) => {
    const fraction = Math.max(0, Math.min(1, (x + 4) / 8));
    if (!obstruction)
      return height(
        tx.position.altitudeM +
          fraction * (rx.position.altitudeM - tx.position.altitudeM),
      );
    return x <= 0
      ? height(
          tx.position.altitudeM +
            Math.min(1, Math.max(0, (x + 4) / 4)) *
              (obstruction.altitudeM - tx.position.altitudeM),
        )
      : height(
          obstruction.altitudeM +
            Math.min(1, x / 4) *
              (rx.position.altitudeM - obstruction.altitudeM),
        );
  };
  return {
    ground,
    metresToScene: (metres: number) => (metres * 3) / span,
    stations: [tx, rx].map((station, i) => ({
      x: distance === 0 ? 0 : i === 0 ? -4 : 4,
      ground: height(station.position.altitudeM),
      tip: height(station.position.altitudeM + station.antenna.heightM),
    })),
    point(
      p: PropagationPath["points"][number],
    ): [number, number, number] | null {
      if (
        p.lat === undefined ||
        p.lon === undefined ||
        p.altitudeM === undefined
      )
        return null;
      const fraction =
        distance === 0
          ? 0
          : greatCircleDistanceM(tx.position, {
              latitudeDeg: p.lat,
              longitudeDeg: p.lon,
              altitudeM: p.altitudeM,
            }) / distance;
      return [
        distance === 0 ? 0 : horizontal(fraction),
        height(p.altitudeM),
        0,
      ];
    },
  };
}
