import type {
  Attendance,
  CashEntry,
  ProductionEntry,
  Worker,
  WorkerType,
} from "./types.ts";
import { cashOutTotal, netPayable } from "./cashRules.ts";

export interface LedgerRow {
  workerId: string;
  name: string;
  role: string;
  type: WorkerType;
  pieces: number;
  prodPay: number;
  cashOut: number;
  net: number;
  daysPresent: number;
  advances: number;
  loans: number;
}

function presentCount(
  attendance: Pick<Attendance, "workerId" | "status">[],
  workerId: string
): number {
  let n = 0;
  for (const a of attendance) {
    if (a.workerId !== workerId) continue;
    if (a.status === "present" || a.status === "half") n += 1;
  }
  return n;
}

export function buildLedgerRows(
  workers: Worker[],
  production: Pick<
    ProductionEntry,
    "workerId" | "roundedPieces" | "amount" | "voided"
  >[],
  cash: Pick<CashEntry, "workerId" | "type" | "amount">[],
  attendance: Pick<Attendance, "workerId" | "status">[],
  typeFilter?: WorkerType
): LedgerRow[] {
  const list = workers.filter(
    (w) => w.active && (!typeFilter || w.type === typeFilter)
  );
  return list.map((w) => {
    let pieces = 0;
    let prodPay = 0;
    for (const p of production) {
      if (p.voided || p.workerId !== w.id) continue;
      pieces += p.roundedPieces;
      prodPay += p.amount;
    }
    const mine = cash.filter((c) => c.workerId === w.id);
    const cashOut = cashOutTotal(mine);
    let advances = 0;
    let loans = 0;
    for (const c of mine) {
      if (c.type === "advance") advances += Math.abs(c.amount);
      if (c.type === "loan") loans += Math.abs(c.amount);
    }
    return {
      workerId: w.id,
      name: w.name,
      role: w.role,
      type: w.type,
      pieces,
      prodPay,
      cashOut,
      net: netPayable(prodPay, cashOut),
      daysPresent: presentCount(attendance, w.id),
      advances,
      loans,
    };
  });
}

export function ledgerTotals(rows: LedgerRow[]): {
  pieces: number;
  prodPay: number;
  cashOut: number;
  net: number;
} {
  return rows.reduce(
    (acc, r) => ({
      pieces: acc.pieces + r.pieces,
      prodPay: acc.prodPay + r.prodPay,
      cashOut: acc.cashOut + r.cashOut,
      net: acc.net + r.net,
    }),
    { pieces: 0, prodPay: 0, cashOut: 0, net: 0 }
  );
}
