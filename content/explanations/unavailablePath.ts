export function unavailableHfExplanation(frequencyHz: number, mufMHz?: number, localHour?: number, criticalMHz?: number) {
  if (mufMHz === undefined) return "This frequency exceeds the configured HF path limit. This simplified scenario does not describe current real-world band conditions.";
  const inputs = localHour !== undefined && criticalMHz !== undefined
    ? ` The engine uses local solar hour ${localHour.toFixed(2)} and a configured critical frequency of ${criticalMHz.toFixed(2)} MHz.`
    : "";
  return `${Number((frequencyHz / 1e6).toFixed(3))} MHz exceeds this scenario's modeled ${mufMHz.toFixed(2)} MHz path limit.${inputs} No returning HF path is modeled. This is a simplified scenario, not a statement about real-world HF conditions or live ionospheric data.`;
}
