export function clampConfidence(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function confLabel(x) {
  const v = clampConfidence(x);
  if (v >= 0.92) return "High";
  if (v >= 0.85) return "Med";
  return "Low";
}