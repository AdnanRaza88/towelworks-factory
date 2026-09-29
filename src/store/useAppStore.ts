import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AppState,
  DEFAULT_SETTINGS, APP_VERSION,
} from "@/lib/factory/types";
import type { AppStore } from "./types";
import { initial, PERSIST_NAME, PERSIST_VERSION } from "./seed";
import { createPinSlice } from "./slices/pinSlice";
import { createWorkersSlice } from "./slices/workersSlice";
import { createProductionSlice } from "./slices/productionSlice";
import { createCashRatesSlice } from "./slices/cashRatesSlice";
import { createBackupVoiceSlice } from "./slices/backupVoiceSlice";

export type { VoiceAction } from "./types";

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initial,
      ...createPinSlice(set, get),
      ...createWorkersSlice(set, get),
      ...createProductionSlice(set, get),
      ...createCashRatesSlice(set, get),
      ...createBackupVoiceSlice(set, get),
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
