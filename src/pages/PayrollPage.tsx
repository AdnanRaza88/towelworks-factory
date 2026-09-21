import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getWeekRange, todayStr } from "@/lib/factory/calc";
import { formatRs } from "@/lib/utils";

export default function PayrollPage() {
  const workers = useAppStore((s) => s.workers);
  const production = useAppStore((s) => s.production);
  const cash = useAppStore((s) => s.cash);
  const attendance = useAppStore((s) => s.attendance);

  const today = todayStr();
  const { start, end } = getWeekRange(today);

  const rows = useMemo(() => {
    return workers
      .filter((w) => w.active)
      .map((w) => {
        const prod = production.filter(
          (p) =>
            p.workerId === w.id && p.date >= start && p.date <= end
        );
        const prodPay = prod.reduce((s, p) => s + p.amount, 0);
        const pieces = prod.reduce((s, p) => s + p.roundedPieces, 0);
        const daysPresent = attendance.filter(
          (a) =>
            a.workerId === w.id &&
            a.date >= start &&
            a.date <= end &&
            a.present
        ).length;

        const cashOut = cash
          .filter(
            (c) =>
              c.workerId === w.id && c.date >= start && c.date <= end
          )
          .reduce((s, c) => {
            if (
              c.type === "advance" ||
              c.type === "loan" ||
              c.type === "deduction"
            )
              return s + c.amount;
            return s - c.amount;
          }, 0);

        const net = prodPay - cashOut;
        return { worker: w, pieces, prodPay, cashOut, net, daysPresent };
      })
      .filter((r) => r.pieces > 0 || r.cashOut !== 0 || r.daysPresent > 0);
  }, [workers, production, cash, attendance, start, end]);

  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Payroll (Sat-Fri)</h2>
        <p className="text-xs text-[var(--muted)] mono">
          {start} - {end}
        </p>
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
                  {r.worker.role} - {r.daysPresent} days - {" "}
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
