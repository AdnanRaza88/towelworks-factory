import {
  Attendance,
  CashEntry,
  ProductionEntry,
  WorkSession,
  Worker,
} from "./types.ts";
import { buildPayrollRows, totalNetPayable } from "./payroll.ts";

export type CsvValue = string | number | boolean | null | undefined;

export interface ExcelSource {
  workers: Worker[];
  production: ProductionEntry[];
  cash: CashEntry[];
  attendance: Attendance[];
  sessions: WorkSession[];
}

export interface ExcelOptions {
  workerId?: string;
  weekStart?: string;
  weekEnd?: string;
}

export function csvEscape(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\n");
}

function nameOf(workers: Worker[], id: string): string {
  return workers.find((w) => w.id === id)?.name ?? id;
}

export function filterSource(src: ExcelSource, workerId?: string): ExcelSource {
  if (!workerId) return src;
  return {
    workers: src.workers.filter((w) => w.id === workerId),
    production: src.production.filter((p) => p.workerId === workerId),
    cash: src.cash.filter((c) => c.workerId === workerId),
    attendance: src.attendance.filter((a) => a.workerId === workerId),
    sessions: src.sessions.filter((s) => s.workerId === workerId),
  };
}

export function workersSheet(workers: Worker[]): string {
  return toCsv(
    ["id", "name", "role", "type", "active", "ratePer100", "notes"],
    workers.map((w) => [w.id, w.name, w.role, w.type, w.active, w.ratePer100, w.notes ?? ""])
  );
}

export function productionSheet(workers: Worker[], production: ProductionEntry[]): string {
  return toCsv(
    ["id", "worker", "date", "machine", "role", "rawPieces", "roundedPieces", "ratePer100", "amount", "voided", "correctedFrom", "note"],
    production.map((p) => [
      p.id,
      nameOf(workers, p.workerId),
      p.date,
      p.machineId,
      p.role,
      p.rawPieces,
      p.roundedPieces,
      p.ratePer100,
      p.amount,
      p.voided ? "void" : "",
      p.correctedFrom ?? "",
      p.note ?? "",
    ])
  );
}

export function cashSheet(workers: Worker[], cash: CashEntry[]): string {
  return toCsv(
    ["id", "worker", "date", "type", "amount", "note"],
    cash.map((c) => [c.id, nameOf(workers, c.workerId), c.date, c.type, c.amount, c.note ?? ""])
  );
}

export function attendanceSheet(workers: Worker[], attendance: Attendance[]): string {
  return toCsv(
    ["id", "worker", "date", "status", "note"],
    attendance.map((a) => [a.id, nameOf(workers, a.workerId), a.date, a.status, a.note ?? ""])
  );
}

export function sessionsSheet(workers: Worker[], sessions: WorkSession[]): string {
  return toCsv(
    ["id", "worker", "date", "machine", "role", "note"],
    sessions.map((s) => [s.id, nameOf(workers, s.workerId), s.date, s.machineId, s.role, s.note ?? ""])
  );
}

export function payrollSheet(
  src: ExcelSource,
  weekStart: string,
  weekEnd: string
): string {
  const rows = buildPayrollRows(
    src.workers,
    src.production,
    src.cash,
    src.attendance,
    weekStart,
    weekEnd
  );
  const body = toCsv(
    ["worker", "role", "type", "daysPresent", "pieces", "prodPay", "cashOut", "net"],
    rows.map((r) => [
      r.worker.name,
      r.worker.role,
      r.worker.type,
      r.daysPresent,
      r.pieces,
      r.prodPay,
      r.cashOut,
      r.net,
    ])
  );
  const total = totalNetPayable(rows);
  return `${body}\nTOTAL,,,,,,,${csvEscape(total)}`;
}

export function buildWorkbook(src: ExcelSource, opts: ExcelOptions = {}): string {
  const data = filterSource(src, opts.workerId);
  const parts: string[] = ["TOWELWORKS EXCEL"];
  parts.push("WORKERS", workersSheet(data.workers), "");
  parts.push("PRODUCTION", productionSheet(data.workers, data.production), "");
  parts.push("CASH", cashSheet(data.workers, data.cash), "");
  parts.push("ATTENDANCE", attendanceSheet(data.workers, data.attendance), "");
  parts.push("SESSIONS", sessionsSheet(data.workers, data.sessions), "");
  if (opts.weekStart && opts.weekEnd) {
    parts.push(
      `PAYROLL ${opts.weekStart} ${opts.weekEnd}`,
      payrollSheet(data, opts.weekStart, opts.weekEnd),
      ""
    );
  }
  return parts.join("\n").trim() + "\n";
}
