import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AppState,
  Worker,
  Attendance,
  ProductionEntry,
  CashEntry,
  DEFAULT_SETTINGS,
  WorkerRole,
  CashType,
} from "@/lib/factory/types";
import {
  roundNearest500,
  calcAmount,
  uid,
  todayStr,
} from "@/lib/factory/calc";

const SEED_WORKERS: Worker[] = [
  {
    id: "w1",
    name: "Imran",
    role: "tailor",
    type: "permanent",
    active: true,
    ratePer100: 25,
    createdAt: "2026-01-01",
  },
  {
    id: "w2",
    name: "Asif",
    role: "helper",
    type: "permanent",
    active: true,
    ratePer100: 15,
    createdAt: "2026-01-01",
  },
  {
    id: "w3",
    name: "Rashid",
    role: "tailor",
    type: "outside",
    active: true,
    ratePer100: 25,
    createdAt: "2026-01-01",
  },
];

interface Actions {
  unlock: (pin: string) => boolean;
  lock: () => void;
  addWorker: (name: string, role: WorkerRole, type: "permanent" | "outside") => void;
  toggleWorker: (id: string) => void;
  markAttendance: (workerId: string, present: boolean, date?: string) => void;
  addProduction: (
    workerId: string,
    machineId: number,
    rawPieces: number,
    date?: string,
    note?: string
  ) => void;
  addCash: (
    workerId: string,
    type: CashType,
    amount: number,
    date?: string,
    note?: string
  ) => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
  resetDemo: () => void;
}

const initial: AppState = {
  version: 1,
  settings: { ...DEFAULT_SETTINGS },
  workers: SEED_WORKERS,
  attendance: [],
  production: [],
  cash: [],
  unlocked: false,
};

export const useAppStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      unlock: (pin) => {
        if (pin === get().settings.pin) {
          set({ unlocked: true });
          return true;
        }
        return false;
      },

      lock: () => set({ unlocked: false }),

      addWorker: (name, role, type) => {
        const rate =
          role === "tailor"
            ? get().settings.tailorRate
            : get().settings.helperRate;
        const w: Worker = {
          id: uid(),
          name: name.trim(),
          role,
          type,
          active: true,
          ratePer100: rate,
          createdAt: todayStr(),
        };
        set((s) => ({ workers: [...s.workers, w] }));
      },

      toggleWorker: (id) => {
        set((s) => ({
          workers: s.workers.map((w) =>
            w.id === id ? { ...w, active: !w.active } : w
          ),
        }));
      },

      markAttendance: (workerId, present, date = todayStr()) => {
        set((s) => {
          const existing = s.attendance.find(
            (a) => a.workerId === workerId && a.date === date
          );
          if (existing) {
            return {
              attendance: s.attendance.map((a) =>
                a.id === existing.id ? { ...a, present } : a
              ),
            };
          }
          const entry: Attendance = {
            id: uid(),
            workerId,
            date,
            present,
          };
          return { attendance: [...s.attendance, entry] };
        });
      },

      addProduction: (workerId, machineId, rawPieces, date = todayStr(), note) => {
        const worker = get().workers.find((w) => w.id === workerId);
        if (!worker) return;
        const rounded = roundNearest500(rawPieces);
        const amount = calcAmount(rounded, worker.ratePer100);
        const entry: ProductionEntry = {
          id: uid(),
          workerId,
          machineId,
          date,
          rawPieces,
          roundedPieces: rounded,
          ratePer100: worker.ratePer100,
          amount,
          note,
        };
        set((s) => ({ production: [...s.production, entry] }));
      },

      addCash: (workerId, type, amount, date = todayStr(), note) => {
        const entry: CashEntry = {
          id: uid(),
          workerId,
          date,
          type,
          amount: Math.abs(amount),
          note,
        };
        set((s) => ({ cash: [...s.cash, entry] }));
      },

      exportBackup: () => {
        const { settings, workers, attendance, production, cash, version } =
          get();
        return JSON.stringify(
          { version, settings, workers, attendance, production, cash },
          null,
          2
        );
      },

      importBackup: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data.workers || !data.settings) return false;
          set({
            version: data.version ?? 1,
            settings: { ...DEFAULT_SETTINGS, ...data.settings },
            workers: data.workers,
            attendance: data.attendance ?? [],
            production: data.production ?? [],
            cash: data.cash ?? [],
          });
          return true;
        } catch {
          return false;
        }
      },

      resetDemo: () => set({ ...initial, unlocked: true }),
    }),
    {
      name: "towelworks-v1",
      partialize: (s) => ({
        version: s.version,
        settings: s.settings,
        workers: s.workers,
        attendance: s.attendance,
        production: s.production,
        cash: s.cash,
      }),
    }
  )
);
