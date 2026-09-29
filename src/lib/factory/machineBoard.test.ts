import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMachineBoard, floorSummary, machineTotals, slotFor } from "./machineBoard.ts";
import { MACHINES } from "./types.ts";

const workers = [
  { id: "w1", name: "Imran" },
  { id: "w2", name: "Asif" },
];

const sessions = [
  { id: "s1", workerId: "w1", machineId: 3, role: "tailor" as const, date: "2026-09-29" },
  { id: "s2", workerId: "w2", machineId: 3, role: "helper" as const, date: "2026-09-29" },
  { id: "s3", workerId: "w1", machineId: 1, role: "tailor" as const, date: "2026-09-28" },
];

const production = [
  { machineId: 3, date: "2026-09-29", roundedPieces: 2500, amount: 625 },
  { machineId: 3, date: "2026-09-29", roundedPieces: 500, amount: 75 },
  { machineId: 5, date: "2026-09-29", roundedPieces: 1000, amount: 250 },
  { machineId: 3, date: "2026-09-28", roundedPieces: 9999, amount: 1 },
];

describe("slotFor", () => {
  it("returns assigned worker for machine+role+date", () => {
    const slot = slotFor(sessions, workers, 3, "tailor", "2026-09-29");
    assert.equal(slot.workerId, "w1");
    assert.equal(slot.workerName, "Imran");
    assert.equal(slot.sessionId, "s1");
  });

  it("ignores other dates", () => {
    const slot = slotFor(sessions, workers, 1, "tailor", "2026-09-29");
    assert.equal(slot.workerId, null);
  });
});

describe("machineTotals", () => {
  it("sums only that machine and date", () => {
    const t = machineTotals(production, 3, "2026-09-29");
    assert.equal(t.pieces, 3000);
    assert.equal(t.amount, 700);
  });
});

describe("buildMachineBoard", () => {
  it("returns one row per machine", () => {
    const rows = buildMachineBoard(MACHINES, sessions, production, workers, "2026-09-29");
    assert.equal(rows.length, 11);
    const m3 = rows.find((r) => r.machine.id === 3);
    assert.ok(m3);
    assert.equal(m3?.tailor.workerName, "Imran");
    assert.equal(m3?.helper.workerName, "Asif");
    assert.equal(m3?.pieces, 3000);
    assert.equal(m3?.busy, true);
    const m2 = rows.find((r) => r.machine.id === 2);
    assert.equal(m2?.busy, false);
    const m5 = rows.find((r) => r.machine.id === 5);
    assert.equal(m5?.busy, true);
    assert.equal(m5?.pieces, 1000);
  });
});

describe("floorSummary", () => {
  it("counts busy vs idle", () => {
    const rows = buildMachineBoard(MACHINES, sessions, production, workers, "2026-09-29");
    const sum = floorSummary(rows);
    assert.equal(sum.busy, 2);
    assert.equal(sum.idle, 9);
    assert.equal(sum.pieces, 4000);
  });
});
