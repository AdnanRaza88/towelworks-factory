import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cashOutTotal,
  cashSignedAmount,
  isValidCashAmount,
  netPayable,
  normalizeCashAmount,
} from "./cashRules.ts";

describe("cashSignedAmount", () => {
  it("debits advance loan deduction", () => {
    assert.equal(cashSignedAmount({ type: "advance", amount: 500 }), 500);
    assert.equal(cashSignedAmount({ type: "loan", amount: 200 }), 200);
    assert.equal(cashSignedAmount({ type: "deduction", amount: 50 }), 50);
  });

  it("credits return settlement payment", () => {
    assert.equal(cashSignedAmount({ type: "return", amount: 100 }), -100);
    assert.equal(cashSignedAmount({ type: "settlement", amount: 300 }), -300);
    assert.equal(cashSignedAmount({ type: "payment", amount: 80 }), -80);
  });

  it("normalizes negative stored amounts", () => {
    assert.equal(cashSignedAmount({ type: "advance", amount: -500 }), 500);
  });
});

describe("cashOutTotal + netPayable", () => {
  it("matches payroll week math", () => {
    const out = cashOutTotal([
      { type: "advance", amount: 1000 },
      { type: "loan", amount: 200 },
      { type: "return", amount: 150 },
    ]);
    assert.equal(out, 1050);
    assert.equal(netPayable(2000, out), 950);
  });
});

describe("amount helpers", () => {
  it("validates and normalizes", () => {
    assert.equal(isValidCashAmount(10), true);
    assert.equal(isValidCashAmount(0), false);
    assert.equal(isValidCashAmount(NaN), false);
    assert.equal(normalizeCashAmount(-40), 40);
  });
});
