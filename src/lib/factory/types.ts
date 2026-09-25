export type WorkerRole = "tailor" | "helper";
export type WorkerType = "permanent" | "outside";
export type AttendanceStatus =
  | "present"
  | "absent"
  | "half"
  | "off"
  | "unscheduled";

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  type: WorkerType;
  active: boolean;
  ratePer100: number;
  createdAt: string;
  notes?: string;
}

export interface Machine {
  id: number;
  name: string;
}

export interface WorkSession {
  id: string;
  workerId: string;
  machineId: number;
  role: WorkerRole;
  date: string;
  note?: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}

export interface ProductionEntry {
  id: string;
  workerId: string;
  machineId: number;
  role: WorkerRole;
  sessionId?: string;
  date: string;
  rawPieces: number;
  roundedPieces: number;
  ratePer100: number;
  amount: number;
  note?: string;
}

export type CashType =
  | "advance"
  | "loan"
  | "deduction"
  | "return"
  | "settlement"
  | "payment";

export interface CashEntry {
  id: string;
  workerId: string;
  date: string;
  type: CashType;
  amount: number;
  note?: string;
}

export interface RateSnapshot {
  id: string;
  effectiveFrom: string;
  tailorRate: number;
  helperRate: number;
  setBy: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  entity: string;
  detail: string;
}

export interface AppSettings {
  pin: string;
  millName: string;
  tailorRate: number;
  helperRate: number;
  weekStart: "saturday";
  geminiApiKey: string;
  appVersion: string;
  theme: "light" | "dark";
}

export interface AppState {
  version: number;
  settings: AppSettings;
  workers: Worker[];
  sessions: WorkSession[];
  attendance: Attendance[];
  production: ProductionEntry[];
  cash: CashEntry[];
  rateHistory: RateSnapshot[];
  audit: AuditEntry[];
  unlocked: boolean;
}

export const MACHINES: Machine[] = Array.from({ length: 11 }, (_, i) => ({
  id: i + 1,
  name: `Machine ${i + 1}`,
}));

export const DEFAULT_SETTINGS: AppSettings = {
  pin: "1234",
  millName: "TowelWorks Demo Mill",
  tailorRate: 25,
  helperRate: 15,
  weekStart: "saturday",
  geminiApiKey: "",
  appVersion: "1.2.0",
  theme: "light",
};

export const APP_VERSION = "1.2.0";
