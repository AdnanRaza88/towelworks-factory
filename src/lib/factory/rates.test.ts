import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rateFor, resolveRate } from "./rates.ts";
import type { RateSnapshot } from "./types.ts";

const live = { tailorRate: 30, helperRate: 18 };

const history: RateSnapshot[] = [
  { id: "r2", effectiveFrom: "2026-06-01", tailorRate: 28, helperRate: 16, setBy: "admin" },
  { id: "r1", effectiveFrom: "2026-01-01", tailorRate: 25, helperRate: 15, setBy: "system" },
];

describe("rateFor", () => {
  it("picks tailor or helper from live settings", () => {
    assert.equal(rateFor("tailor", live), 30);
    assert.equal(rateFor("helper", live), 18);
  });
});

describe("resolveRate", () => {
  it("falls back to live settings when history is empty", () => {
    assert.equal(resolveRate("tailor", "2026-03-01", [], live), 30);
    assert.equal(resolveRate("helper", "2026-03-01", [], live), 18);
  });

  it("uses latest snapshot with effectiveFrom <= entry date", () => {
    assert.equal(resolveRate("tailor", "2026-03-15", history, live), 25);
    assert.equal(resolveRate("helper", "2026-03-15", history, live), 15);
    assert.equal(resolveRate("tailor", "2026-06-01", history, live), 28);
    assert.equal(resolveRate("helper", "2026-07-01", history, live), 16);
  });

  it("does not apply a later snapshot to an earlier date", () => {
    assert.equal(resolveRate("tailor", "2026-05-31", history, live), 25);
  });

  it("falls back to live when all snapshots are after the date", () => {
    const future: RateSnapshot[] = [
      { id: "r3", effectiveFrom: "2026-12-01", tailorRate: 40, helperRate: 20, setBy: "admin" },
    ];
    assert.equal(resolveRate("tailor", "2026-09-01", future, live), 30);
  });
});
