import { ProductionEntry } from "./types";
import { calcAmount, roundNearest500, uid } from "./calc";

export function isLiveProduction(
  entry: Pick<ProductionEntry, "voided">
): boolean {
  return !entry.voided;
}

export function liveProduction<T extends Pick<ProductionEntry, "voided">>(
  rows: T[]
): T[] {
  return rows.filter(isLiveProduction);
}

export function applyVoid<T extends ProductionEntry>(entry: T): T | null {
  if (entry.voided) return null;
  return { ...entry, voided: true };
}

export function applyCorrect(
  entry: ProductionEntry,
  rawPieces: number,
  newId = uid()
): { voided: ProductionEntry; correction: ProductionEntry } | null {
  if (entry.voided) return null;
  if (!Number.isFinite(rawPieces) || rawPieces <= 0) return null;
  const rounded = roundNearest500(rawPieces);
  if (rounded <= 0) return null;
  const amount = calcAmount(rounded, entry.ratePer100);
  return {
    voided: { ...entry, voided: true },
    correction: {
      id: newId,
      workerId: entry.workerId,
      machineId: entry.machineId,
      role: entry.role,
      sessionId: entry.sessionId,
      date: entry.date,
      rawPieces,
      roundedPieces: rounded,
      ratePer100: entry.ratePer100,
      amount,
      note: entry.note,
      correctedFrom: entry.id,
    },
  };
}
