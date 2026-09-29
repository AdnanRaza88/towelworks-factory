import { MACHINES, Machine, ProductionEntry, WorkSession, Worker, WorkerRole } from "./types";

export type MachineSlot = {
  sessionId: string | null;
  workerId: string | null;
  workerName: string;
};

export type MachineBoardRow = {
  machine: Machine;
  tailor: MachineSlot;
  helper: MachineSlot;
  pieces: number;
  amount: number;
  busy: boolean;
};

const EMPTY_SLOT: MachineSlot = {
  sessionId: null,
  workerId: null,
  workerName: "",
};

export function workerName(workers: Pick<Worker, "id" | "name">[], id: string | null): string {
  if (!id) return "";
  return workers.find((w) => w.id === id)?.name ?? "";
}

export function slotFor(
  sessions: Pick<WorkSession, "id" | "workerId" | "machineId" | "role" | "date">[],
  workers: Pick<Worker, "id" | "name">[],
  machineId: number,
  role: WorkerRole,
  date: string
): MachineSlot {
  const hit = sessions.find((s) => s.machineId === machineId && s.role === role && s.date === date);
  if (!hit) return EMPTY_SLOT;
  return {
    sessionId: hit.id,
    workerId: hit.workerId,
    workerName: workerName(workers, hit.workerId),
  };
}

export function machineTotals(
  production: Pick<ProductionEntry, "machineId" | "date" | "roundedPieces" | "amount" | "voided">[],
  machineId: number,
  date: string
): { pieces: number; amount: number } {
  let pieces = 0;
  let amount = 0;
  for (const p of production) {
    if (p.voided || p.machineId !== machineId || p.date !== date) continue;
    pieces += p.roundedPieces;
    amount += p.amount;
  }
  return { pieces, amount };
}

export function buildMachineBoard(
  machines: Machine[] = MACHINES,
  sessions: Pick<WorkSession, "id" | "workerId" | "machineId" | "role" | "date">[],
  production: Pick<ProductionEntry, "machineId" | "date" | "roundedPieces" | "amount" | "voided">[],
  workers: Pick<Worker, "id" | "name">[],
  date: string
): MachineBoardRow[] {
  return machines.map((machine) => {
    const tailor = slotFor(sessions, workers, machine.id, "tailor", date);
    const helper = slotFor(sessions, workers, machine.id, "helper", date);
    const { pieces, amount } = machineTotals(production, machine.id, date);
    return {
      machine,
      tailor,
      helper,
      pieces,
      amount,
      busy: Boolean(tailor.workerId || helper.workerId || pieces > 0),
    };
  });
}

export function floorSummary(rows: MachineBoardRow[]): { busy: number; idle: number; pieces: number } {
  let busy = 0;
  let pieces = 0;
  for (const r of rows) {
    if (r.busy) busy += 1;
    pieces += r.pieces;
  }
  return { busy, idle: rows.length - busy, pieces };
}
