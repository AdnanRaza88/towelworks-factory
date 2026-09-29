import type { ProductionEntry, WorkSession } from "@/lib/factory/types";
import { roundNearest500, calcAmount, uid, todayStr } from "@/lib/factory/calc";
import { resolveRate } from "@/lib/factory/rates";
import { applyCorrect, applyVoid } from "@/lib/factory/corrections";
import type { StoreGet, StoreSet } from "../types";

export function createProductionSlice(set: StoreSet, get: StoreGet) {
  return {
    openSession: (workerId: string, machineId: number, role: WorkSession["role"], date = todayStr()) => {
      const worker = get().workers.find((w) => w.id === workerId);
      if (!worker) return null;
      const clash = get().sessions.find((s) => s.machineId === machineId && s.date === date && s.role === role);
      if (clash) {
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === clash.id ? { ...x, workerId, role } : x)) }));
        return clash.id;
      }
      const session: WorkSession = { id: uid(), workerId, machineId, role, date };
      set((s) => ({ sessions: [...s.sessions, session] }));
      return session.id;
    },
    addProduction: (workerId: string, machineId: number, role: ProductionEntry["role"], rawPieces: number, date = todayStr(), note?: string, sessionId?: string) => {
      const worker = get().workers.find((w) => w.id === workerId);
      if (!worker) return;
      const rate = resolveRate(role, date, get().rateHistory, get().settings);
      const rounded = roundNearest500(rawPieces);
      const amount = calcAmount(rounded, rate);
      const entry: ProductionEntry = { id: uid(), workerId, machineId, role, sessionId, date, rawPieces, roundedPieces: rounded, ratePer100: rate, amount, note };
      set((s) => ({ production: [...s.production, entry] }));
      get().appendAudit("production", worker.name, `M${machineId} ${role} ${rawPieces}->${rounded} Rs.${amount}`);
    },
    voidProduction: (id: string) => {
      const entry = get().production.find((p) => p.id === id);
      if (!entry) return false;
      const next = applyVoid(entry);
      if (!next) return false;
      set((s) => ({ production: s.production.map((p) => (p.id === id ? next : p)) }));
      const worker = get().workers.find((w) => w.id === entry.workerId);
      get().appendAudit("void", worker?.name ?? entry.workerId, `${id} Rs.${entry.amount}`);
      return true;
    },
    correctProduction: (id: string, rawPieces: number) => {
      const entry = get().production.find((p) => p.id === id);
      if (!entry) return false;
      const result = applyCorrect(entry, rawPieces);
      if (!result) return false;
      set((s) => ({
        production: [
          ...s.production.map((p) => (p.id === id ? result.voided : p)),
          result.correction,
        ],
      }));
      const worker = get().workers.find((w) => w.id === entry.workerId);
      get().appendAudit(
        "correct",
        worker?.name ?? entry.workerId,
        `${id}->${result.correction.id} ${entry.rawPieces}->${result.correction.rawPieces} Rs.${result.correction.amount}`
      );
      return true;
    },
  };
}
