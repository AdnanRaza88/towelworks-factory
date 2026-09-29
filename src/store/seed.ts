import { AppState, Worker, DEFAULT_SETTINGS, APP_VERSION } from "@/lib/factory/types";

export const PERSIST_NAME = "towelworks-v2";
export const PERSIST_VERSION = 2;

export const SEED: Worker[] = [
  { id: "w1", name: "Imran", role: "tailor", type: "permanent", active: true, ratePer100: 25, createdAt: "2026-01-01" },
  { id: "w2", name: "Asif", role: "helper", type: "permanent", active: true, ratePer100: 15, createdAt: "2026-01-01" },
  { id: "w3", name: "Rashid", role: "tailor", type: "outside", active: true, ratePer100: 25, createdAt: "2026-01-01" },
];

export const initial: AppState = {
  version: PERSIST_VERSION,
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
