import {
  AuditEntry, DEFAULT_SETTINGS, APP_VERSION,
  type AgentModel, type NeedleStatus, type SlipPhoto,
} from "@/lib/factory/types";
import { uid, getWeekRange, todayStr } from "@/lib/factory/calc";
import { buildWorkbook } from "@/lib/factory/excel";
import type { StoreGet, StoreSet, VoiceAction } from "../types";
import { initial, PERSIST_VERSION } from "../seed";

export function createBackupVoiceSlice(set: StoreSet, get: StoreGet) {
  return {
    appendAudit: (action: string, entity: string, detail: string) => {
      const entry: AuditEntry = { id: uid(), at: new Date().toISOString(), action, entity, detail };
      set((s) => ({ audit: [entry, ...s.audit].slice(0, 500) }));
    },
    setGeminiKey: (key: string) => set((s) => ({ settings: { ...s.settings, geminiApiKey: key.trim() } })),
    setAgentModel: (model: AgentModel) => set((s) => ({ settings: { ...s.settings, agentModel: model } })),
    setNeedleStatus: (status: NeedleStatus) => set((s) => ({ settings: { ...s.settings, needleStatus: status } })),
    addSlip: (note: string, dataUrl?: string, workerId?: string) => {
      const slip: SlipPhoto = {
        id: uid(),
        createdAt: new Date().toISOString(),
        note: note.trim() || "slip",
        workerId,
        dataUrl: dataUrl?.slice(0, 120_000),
      };
      set((s) => ({ slips: [slip, ...(s.slips ?? [])].slice(0, 40) }));
      get().appendAudit("slip", workerId ?? "mill", slip.note.slice(0, 80));
      return slip.id;
    },
    setTheme: (theme: "light" | "dark") => {
      set((s) => ({ settings: { ...s.settings, theme } }));
      if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", theme);
    },
    setMillName: (name: string) => set((s) => ({ settings: { ...s.settings, millName: name.trim() || s.settings.millName } })),
    exportBackup: () => {
      const { settings, workers, sessions, attendance, production, cash, rateHistory, audit, slips, version } = get();
      return JSON.stringify({
        version,
        settings: { ...settings, geminiApiKey: "" },
        workers, sessions, attendance, production, cash, rateHistory, audit,
        slips: (slips ?? []).map((x) => ({ ...x, dataUrl: undefined })),
        exportedAt: new Date().toISOString(),
      }, null, 2);
    },
    importBackup: (json: string) => {
      try {
        const data = JSON.parse(json);
        if (!data.workers || !data.settings) return false;
        set({
          version: data.version ?? PERSIST_VERSION,
          settings: {
            ...DEFAULT_SETTINGS,
            ...data.settings,
            geminiApiKey: data.settings.geminiApiKey || get().settings.geminiApiKey,
            appVersion: APP_VERSION,
            theme: data.settings.theme ?? "light",
            agentModel: data.settings.agentModel ?? "offline",
            needleStatus: data.settings.needleStatus ?? "none",
          },
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
          slips: data.slips ?? [],
        });
        return true;
      } catch { return false; }
    },
    exportWorkerSheet: (workerId?: string) => {
      const { workers, production, cash, attendance, sessions } = get();
      const week = getWeekRange(todayStr());
      return buildWorkbook(
        { workers, production, cash, attendance, sessions },
        { workerId, weekStart: week.start, weekEnd: week.end }
      );
    },
    resetDemo: () => set({
      ...initial,
      unlocked: true,
      settings: {
        ...DEFAULT_SETTINGS,
        geminiApiKey: get().settings.geminiApiKey,
        appVersion: APP_VERSION,
        theme: get().settings.theme ?? "light",
        agentModel: get().settings.agentModel ?? "offline",
        needleStatus: get().settings.needleStatus ?? "none",
      },
    }),
    applyVoiceAction: (action: VoiceAction) => {
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
        const list = action.workerName ? findWorker(action.workerName) : state.workers.filter((w) => w.active);
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
  };
}
