import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLedgerRows, ledgerTotals } from "./ledgerTables.ts";
import type { Worker } from "./types.ts";

const workers: Worker[] = [
  {
    id: "w1",
    name: "Imran",
    role: "tailor",
    type: "permanent",
    active: true,
    ratePer100: 25,
    createdAt: "2026-01-01",
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

describe("buildLedgerRows", () => {
  it("splits permanent vs outside and nets cash", () => {
    const rows = buildLedgerRows(
      workers,
      [
        {
          workerId: "w1",
          roundedPieces: 1000,
          amount: 250,
          voided: false,
        },
        {
          workerId: "w2",
          roundedPieces: 500,
          amount: 75,
          voided: false,
        },
      ],
      [
        { workerId: "w1", type: "advance", amount: 100 },
        { workerId: "w2", type: "loan", amount: 50 },
      ],
      [{ workerId: "w1", status: "present" }]
    );
    assert.equal(rows.length, 2);
    const imran = rows.find((r) => r.name === "Imran")!;
    assert.equal(imran.net, 150);
    assert.equal(imran.advances, 100);
    const outside = buildLedgerRows(
      workers,
      [],
      [],
      [],
      "outside"
    );
    assert.equal(outside.length, 1);
    assert.equal(outside[0].name, "Bilal");
  });

  it("totals rows", () => {
    const t = ledgerTotals([
      {
        workerId: "a",
        name: "A",
        role: "tailor",
        type: "permanent",
        pieces: 10,
        prodPay: 100,
        cashOut: 20,
        net: 80,
        daysPresent: 1,
        advances: 20,
        loans: 0,
      },
    ]);
    assert.equal(t.net, 80);
  });
});
