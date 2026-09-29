import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  auditAt,
  canGoNext,
  canGoPrev,
  clampAuditIndex,
  formatAuditLine,
  nextAuditIndex,
  prevAuditIndex,
  sortAuditNewestFirst,
} from "./audit.ts";
import type { AuditEntry } from "./types.ts";

const a: AuditEntry = {
  id: "1",
  at: "2026-09-29T10:00:00.000Z",
  action: "production",
  entity: "Imran",
  detail: "M1 tailor 500->500 Rs.125",
};
const b: AuditEntry = {
  id: "2",
  at: "2026-09-29T11:00:00.000Z",
  action: "attendance",
  entity: "w1",
  detail: "2026-09-29:present",
};
const c: AuditEntry = {
  id: "3",
  at: "2026-09-28T09:00:00.000Z",
  action: "create",
  entity: "worker",
  detail: "Asif (helper/permanent)",
};

describe("sortAuditNewestFirst", () => {
  it("orders by at descending", () => {
    const sorted = sortAuditNewestFirst([a, c, b]);
    assert.deepEqual(sorted.map((x) => x.id), ["2", "1", "3"]);
  });
});

describe("clamp + prev/next", () => {
  it("empty log stays at 0", () => {
    assert.equal(clampAuditIndex(4, 0), 0);
    assert.equal(canGoPrev(0), false);
    assert.equal(canGoNext(0, 0), false);
    assert.equal(prevAuditIndex(0, 0), 0);
    assert.equal(nextAuditIndex(0, 0), 0);
    assert.equal(auditAt([], 0), null);
  });

  it("prev is newer (lower index), next is older", () => {
    const log = sortAuditNewestFirst([a, b, c]);
    assert.equal(log.length, 3);
    assert.equal(canGoPrev(0), false);
    assert.equal(canGoNext(0, 3), true);
    assert.equal(nextAuditIndex(0, 3), 1);
    assert.equal(nextAuditIndex(1, 3), 2);
    assert.equal(nextAuditIndex(2, 3), 2);
    assert.equal(prevAuditIndex(2, 3), 1);
    assert.equal(prevAuditIndex(0, 3), 0);
    assert.equal(auditAt(log, 0)?.id, "2");
    assert.equal(auditAt(log, 2)?.id, "3");
    assert.equal(auditAt(log, 99)?.id, "3");
  });
});

describe("formatAuditLine", () => {
  it("joins time action entity detail", () => {
    const line = formatAuditLine(b);
    assert.ok(line.includes("attendance"));
    assert.ok(line.includes("w1"));
    assert.ok(line.includes("2026-09-29:present"));
  });
});
