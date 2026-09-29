import type { CashEntry, RateSnapshot } from "@/lib/factory/types";
import { uid, todayStr } from "@/lib/factory/calc";
import { isValidCashAmount, normalizeCashAmount } from "@/lib/factory/cashRules";
import type { StoreGet, StoreSet } from "../types";

export function createCashRatesSlice(set: StoreSet, get: StoreGet) {
  return {
    addCash: (workerId: string, type: CashEntry["type"], amount: number, date = todayStr(), note?: string) => {
      if (!isValidCashAmount(amount)) return;
      const entry: CashEntry = { id: uid(), workerId, date, type, amount: normalizeCashAmount(amount), note };
      set((s) => ({ cash: [...s.cash, entry] }));
    },
    updateRates: (tailorRate: number, helperRate: number) => {
      if (tailorRate <= 0 || helperRate <= 0) return;
      const snap: RateSnapshot = { id: uid(), effectiveFrom: todayStr(), tailorRate, helperRate, setBy: "admin" };
      set((s) => ({
        settings: { ...s.settings, tailorRate, helperRate },
        rateHistory: [snap, ...s.rateHistory],
      }));
    },
  };
}
