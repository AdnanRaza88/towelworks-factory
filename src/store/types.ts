import type {
  AppState, Worker, WorkerRole, WorkerType, CashType, AttendanceStatus,
} from "@/lib/factory/types";

export type VoiceAction =
  | { type: "attendance"; workerName: string; status: AttendanceStatus }
  | { type: "production"; workerName?: string; machineId: number; role?: WorkerRole; pieces: number }
  | { type: "cash"; workerName: string; cashType: CashType; amount: number }
  | { type: "add_worker"; name: string; role: WorkerRole; workerType: WorkerType }
  | { type: "session"; workerName: string; machineId: number; role: WorkerRole }
  | { type: "query"; topic: string };

export interface Actions {
  unlock: (pin: string) => boolean;
  lock: () => void;
  setPin: (current: string, next: string) => boolean;
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

export type AppStore = AppState & Actions;

export type StoreSet = (
  partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>),
) => void;

export type StoreGet = () => AppStore;

export const isFourDigitPin = (pin: string) => /^\d{4}$/.test(pin);
