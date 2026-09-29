import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWorkerDetail,
  forWorker,
  presentDays,
  productionTotals,
  sortByDateDesc,
} from "./workerDetail.ts";
import type { Worker } from "./types.ts";

const worker: Worker = {
  id: "w1",
  name: "Imran",
  role: "tailor",
  type: "permanent",
  active: true,
  ratePer100: 25,
  createdAt: "2026-09-01",
};

const other = { workerId: "w2", date: "2026-09-29" };

describe("forWorker", () => {
  it("keeps only matching workerId", () => {
    const rows = [{ workerId: "w1", date: "2026-09-28" }, other];
    assert.equal(forWorker(rows, "w1").length, 1);
  });
});

describe("sortByDateDesc", () => {
  it("orders newest date first", () => {
    const rows = [
      { date: "2026-09-20" },
      { date: "2026-09-29" },
      { date: "2026-09-25" },
    ];
    assert.deepEqual(
      sortByDateDesc(rows).map((r) => r.date),
      ["2026-09-29", "2026-09-25", "2026-09-20"]
    );
  });
});

describe("productionTotals", () => {
  it("sums pieces and pay", () => {
    const t = productionTotals([
      { roundedPieces: 2500, amount: 625 },
      { roundedPieces: 500, amount: 75 },
    ]);
    assert.equal(t.pieces, 3000);
    assert.equal(t.prodPay, 700);
  });
});

describe("presentDays", () => {
  it("counts present and half only", () => {
    assert.equal(
      presentDays([
        { status: "present" },
        { status: "half" },
        { status: "absent" },
        { status: "off" },
      ]),
      2
    );
  });
});

describe("buildWorkerDetail", () => {
  it("aggregates one worker and ignores others", () => {
    const d = buildWorkerDetail(
      worker,
      [
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
        },
        {
          id: "p2",
          workerId: "w2",
          machineId: 1,
          role: "tailor",
          date: "2026-09-29",
          rawPieces: 9999,
          roundedPieces: 9999,
          ratePer100: 25,
          amount: 999,
        },
      ],
      [
        { id: "c1", workerId: "w1", date: "2026-09-29", type: "advance", amount: 200 },
        { id: "c2", workerId: "w1", date: "2026-09-20", type: "return", amount: 50 },
      ],
      [
        { id: "a1", workerId: "w1", date: "2026-09-29", status: "present" },
        { id: "a2", workerId: "w1", date: "2026-09-28", status: "absent" },
      ],
      [
        { id: "s1", workerId: "w1", machineId: 3, role: "tailor", date: "2026-09-28" },
        { id: "s2", workerId: "w2", machineId: 1, role: "helper", date: "2026-09-29" },
      ]
    );
    assert.equal(d.production.length, 1);
    assert.equal(d.cash.length, 2);
    assert.equal(d.sessions.length, 1);
    assert.equal(d.pieces, 2500);
    assert.equal(d.prodPay, 625);
    assert.equal(d.cashOut, 150);
    assert.equal(d.net, 475);
    assert.equal(d.daysPresent, 1);
    assert.equal(d.cash[0].date, "2026-09-29");
  });
});
