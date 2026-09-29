import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getWeekRange, todayStr } from "@/lib/factory/calc";
import { buildPayrollRows, totalNetPayable } from "@/lib/factory/payroll";
import { payrollSheet } from "@/lib/factory/excel";
import { formatRs } from "@/lib/utils";

export default function PayrollPage() {
  const workers = useAppStore((s) => s.workers);
  const production = useAppStore((s) => s.production);
  const cash = useAppStore((s) => s.cash);
  const attendance = useAppStore((s) => s.attendance);
  const sessions = useAppStore((s) => s.sessions);

  const today = todayStr();
  const { start, end } = getWeekRange(today);

  const rows = useMemo(
    () => buildPayrollRows(workers, production, cash, attendance, start, end),
    [workers, production, cash, attendance, start, end]
  );

  const totalNet = totalNetPayable(rows);

  const downloadWeek = () => {
    const csv = payrollSheet(
      { workers, production, cash, attendance, sessions },
      start,
      end
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `towelworks-payroll-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Payroll (Sat-Fri)</h2>
          <p className="text-xs text-[var(--muted)] mono">
            {start} - {end}
          </p>
        </div>
        <button
          type="button"
          onClick={downloadWeek}
          className="rounded-xl border px-3 py-2 text-xs font-bold"
          style={{
            borderColor: "var(--border-strong)",
          }}
        >
          Excel
        </button>
      </div>

      <div className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-white shadow-sm">
        <p className="text-xs opacity-80">Week net payable</p>
        <p className="text-2xl font-bold mono">{formatRs(totalNet)}</p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-[var(--muted)]">
            Is week ka data abhi nahi - production ya cash add karo.
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.worker.id}
            className="rounded-2xl bg-white p-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.worker.name}</p>
                <p className="text-[10px] text-[var(--muted)]">
                  {r.worker.role} - {r.daysPresent} days -{" "}
                  {r.pieces.toLocaleString()} pcs
                </p>
              </div>
              <p className="text-sm font-bold mono">{formatRs(r.net)}</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-[var(--muted)]">
              <span>Prod pay: {formatRs(r.prodPay)}</span>
              <span className="text-right">
                Cash out: {formatRs(r.cashOut)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
