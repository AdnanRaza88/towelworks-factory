import { AuditEntry } from "./types.ts";

export type AuditLike = Pick<AuditEntry, "id" | "at" | "action" | "entity" | "detail">;

export function sortAuditNewestFirst<T extends Pick<AuditEntry, "at">>(audit: T[]): T[] {
  return [...audit].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function clampAuditIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index) || index < 0) return 0;
  if (index >= length) return length - 1;
  return Math.floor(index);
}

export function canGoPrev(index: number): boolean {
  return index > 0;
}

export function canGoNext(index: number, length: number): boolean {
  return length > 0 && index < length - 1;
}

export function prevAuditIndex(index: number, length: number): number {
  if (!canGoPrev(index)) return clampAuditIndex(index, length);
  return index - 1;
}

export function nextAuditIndex(index: number, length: number): number {
  if (!canGoNext(index, length)) return clampAuditIndex(index, length);
  return index + 1;
}

export function auditAt<T>(audit: T[], index: number): T | null {
  if (!audit.length) return null;
  return audit[clampAuditIndex(index, audit.length)] ?? null;
}

export function formatAuditLine(entry: Pick<AuditEntry, "at" | "action" | "entity" | "detail">): string {
  const when = entry.at.slice(0, 16).replace("T", " ");
  return `${when} · ${entry.action} · ${entry.entity} · ${entry.detail}`;
}
