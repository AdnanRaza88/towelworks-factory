import type { Worker } from "@/lib/factory/types";
import { rateFor } from "@/lib/factory/rates";
import { uid, todayStr } from "@/lib/factory/calc";
import type { StoreGet, StoreSet } from "../types";

export function createWorkersSlice(set: StoreSet, get: StoreGet) {
  return {
    addWorker: (name: string, role: Worker["role"], type: Worker["type"]) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const w: Worker = {
        id: uid(),
        name: trimmed,
        role,
        type,
        active: true,
        ratePer100: rateFor(role, get().settings),
        createdAt: todayStr(),
      };
      set((s) => ({ workers: [...s.workers, w] }));
      get().appendAudit("create", "worker", `${w.name} (${role}/${type})`);
      return w.id;
    },
    updateWorker: (id: string, patch: Partial<Worker>) => {
      if (!get().workers.some((w) => w.id === id)) return false;
      set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
      return true;
    },
    toggleWorker: (id: string) =>
      set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, active: !w.active } : w)) })),
    markAttendance: (workerId: string, status: import("@/lib/factory/types").AttendanceStatus, date = todayStr()) => {
      set((s) => {
        const existing = s.attendance.find((a) => a.workerId === workerId && a.date === date);
        if (existing) return { attendance: s.attendance.map((a) => (a.id === existing.id ? { ...a, status } : a)) };
        return { attendance: [...s.attendance, { id: uid(), workerId, date, status }] };
      });
      get().appendAudit("attendance", workerId, `${date}:${status}`);
    },
  };
}
