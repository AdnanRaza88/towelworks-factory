import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AppState, Worker, Attendance, ProductionEntry, CashEntry, WorkSession,
  RateSnapshot, AuditEntry, DEFAULT_SETTINGS, APP_VERSION, WorkerRole,
  WorkerType, CashType, AttendanceStatus,
} from "@/lib/factory/types";
import { roundNearest500, calcAmount, uid, todayStr } from "@/lib/factory/calc";

const SEED: Worker[] = [
  { id: "w1", name: "Imran", role: "tailor", type: "permanent", active: true, ratePer100: 25, createdAt: "2026-01-01" },
  { id: "w2", name: "Asif", role: "helper", type: "permanent", active: true, ratePer100: 15, createdAt: "2026-01-01" },
  { id: "w3", name: "Rashid", role: "tailor", type: "outside", active: true, ratePer100: 25, createdAt: "2026-01-01" },
];

export type VoiceAction =
  | { type: "attendance"; workerName: string; status: AttendanceStatus }
  | { type: "production"; workerName?: string; machineId: number; role?: WorkerRole; pieces: number }
  | { type: "cash"; workerName: string; cashType: CashType; amount: number }
  | { type: "add_worker"; name: string; role: WorkerRole; workerType: WorkerType }
  | { type: "session"; workerName: string; machineId: number; role: WorkerRole }
  | { type: "query"; topic: string };

interface Actions {
  unlock: (pin: string) => boolean;
  lock: () => void;
  addWorker: (name: string, role: WorkerRole, type: WorkerType) => string | null;
  updateWorker: (id: string, patch: Partial<Worker>) => boolean;
  toggleWorker: (id: string) => void;
  markAttendance: (workerId: string, status: AttendanceStatus, date?: string) => void;
  openSession: (workerId: string, machineId: number, role: WorkerRole, date?: string) => string | null;
  addProduction: (workerId: string, machineId: number, role: WorkerRole, rawPieces: number, date?: string, note?: string, sessionId?: string) => void;
  addCash: (workerId: string, type: CashType, amount: number, date?: string, note?: string) => void;
  updateRates: (tailorRate: number, helperRate: number) => void;
  setGeminiKey: (key: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  setMillName: (name: string) => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
  exportWorkerSheet: (workerId?: string) => string;
  resetDemo: () => void;
  appendAudit: (action: string, entity: string, detail: string) => void;
  applyVoiceAction: (action: VoiceAction) => string;
}

function rateFor(role: WorkerRole, s: { tailorRate: number; helperRate: number }) {
  return role === "tailor" ? s.tailorRate : s.helperRate;
}

const initial: AppState = {
  version: 2,
  settings: { ...DEFAULT_SETTINGS, appVersion: APP_VERSION, theme: "light" },
  workers: SEED,
  sessions: [],
  attendance: [],
  production: [],
  cash: [],
  rateHistory: [{ id: "rate_seed", effectiveFrom: "2026-01-01", tailorRate: 25, helperRate: 15, setBy: "system" }],
  audit: [],
  unlocked: true,
};

export const useAppStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      unlock: () => { set({ unlocked: true }); return true; },
      lock: () => set({ unlocked: false }),
      appendAudit: (action, entity, detail) => {
        const entry: AuditEntry = { id: uid(), at: new Date().toISOString(), action, entity, detail };
        set((s) => ({ audit: [entry, ...s.audit].slice(0, 500) }));
      },
      addWorker: (name, role, type) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const w: Worker = { id: uid(), name: trimmed, role, type, active: true, ratePer100: rateFor(role, get().settings), createdAt: todayStr() };
        set((s) => ({ workers: [...s.workers, w] }));
        get().appendAudit("create", "worker", `${w.name} (${role}/${type})`);
        return w.id;
      },
      updateWorker: (id, patch) => {
        if (!get().workers.some((w) => w.id === id)) return false;
        set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
        return true;
      },
      toggleWorker: (id) => set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, active: !w.active } : w)) })),
      markAttendance: (workerId, status, date = todayStr()) => {
        set((s) => {
          const existing = s.attendance.find((a) => a.workerId === workerId && a.date === date);
          if (existing) return { attendance: s.attendance.map((a) => (a.id === existing.id ? { ...a, status } : a)) };
          return { attendance: [...s.attendance, { id: uid(), workerId, date, status }] };
        });
        get().appendAudit("attendance", workerId, `${date}:${status}`);
      },
      openSession: (workerId, machineId, role, date = todayStr()) => {
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
      addProduction: (workerId, machineId, role, rawPieces, date = todayStr(), note, sessionId) => {
        const worker = get().workers.find((w) => w.id === workerId);
        if (!worker) return;
        const rate = rateFor(role, get().settings);
        const rounded = roundNearest500(rawPieces);
        const amount = calcAmount(rounded, rate);
        const entry: ProductionEntry = { id: uid(), workerId, machineId, role, sessionId, date, rawPieces, roundedPieces: rounded, ratePer100: rate, amount, note };
        set((s) => ({ production: [...s.production, entry] }));
        get().appendAudit("production", worker.name, `M${machineId} ${role} ${rawPieces}->${rounded} Rs.${amount}`);
      },
      addCash: (workerId, type, amount, date = todayStr(), note) => {
        const entry: CashEntry = { id: uid(), workerId, date, type, amount: Math.abs(amount), note };
        set((s) => ({ cash: [...s.cash, entry] }));
      },
      updateRates: (tailorRate, helperRate) => {
        if (tailorRate <= 0 || helperRate <= 0) return;
        const snap: RateSnapshot = { id: uid(), effectiveFrom: todayStr(), tailorRate, helperRate, setBy: "admin" };
        set((s) => ({ settings: { ...s.settings, tailorRate, helperRate }, rateHistory: [snap, ...s.rateHistory] }));
      },
      setGeminiKey: (key) => set((s) => ({ settings: { ...s.settings, geminiApiKey: key.trim() } })),
      setTheme: (theme) => {
        set((s) => ({ settings: { ...s.settings, theme } }));
        if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", theme);
      },
      setMillName: (name) => set((s) => ({ settings: { ...s.settings, millName: name.trim() || s.settings.millName } })),
      exportBackup: () => {
        const { settings, workers, sessions, attendance, production, cash, rateHistory, audit, version } = get();
        return JSON.stringify({ version, settings: { ...settings, geminiApiKey: "" }, workers, sessions, attendance, production, cash, rateHistory, audit, exportedAt: new Date().toISOString() }, null, 2);
      },
      importBackup: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data.workers || !data.settings) return false;
          set({
            version: data.version ?? 2,
            settings: { ...DEFAULT_SETTINGS, ...data.settings, geminiApiKey: data.settings.geminiApiKey || get().settings.geminiApiKey, appVersion: APP_VERSION, theme: data.settings.theme ?? "light" },
            workers: data.workers,
            sessions: data.sessions ?? [],
            attendance: (data.attendance ?? []).map((a: Record<string, unknown>) => ({
              ...a,
              status: a.status ?? (a.present === true ? "present" : a.present === false ? "absent" : "unscheduled"),
            })),
            production: data.production ?? [],
            cash: data.cash ?? [],
            rateHistory: data.rateHistory ?? [],
            audit: data.audit ?? [],
          });
          return true;
        } catch { return false; }
      },
      exportWorkerSheet: (workerId) => {
        const { workers, production, cash, attendance, sessions } = get();
        const list = workerId ? workers.filter((w) => w.id === workerId) : workers;
        const lines = ["worker,type,role,date,kind,machine,session_role,pieces,amount,cash_type,attendance,note"];
        for (const w of list) {
          for (const a of attendance.filter((x) => x.workerId === w.id))
            lines.push([w.name, w.type, w.role, a.date, "attendance", "", "", "", "", "", a.status, a.note ?? ""].join(","));
          for (const s of sessions.filter((x) => x.workerId === w.id))
            lines.push([w.name, w.type, w.role, s.date, "session", s.machineId, s.role, "", "", "", "", s.note ?? ""].join(","));
          for (const p of production.filter((x) => x.workerId === w.id))
            lines.push([w.name, w.type, w.role, p.date, "production", p.machineId, p.role, p.roundedPieces, p.amount, "", "", p.note ?? ""].join(","));
          for (const c of cash.filter((x) => x.workerId === w.id))
            lines.push([w.name, w.type, w.role, c.date, "cash", "", "", "", c.amount, c.type, "", c.note ?? ""].join(","));
        }
        return lines.join("\n");
      },
      resetDemo: () => set({ ...initial, unlocked: true, settings: { ...DEFAULT_SETTINGS, geminiApiKey: get().settings.geminiApiKey, appVersion: APP_VERSION, theme: get().settings.theme ?? "light" } }),
      applyVoiceAction: (action) => {
        const state = get();
        const findWorker = (name: string) => {
          const n = name.toLowerCase().trim();
          return state.workers.filter((w) => w.active && (w.name.toLowerCase() === n || w.name.toLowerCase().includes(n)));
        };
        if (action.type === "attendance") {
          const m = findWorker(action.workerName);
          if (!m.length) return `Worker "${action.workerName}" nahi mila`;
          if (m.length > 1) return `Kai workers: ${m.map((x) => x.name).join(", ")}`;
          get().markAttendance(m[0].id, action.status);
          return `${m[0].name} ${action.status} mark ho gaya`;
        }
        if (action.type === "production") {
          let list = action.workerName ? findWorker(action.workerName) : state.workers.filter((w) => w.active);
          if (action.workerName && !list.length) return `Worker "${action.workerName}" nahi mila`;
          if (action.workerName && list.length > 1) return `Kai workers: ${list.map((x) => x.name).join(", ")}`;
          const w = list[0];
          if (!w) return "Koi active worker nahi";
          const role = action.role ?? w.role;
          get().addProduction(w.id, action.machineId, role, action.pieces);
          return `M${action.machineId}: ${action.pieces} piece ${w.name} (${role})`;
        }
        if (action.type === "cash") {
          const m = findWorker(action.workerName);
          if (!m.length) return `Worker "${action.workerName}" nahi mila`;
          if (m.length > 1) return `Kai workers: ${m.map((x) => x.name).join(", ")}`;
          get().addCash(m[0].id, action.cashType, action.amount);
          return `${m[0].name}: Rs.${action.amount} ${action.cashType}`;
        }
        if (action.type === "add_worker") {
          const id = get().addWorker(action.name, action.role, action.workerType);
          return id ? `Worker ${action.name} add ho gaya` : "Worker add nahi hua";
        }
        if (action.type === "session") {
          const m = findWorker(action.workerName);
          if (!m.length) return `Worker "${action.workerName}" nahi mila`;
          if (m.length > 1) return `Kai workers: ${m.map((x) => x.name).join(", ")}`;
          const sid = get().openSession(m[0].id, action.machineId, action.role);
          return sid ? `Session: ${m[0].name} M${action.machineId} as ${action.role}` : "Session fail";
        }
        if (action.type === "query") return `Query: ${action.topic}`;
        return "Samajh nahi aya";
      },
    }),
    {
      name: "towelworks-v2",
      version: 2,
      migrate: (persisted: unknown) => {
        const p = persisted as Partial<AppState>;
        return {
          ...initial,
          ...p,
          version: 2,
          sessions: p.sessions ?? [],
          rateHistory: p.rateHistory ?? initial.rateHistory,
          audit: p.audit ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}), appVersion: APP_VERSION, theme: (p.settings as { theme?: "light" | "dark" })?.theme ?? "light" },
          unlocked: true,
        } as AppState;
      },
      partialize: (s) => ({
        version: s.version, settings: s.settings, workers: s.workers, sessions: s.sessions,
        attendance: s.attendance, production: s.production, cash: s.cash, rateHistory: s.rateHistory, audit: s.audit,
      }),
    }
  )
);
