import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  csvEscape,
  toCsv,
  filterSource,
  buildWorkbook,
  productionSheet,
  payrollSheet,
} from "./excel.ts";
import type { Worker, ProductionEntry, CashEntry, Attendance, WorkSession } from "./types.ts";

const workers: Worker[] = [
  {
    id: "w1",
    name: "Ali, Tailor",
    role: "tailor",
    type: "permanent",
    active: true,
    ratePer100: 25,
    createdAt: "2026-01-01",
    notes: 'said "ok"',
  },
  {
    id: "w2",
    name: "Bilal",
    role: "helper",
    type: "outside",
    active: true,
    ratePer100: 15,
    createdAt: "2026-01-01",
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
    note: "blue, towels",
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
  { id: "c1", workerId: "w1", date: "2026-09-28", type: "advance", amount: 100 },
];

const attendance: Attendance[] = [
  { id: "a1", workerId: "w1", date: "2026-09-28", status: "present" },
];

const sessions: WorkSession[] = [
  { id: "s1", workerId: "w1", machineId: 3, role: "tailor", date: "2026-09-28" },
];

const src = { workers, production, cash, attendance, sessions };

describe("csvEscape", () => {
  it("quotes commas quotes and blanks", () => {
    assert.equal(csvEscape("a,b"), '"a,b"');
    assert.equal(csvEscape('said "ok"'), '"said ""ok"""');
    assert.equal(csvEscape(undefined), "");
    assert.equal(csvEscape(12), "12");
  });
});

describe("toCsv", () => {
  it("joins header and rows", () => {
    const csv = toCsv(["a", "b"], [["x", "y,z"]]);
    assert.equal(csv, 'a,b\nx,"y,z"');
  });
});

describe("filterSource", () => {
  it("keeps one worker ledger", () => {
    const one = filterSource(src, "w2");
    assert.equal(one.workers.length, 1);
    assert.equal(one.production.length, 0);
    assert.equal(one.cash.length, 0);
  });
});

describe("productionSheet", () => {
  it("lists voided rows flagged and keeps stored amount", () => {
    const sheet = productionSheet(workers, production);
    assert.match(sheet, /p2,/);
    assert.match(sheet, /void/);
    assert.match(sheet, /250/);
    assert.match(sheet, /"Ali, Tailor"/);
  });
});

describe("payrollSheet", () => {
  it("skips voided production in week totals", () => {
    const sheet = payrollSheet(src, "2026-09-26", "2026-10-02");
    assert.match(sheet, /625/);
    assert.doesNotMatch(sheet.split("\n").find((l) => l.startsWith('"Ali')) ?? "", /,250,/);
  });
});

describe("buildWorkbook", () => {
  it("includes all sections and optional payroll week", () => {
    const book = buildWorkbook(src, { weekStart: "2026-09-26", weekEnd: "2026-10-02" });
    assert.match(book, /^TOWELWORKS EXCEL/);
    assert.match(book, /WORKERS/);
    assert.match(book, /PRODUCTION/);
    assert.match(book, /CASH/);
    assert.match(book, /ATTENDANCE/);
    assert.match(book, /SESSIONS/);
    assert.match(book, /PAYROLL 2026-09-26 2026-10-02/);
  });

  it("filters by workerId", () => {
    const book = buildWorkbook(src, { workerId: "w2" });
    assert.match(book, /Bilal/);
    assert.doesNotMatch(book, /p1/);
  });
});
