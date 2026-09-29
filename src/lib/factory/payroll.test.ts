import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPayrollRows,
  countsAsPresent,
  countPresentDays,
  inWeek,
  isVisiblePayrollRow,
  totalNetPayable,
  weekProductionTotals,
  workerPayrollRow,
} from "./payroll.ts";
import type { Worker } from "./types.ts";

const worker: Worker = {
  id: "w1",
  name: "Ali",
  role: "tailor",
  type: "permanent",
  active: true,
  ratePer100: 25,
  createdAt: "2026-01-01",
};

const idle: Worker = {
  ...worker,
  id: "w2",
  name: "Idle",
};

const inactive: Worker = {
  ...worker,
  id: "w3",
  name: "Gone",
  active: false,
};

describe("countsAsPresent", () => {
  it("present and half only", () => {
    assert.equal(countsAsPresent("present"), true);
    assert.equal(countsAsPresent("half"), true);
    assert.equal(countsAsPresent("absent"), false);
    assert.equal(countsAsPresent("off"), false);
    assert.equal(countsAsPresent("unscheduled"), false);
  });
});

describe("inWeek", () => {
  it("inclusive start and end", () => {
    assert.equal(inWeek("2026-09-26", "2026-09-26", "2026-10-02"), true);
    assert.equal(inWeek("2026-10-02", "2026-09-26", "2026-10-02"), true);
    assert.equal(inWeek("2026-09-25", "2026-09-26", "2026-10-02"), false);
  });
});

describe("weekProductionTotals + countPresentDays", () => {
  it("filters worker and week", () => {
    const totals = weekProductionTotals(
      [
        { workerId: "w1", date: "2026-09-27", amount: 400, roundedPieces: 1500 },
        { workerId: "w1", date: "2026-09-20", amount: 999, roundedPieces: 500 },
        { workerId: "w2", date: "2026-09-27", amount: 100, roundedPieces: 500 },
      ],
      "w1",
      "2026-09-26",
      "2026-10-02"
    );
    assert.equal(totals.pieces, 1500);
    assert.equal(totals.prodPay, 400);

    const days = countPresentDays(
      [
        { workerId: "w1", date: "2026-09-27", status: "present" },
        { workerId: "w1", date: "2026-09-28", status: "half" },
        { workerId: "w1", date: "2026-09-29", status: "absent" },
        { workerId: "w2", date: "2026-09-27", status: "present" },
      ],
      "w1",
      "2026-09-26",
      "2026-10-02"
    );
    assert.equal(days, 2);
  });
});

describe("workerPayrollRow", () => {
  it("uses cashRules net and present/half days", () => {
    const row = workerPayrollRow(
      worker,
      [{ workerId: "w1", date: "2026-09-27", amount: 2000, roundedPieces: 2000 }],
      [
        { workerId: "w1", date: "2026-09-27", type: "advance", amount: 1000 },
        { workerId: "w1", date: "2026-09-27", type: "return", amount: 150 },
      ],
      [
        { workerId: "w1", date: "2026-09-27", status: "present" },
        { workerId: "w1", date: "2026-09-28", status: "half" },
      ],
      "2026-09-26",
      "2026-10-02"
    );
    assert.equal(row.prodPay, 2000);
    assert.equal(row.cashOut, 850);
    assert.equal(row.net, 1150);
    assert.equal(row.daysPresent, 2);
    assert.equal(row.pieces, 2000);
  });
});

describe("buildPayrollRows", () => {
  it("drops inactive and empty rows", () => {
    const rows = buildPayrollRows(
      [worker, idle, inactive],
      [{ workerId: "w1", date: "2026-09-27", amount: 100, roundedPieces: 500 }],
      [],
      [],
      "2026-09-26",
      "2026-10-02"
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].worker.id, "w1");
    assert.equal(totalNetPayable(rows), 100);
    assert.equal(isVisiblePayrollRow({ pieces: 0, cashOut: 0, daysPresent: 0 }), false);
    assert.equal(isVisiblePayrollRow({ pieces: 0, cashOut: 10, daysPresent: 0 }), true);
  });
});
