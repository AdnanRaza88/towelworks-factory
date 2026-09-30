import { RateSnapshot, WorkerRole } from "./types.ts";

export function rateFor(role: WorkerRole, s: { tailorRate: number; helperRate: number }) {
  return role === "tailor" ? s.tailorRate : s.helperRate;
}

export function resolveRate(
  role: WorkerRole,
  date: string,
  history: RateSnapshot[],
  settings: { tailorRate: number; helperRate: number }
) {
  const snap = history
    .filter((h) => h.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  if (snap) return rateFor(role, snap);
  return rateFor(role, settings);
}
