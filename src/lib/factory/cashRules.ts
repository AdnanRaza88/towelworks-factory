import { CashEntry, CashType } from "./types";

export const CASH_DEBIT_TYPES: readonly CashType[] = [
  "advance",
  "loan",
  "deduction",
];

export const CASH_CREDIT_TYPES: readonly CashType[] = [
  "return",
  "settlement",
  "payment",
];

export function isCashDebit(type: CashType): boolean {
  return CASH_DEBIT_TYPES.includes(type);
}

export function isValidCashAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount !== 0;
}

export function normalizeCashAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.abs(amount);
}

/** Positive = reduces net payable (advance/loan/deduction). Negative = increases net (return/settlement/payment). */
export function cashSignedAmount(entry: Pick<CashEntry, "type" | "amount">): number {
  const amt = normalizeCashAmount(entry.amount);
  if (amt === 0) return 0;
  return isCashDebit(entry.type) ? amt : -amt;
}

export function cashOutTotal(entries: Pick<CashEntry, "type" | "amount">[]): number {
  return entries.reduce((sum, c) => sum + cashSignedAmount(c), 0);
}

export function netPayable(prodPay: number, cashOut: number): number {
  return prodPay - cashOut;
}
