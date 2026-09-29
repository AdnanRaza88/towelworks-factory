import {
  Attendance,
  AttendanceStatus,
  CashEntry,
  ProductionEntry,
  Worker,
} from "./types";
import { cashOutTotal, netPayable } from "./cashRules";

export function countsAsPresent(status: AttendanceStatus): boolean {
  return status === "present" || status === "half";
}

export function inWeek(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function weekProductionTotals(
  production: Pick<ProductionEntry, "workerId" | "date" | "amount" | "roundedPieces" | "voided">[],
  workerId: string,
  start: string,
  end: string
): { pieces: number; prodPay: number } {
  let pieces = 0;
  let prodPay = 0;
  for (const p of production) {
    if (p.voided || p.workerId !== workerId || !inWeek(p.date, start, end)) continue;
    pieces += p.roundedPieces;
    prodPay += p.amount;
  }
  return { pieces, prodPay };
}

export function countPresentDays(
  attendance: Pick<Attendance, "workerId" | "date" | "status">[],
  workerId: string,
  start: string,
  end: string
): number {
  let n = 0;
  for (const a of attendance) {
    if (a.workerId !== workerId || !inWeek(a.date, start, end)) continue;
    if (countsAsPresent(a.status)) n += 1;
  }
  return n;
}

export function weekCashEntries<
  T extends Pick<CashEntry, "workerId" | "date">,
>(cash: T[], workerId: string, start: string, end: string): T[] {
  return cash.filter((c) => c.workerId === workerId && inWeek(c.date, start, end));
}

export interface PayrollRow {
  worker: Worker;
  pieces: number;
  prodPay: number;
  cashOut: number;
  net: number;
  daysPresent: number;
}

export function workerPayrollRow(
  worker: Worker,
  production: Pick<ProductionEntry, "workerId" | "date" | "amount" | "roundedPieces" | "voided">[],
  cash: Pick<CashEntry, "workerId" | "date" | "type" | "amount">[],
  attendance: Pick<Attendance, "workerId" | "date" | "status">[],
  start: string,
  end: string
): PayrollRow {
  const { pieces, prodPay } = weekProductionTotals(
    production,
    worker.id,
    start,
    end
  );
  const cashOut = cashOutTotal(weekCashEntries(cash, worker.id, start, end));
  return {
    worker,
    pieces,
    prodPay,
    cashOut,
    net: netPayable(prodPay, cashOut),
    daysPresent: countPresentDays(attendance, worker.id, start, end),
  };
}

export function isVisiblePayrollRow(
  row: Pick<PayrollRow, "pieces" | "cashOut" | "daysPresent">
): boolean {
  return row.pieces > 0 || row.cashOut !== 0 || row.daysPresent > 0;
}

export function buildPayrollRows(
  workers: Worker[],
  production: Pick<ProductionEntry, "workerId" | "date" | "amount" | "roundedPieces" | "voided">[],
  cash: Pick<CashEntry, "workerId" | "date" | "type" | "amount">[],
  attendance: Pick<Attendance, "workerId" | "date" | "status">[],
  start: string,
  end: string
): PayrollRow[] {
  return workers
    .filter((w) => w.active)
    .map((w) => workerPayrollRow(w, production, cash, attendance, start, end))
    .filter(isVisiblePayrollRow);
}

export function totalNetPayable(rows: Pick<PayrollRow, "net">[]): number {
  return rows.reduce((s, r) => s + r.net, 0);
}
