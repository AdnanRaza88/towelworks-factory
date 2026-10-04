import { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { WorkerType } from "@/lib/factory/types";
import { formatRs } from "@/lib/utils";
import { buildLedgerRows, ledgerTotals } from "@/lib/factory/ledgerTables";

type Filter = "all" | WorkerType;

export default function LedgerPage() {
  const workers = useAppStore((s) => s.workers);
  const production = useAppStore((s) => s.production);
  const cash = useAppStore((s) => s.cash);
  const attendance = useAppStore((s) => s.attendance);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(
    () =>
      buildLedgerRows(
        workers,
        production,
        cash,
        attendance,
        filter === "all" ? undefined : filter
      ),
    [workers, production, cash, attendance, filter]
  );
  const totals = ledgerTotals(rows);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold">Hisab sheet</h2>
        <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
          Tailor / helper · permanent · outside — ek table
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["all", "All"],
            ["permanent", "Permanent"],
            ["outside", "Outside"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className="flex-1 rounded-xl py-2 text-xs font-bold border"
            style={{
              background: filter === id ? "var(--primary)" : "var(--card-solid)",
              color: filter === id ? "#fff" : "var(--text)",
              borderColor: "var(--border-strong)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="surface overflow-x-auto rounded-2xl"
        style={{ border: "1px solid var(--border)" }}
      >
        <table className="w-full min-w-[520px] text-left text-[11px] font-bold">
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: "var(--muted)" }}>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2 mono">Days</th>
              <th className="px-2 py-2 mono">Pcs</th>
              <th className="px-2 py-2 mono">Pay</th>
              <th className="px-2 py-2 mono">Advance</th>
              <th className="px-2 py-2 mono">Loan</th>
              <th className="px-2 py-2 mono">Cash</th>
              <th className="px-2 py-2 mono">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-2 py-4 text-center" style={{ color: "var(--muted)" }}>
                  Is filter mein koi row nahi
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.workerId} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="px-2 py-2">{r.name}</td>
                <td className="px-2 py-2">{r.role}</td>
                <td className="px-2 py-2">{r.type}</td>
                <td className="px-2 py-2 mono">{r.daysPresent}</td>
                <td className="px-2 py-2 mono">{r.pieces.toLocaleString()}</td>
                <td className="px-2 py-2 mono">{formatRs(r.prodPay)}</td>
                <td className="px-2 py-2 mono">{formatRs(r.advances)}</td>
                <td className="px-2 py-2 mono">{formatRs(r.loans)}</td>
                <td className="px-2 py-2 mono">{formatRs(r.cashOut)}</td>
                <td className="px-2 py-2 mono">{formatRs(r.net)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border-strong)", background: "var(--bg-elevated)" }}>
                <td className="px-2 py-2" colSpan={4}>
                  Total
                </td>
                <td className="px-2 py-2 mono">{totals.pieces.toLocaleString()}</td>
                <td className="px-2 py-2 mono">{formatRs(totals.prodPay)}</td>
                <td className="px-2 py-2" colSpan={2} />
                <td className="px-2 py-2 mono">{formatRs(totals.cashOut)}</td>
                <td className="px-2 py-2 mono">{formatRs(totals.net)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
