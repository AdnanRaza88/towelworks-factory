import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { CashType } from "@/lib/factory/types";
import { todayStr } from "@/lib/factory/calc";
import { formatRs } from "@/lib/utils";

const TYPES: { value: CashType; label: string }[] = [
  { value: "advance", label: "Advance" },
  { value: "loan", label: "Loan" },
  { value: "deduction", label: "Deduction" },
  { value: "return", label: "Return" },
  { value: "settlement", label: "Saturday settlement" },
];

export default function CashPage() {
  const workers = useAppStore((s) => s.workers.filter((w) => w.active));
  const cash = useAppStore((s) => s.cash);
  const addCash = useAppStore((s) => s.addCash);

  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [type, setType] = useState<CashType>("advance");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    const n = Number(amount);
    if (!workerId || !n || n <= 0) return;
    addCash(workerId, type, n, todayStr(), note || undefined);
    setAmount("");
    setNote("");
  };

  const recent = [...cash].reverse().slice(0, 25);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Cash ledger</h2>
      <p className="text-xs text-[var(--muted)]">
        Advances / loans / deductions stay separate from production pay.
      </p>

      <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
        <select
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as CashType)}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (Rs.)"
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm mono"
        />

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        />

        <button
          onClick={submit}
          className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-medium text-white"
        >
          Save cash entry
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent cash</h3>
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-xs text-[var(--muted)]">No cash entries yet.</p>
          )}
          {recent.map((c) => {
            const w = useAppStore
              .getState()
              .workers.find((x) => x.id === c.workerId);
            return (
              <div
                key={c.id}
                className="rounded-xl bg-white px-3 py-2 text-xs shadow-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{w?.name ?? "-"}</span>
                  <span className="mono">{formatRs(c.amount)}</span>
                </div>
                <div className="mt-0.5 flex justify-between text-[var(--muted)]">
                  <span className="capitalize">{c.type}</span>
                  <span>{c.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
