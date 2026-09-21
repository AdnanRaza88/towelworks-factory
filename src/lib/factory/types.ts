export type WorkerRole = "tailor" | "helper";
export type WorkerType = "permanent" | "outside";

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  type: WorkerType;
  active: boolean;
  ratePer100: number;
  createdAt: string;
}

export interface Machine {
  id: number;
  name: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  present: boolean;
  note?: string;
}

export interface ProductionEntry {
  id: string;
  workerId: string;
  machineId: number;
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
  | "settlement";

export interface CashEntry {
  id: string;
  workerId: string;
  date: string;
  type: CashType;
  amount: number;
  note?: string;
}

export interface AppSettings {
  pin: string;
  millName: string;
  tailorRate: number;
  helperRate: number;
  weekStart: "saturday";
}

export interface AppState {
  version: number;
  settings: AppSettings;
  workers: Worker[];
  attendance: Attendance[];
  production: ProductionEntry[];
  cash: CashEntry[];
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
};
