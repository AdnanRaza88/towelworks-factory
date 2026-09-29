import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AppState,
  AuditEntry, DEFAULT_SETTINGS, APP_VERSION,
} from "@/lib/factory/types";
import { uid, todayStr } from "@/lib/factory/calc";
import type { AppStore, VoiceAction } from "./types";
import { initial, PERSIST_NAME, PERSIST_VERSION } from "./seed";
import { createPinSlice } from "./slices/pinSlice";
import { createWorkersSlice } from "./slices/workersSlice";
import { createProductionSlice } from "./slices/productionSlice";
import { createCashRatesSlice } from "./slices/cashRatesSlice";

export type { VoiceAction } from "./types";

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initial,
      ...createPinSlice(set, get),
      ...createWorkersSlice(set, get),
      ...createProductionSlice(set, get),
      ...createCashRatesSlice(set, get),
      appendAudit: (action, entity, detail) => {
        const entry: AuditEntry = { id: uid(), at: new Date().toISOString(), action, entity, detail };
        set((s) => ({ audit: [entry, ...s.audit].slice(0, 500) }));
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
            version: data.version ?? PERSIST_VERSION,
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
      name: PERSIST_NAME,
      version: PERSIST_VERSION,
      migrate: (persisted: unknown) => {
        const p = persisted as Partial<AppState>;
        return {
          ...initial,
          ...p,
          version: PERSIST_VERSION,
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
