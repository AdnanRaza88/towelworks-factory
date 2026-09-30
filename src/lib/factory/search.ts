import type {
  Attendance,
  CashEntry,
  ProductionEntry,
  WorkSession,
  Worker,
} from "./types.ts";

export type SearchKind =
  | "worker"
  | "production"
  | "cash"
  | "attendance"
  | "session";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  workerId: string;
  date?: string;
  title: string;
  detail: string;
  voided?: boolean;
}

export interface SearchSource {
  workers: Worker[];
  production: ProductionEntry[];
  cash: CashEntry[];
  attendance: Attendance[];
  sessions: WorkSession[];
}

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

export function matchesHay(hay: string, needle: string): boolean {
  if (!needle) return false;
  return hay.toLowerCase().includes(needle);
}

function workerName(workers: Worker[], id: string): string {
  return workers.find((w) => w.id === id)?.name ?? id;
}

export function searchFactory(query: string, src: SearchSource): SearchHit[] {
  const needle = normalizeQuery(query);
  if (!needle) return [];

  const hits: SearchHit[] = [];

  for (const w of src.workers) {
    const hay = [w.name, w.role, w.type, w.notes ?? "", w.active ? "active" : "inactive"].join(" ");
    if (!matchesHay(hay, needle)) continue;
    hits.push({
      kind: "worker",
      id: w.id,
      workerId: w.id,
      title: w.name,
      detail: `${w.role} · ${w.type}${w.active ? "" : " · inactive"}`,
    });
  }

  for (const p of src.production) {
    const hay = [
      workerName(src.workers, p.workerId),
      p.date,
      `m${p.machineId}`,
      `machine ${p.machineId}`,
      p.role,
      String(p.rawPieces),
      String(p.roundedPieces),
      p.note ?? "",
      p.voided ? "void" : "",
      p.correctedFrom ? "correction" : "",
    ].join(" ");
    if (!matchesHay(hay, needle)) continue;
    hits.push({
      kind: "production",
      id: p.id,
      workerId: p.workerId,
      date: p.date,
      title: `${workerName(src.workers, p.workerId)} · M${p.machineId}`,
      detail: `${p.date} · ${p.role} · ${p.roundedPieces}${p.voided ? " · void" : ""}`,
      voided: p.voided,
    });
  }

  for (const c of src.cash) {
    const hay = [
      workerName(src.workers, c.workerId),
      c.date,
      c.type,
      String(c.amount),
      c.note ?? "",
    ].join(" ");
    if (!matchesHay(hay, needle)) continue;
    hits.push({
      kind: "cash",
      id: c.id,
      workerId: c.workerId,
      date: c.date,
      title: `${workerName(src.workers, c.workerId)} · ${c.type}`,
      detail: `${c.date} · ${c.amount}`,
    });
  }

  for (const a of src.attendance) {
    const hay = [
      workerName(src.workers, a.workerId),
      a.date,
      a.status,
      a.note ?? "",
    ].join(" ");
    if (!matchesHay(hay, needle)) continue;
    hits.push({
      kind: "attendance",
      id: a.id,
      workerId: a.workerId,
      date: a.date,
      title: `${workerName(src.workers, a.workerId)} · ${a.status}`,
      detail: a.date,
    });
  }

  for (const s of src.sessions) {
    const hay = [
      workerName(src.workers, s.workerId),
      s.date,
      `m${s.machineId}`,
      `machine ${s.machineId}`,
      s.role,
      s.note ?? "",
    ].join(" ");
    if (!matchesHay(hay, needle)) continue;
    hits.push({
      kind: "session",
      id: s.id,
      workerId: s.workerId,
      date: s.date,
      title: `${workerName(src.workers, s.workerId)} · M${s.machineId}`,
      detail: `${s.date} · ${s.role}`,
    });
  }

  hits.sort((a, b) => {
    const da = a.date ?? "";
    const db = b.date ?? "";
    if (da !== db) return da < db ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
  return hits;
}
