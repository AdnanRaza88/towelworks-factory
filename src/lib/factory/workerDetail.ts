import {
  Attendance,
  CashEntry,
  ProductionEntry,
  WorkSession,
  Worker,
} from "./types";
import { cashOutTotal, netPayable } from "./cashRules";
import { countsAsPresent } from "./payroll";

export function forWorker<T extends { workerId: string }>(
  rows: T[],
  workerId: string
): T[] {
  return rows.filter((r) => r.workerId === workerId);
}

export function sortByDateDesc<T extends { date: string }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function productionTotals(
  production: Pick<ProductionEntry, "roundedPieces" | "amount" | "voided">[]
): { pieces: number; prodPay: number } {
  let pieces = 0;
  let prodPay = 0;
  for (const p of production) {
    if (p.voided) continue;
    pieces += p.roundedPieces;
    prodPay += p.amount;
  }
  return { pieces, prodPay };
}

export function presentDays(
  attendance: Pick<Attendance, "status">[]
): number {
  let n = 0;
  for (const a of attendance) {
    if (countsAsPresent(a.status)) n += 1;
  }
  return n;
}

export interface WorkerDetail {
  worker: Worker;
  production: ProductionEntry[];
  cash: CashEntry[];
  attendance: Attendance[];
  sessions: WorkSession[];
  pieces: number;
  prodPay: number;
  cashOut: number;
  net: number;
  daysPresent: number;
}

export function buildWorkerDetail(
  worker: Worker,
  production: ProductionEntry[],
  cash: CashEntry[],
  attendance: Attendance[],
  sessions: WorkSession[]
): WorkerDetail {
  const prod = sortByDateDesc(forWorker(production, worker.id));
  const cashRows = sortByDateDesc(forWorker(cash, worker.id));
  const att = sortByDateDesc(forWorker(attendance, worker.id));
  const sess = sortByDateDesc(forWorker(sessions, worker.id));
  const { pieces, prodPay } = productionTotals(prod);
  const cashOut = cashOutTotal(cashRows);
  return {
    worker,
    production: prod,
    cash: cashRows,
    attendance: att,
    sessions: sess,
    pieces,
    prodPay,
    cashOut,
    net: netPayable(prodPay, cashOut),
    daysPresent: presentDays(att),
  };
}
