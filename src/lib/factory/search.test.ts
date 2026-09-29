import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeQuery, searchFactory } from "./search.ts";
import type { Worker, ProductionEntry, CashEntry, Attendance, WorkSession } from "./types.ts";

const workers: Worker[] = [
  {
    id: "w1",
    name: "Ali Tailor",
    role: "tailor",
    type: "permanent",
    active: true,
    ratePer100: 25,
    createdAt: "2026-01-01",
  },
  {
    id: "w2",
    name: "Bilal Helper",
    role: "helper",
    type: "outside",
    active: false,
    ratePer100: 15,
    createdAt: "2026-01-01",
    notes: "night shift",
  },
];

const production: ProductionEntry[] = [
  {
    id: "p1",
    workerId: "w1",
    machineId: 3,
    role: "tailor",
    date: "2026-09-28",
    rawPieces: 2500,
    roundedPieces: 2500,
    ratePer100: 25,
    amount: 625,
    note: "blue towels",
  },
  {
    id: "p2",
    workerId: "w1",
    machineId: 3,
    role: "tailor",
    date: "2026-09-27",
    rawPieces: 1000,
    roundedPieces: 1000,
    ratePer100: 25,
    amount: 250,
    voided: true,
  },
];

const cash: CashEntry[] = [
  {
    id: "c1",
    workerId: "w1",
    date: "2026-09-28",
    type: "advance",
    amount: 500,
    note: "eid",
  },
];

const attendance: Attendance[] = [
  { id: "a1", workerId: "w2", date: "2026-09-28", status: "half" },
];

const sessions: WorkSession[] = [
  { id: "s1", workerId: "w1", machineId: 3, role: "tailor", date: "2026-09-28" },
];

const src = { workers, production, cash, attendance, sessions };

describe("normalizeQuery", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeQuery("  Ali  "), "ali");
  });
});

describe("searchFactory", () => {
  it("returns empty for blank query", () => {
    assert.deepEqual(searchFactory("   ", src), []);
    assert.deepEqual(searchFactory("", src), []);
  });

  it("finds workers by name and inactive notes", () => {
    const byName = searchFactory("ali", src);
    assert.ok(byName.some((h) => h.kind === "worker" && h.id === "w1"));
    const night = searchFactory("night", src);
    assert.equal(night.length, 1);
    assert.equal(night[0].id, "w2");
  });

  it("finds production including voided and notes", () => {
    const towels = searchFactory("blue", src);
    assert.ok(towels.some((h) => h.id === "p1"));
    const voids = searchFactory("void", src);
    assert.ok(voids.some((h) => h.id === "p2" && h.voided));
  });

  it("finds cash type and attendance status", () => {
    assert.ok(searchFactory("advance", src).some((h) => h.id === "c1"));
    assert.ok(searchFactory("half", src).some((h) => h.id === "a1"));
  });

  it("finds sessions by machine", () => {
    const hits = searchFactory("machine 3", src);
    assert.ok(hits.some((h) => h.kind === "session" && h.id === "s1"));
    assert.ok(hits.some((h) => h.kind === "production"));
  });
});
