/** Round quantity to nearest 500 (standard mill practice). */
export function roundNearest500(pieces: number): number {
  if (!Number.isFinite(pieces) || pieces <= 0) return 0;
  return Math.round(pieces / 500) * 500;
}

/** Pay amount from rounded pieces and rate per 100. */
export function calcAmount(roundedPieces: number, ratePer100: number): number {
  if (roundedPieces <= 0 || ratePer100 <= 0) return 0;
  return Math.round((roundedPieces / 100) * ratePer100);
}

/** Saturday-Friday week boundaries for a given date (local). */
export function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const sinceSat = (day + 1) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - sinceSat);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: toDateStr(start),
    end: toDateStr(end),
  };
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
