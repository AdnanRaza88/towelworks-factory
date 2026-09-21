import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { roundNearest500, calcAmount, getWeekRange } from "./calc.ts";

describe("roundNearest500", () => {
  it("rounds mid values", () => {
    assert.equal(roundNearest500(250), 500);
    assert.equal(roundNearest500(249), 0);
    assert.equal(roundNearest500(750), 1000);
    assert.equal(roundNearest500(1249), 1000);
    assert.equal(roundNearest500(1250), 1500);
  });

  it("handles edge cases", () => {
    assert.equal(roundNearest500(0), 0);
    assert.equal(roundNearest500(-10), 0);
    assert.equal(roundNearest500(500), 500);
  });
});

describe("calcAmount", () => {
  it("computes tailor and helper pay", () => {
    assert.equal(calcAmount(1000, 25), 250);
    assert.equal(calcAmount(2500, 15), 375);
    assert.equal(calcAmount(0, 25), 0);
  });
});

describe("getWeekRange", () => {
  it("returns Sat-Fri for a Wednesday", () => {
    const { start, end } = getWeekRange("2026-09-23");
    assert.equal(start, "2026-09-19");
    assert.equal(end, "2026-09-25");
  });

  it("returns same week when date is Saturday", () => {
    const { start, end } = getWeekRange("2026-09-19");
    assert.equal(start, "2026-09-19");
    assert.equal(end, "2026-09-25");
  });
});
