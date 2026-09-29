import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MACHINES, WorkerRole } from "@/lib/factory/types";
import { calcAmount, roundNearest500, todayStr } from "@/lib/factory/calc";
import { formatRs } from "@/lib/utils";

export default function ProductionPage() {
  const workers = useAppStore((s) => s.workers.filter((w) => w.active));
  const production = useAppStore((s) => s.production);
  const addProduction = useAppStore((s) => s.addProduction);
  const voidProduction = useAppStore((s) => s.voidProduction);
  const correctProduction = useAppStore((s) => s.correctProduction);
  const tailorRate = useAppStore((s) => s.settings.tailorRate);
  const helperRate = useAppStore((s) => s.settings.helperRate);

  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [machineId, setMachineId] = useState(1);
  const [role, setRole] = useState<WorkerRole>(workers[0]?.role ?? "tailor");
  const [pieces, setPieces] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const w = workers.find((x) => x.id === workerId);
    if (w) setRole(w.role);
  }, [workerId, workers]);

  const raw = Number(pieces) || 0;
  const rounded = roundNearest500(raw);
  const rate = role === "tailor" ? tailorRate : helperRate;
  const previewAmount = calcAmount(rounded, rate);

  const submit = () => {
    if (!workerId || raw <= 0) return;
    addProduction(workerId, machineId, role, raw, todayStr(), note || undefined);
    setPieces("");
    setNote("");
  };

  const onCorrect = (id: string) => {
    const value = window.prompt("Correct raw pieces");
    if (!value) return;
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    correctProduction(id, next);
  };

  const recent = [...production].reverse().slice(0, 20);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Production</h2>

      <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
        <label className="block text-xs text-[var(--muted)]">Worker</label>
        <select
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.role})
            </option>
          ))}
        </select>

        <label className="block text-xs text-[var(--muted)]">Role for this entry</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as WorkerRole)}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        >
          <option value="tailor">tailor</option>
          <option value="helper">helper</option>
        </select>

        <label className="block text-xs text-[var(--muted)]">Machine</label>
        <select
          value={machineId}
          onChange={(e) => setMachineId(Number(e.target.value))}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        >
          {MACHINES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <label className="block text-xs text-[var(--muted)]">
          Raw pieces (rounds to nearest 500)
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={pieces}
          onChange={(e) => setPieces(e.target.value)}
          placeholder="e.g. 2500"
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm mono"
        />

        {raw > 0 && (
          <p className="text-xs text-[var(--muted)]">
            Rounded: <span className="mono font-medium">{rounded}</span> -{" "}
            {formatRs(previewAmount)} ({role} @{rate}/100)
          </p>
        )}

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
          Save production
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent entries</h3>
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-xs text-[var(--muted)]">No production yet.</p>
          )}
          {recent.map((p) => {
            const w = useAppStore.getState().workers.find((x) => x.id === p.workerId);
            return (
              <div
                key={p.id}
                className="rounded-xl bg-white px-3 py-2 text-xs shadow-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{w?.name ?? "-"}</span>
                  <span className="mono text-[var(--muted)]">{p.date}</span>
                </div>
                <div className="mt-0.5 flex justify-between text-[var(--muted)]">
                  <span>
                    M{p.machineId} {p.role} - {p.rawPieces} - {p.roundedPieces}
                    {p.voided ? " · void" : ""}
                    {p.correctedFrom ? " · corr" : ""}
                  </span>
                  <span className={`font-medium ${p.voided ? "line-through text-[var(--muted)]" : "text-[var(--text)]"}`}>
                    {formatRs(p.amount)}
                  </span>
                </div>
                {!p.voided && (
                  <div className="mt-1 flex gap-2">
                    <button
                      onClick={() => voidProduction(p.id)}
                      className="rounded-lg border px-2 py-1 text-[10px] font-medium"
                    >
                      Void
                    </button>
                    <button
                      onClick={() => onCorrect(p.id)}
                      className="rounded-lg border px-2 py-1 text-[10px] font-medium"
                    >
                      Correct
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
