import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyCorrect,
  applyVoid,
  isLiveProduction,
  liveProduction,
} from "./corrections.ts";
import type { ProductionEntry } from "./types.ts";

const entry: ProductionEntry = {
  id: "p1",
  workerId: "w1",
  machineId: 3,
  role: "tailor",
  date: "2026-09-28",
  rawPieces: 2500,
  roundedPieces: 2500,
  ratePer100: 25,
  amount: 625,
};

describe("isLiveProduction", () => {
  it("treats missing voided as live", () => {
    assert.equal(isLiveProduction(entry), true);
    assert.equal(isLiveProduction({ voided: true }), false);
  });
});

describe("liveProduction", () => {
  it("drops voided rows", () => {
    const rows = [entry, { ...entry, id: "p2", voided: true }];
    assert.equal(liveProduction(rows).length, 1);
    assert.equal(liveProduction(rows)[0].id, "p1");
  });
});

describe("applyVoid", () => {
  it("marks live entry voided and refuses a second void", () => {
    const v = applyVoid(entry);
    assert.ok(v);
    assert.equal(v?.voided, true);
    assert.equal(v?.amount, 625);
    assert.equal(applyVoid(v!), null);
  });
});

describe("applyCorrect", () => {
  it("voids original and keeps original rate", () => {
    const result = applyCorrect(entry, 1800, "p2");
    assert.ok(result);
    assert.equal(result?.voided.voided, true);
    assert.equal(result?.voided.id, "p1");
    assert.equal(result?.correction.id, "p2");
    assert.equal(result?.correction.correctedFrom, "p1");
    assert.equal(result?.correction.ratePer100, 25);
    assert.equal(result?.correction.roundedPieces, 2000);
    assert.equal(result?.correction.amount, 500);
    assert.equal(result?.correction.date, "2026-09-28");
    assert.equal(result?.correction.machineId, 3);
  });

  it("refuses voided or non-positive pieces", () => {
    assert.equal(applyCorrect({ ...entry, voided: true }, 2000, "x"), null);
    assert.equal(applyCorrect(entry, 0, "x"), null);
    assert.equal(applyCorrect(entry, -10, "x"), null);
  });
});
