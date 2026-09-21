import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MACHINES } from "@/lib/factory/types";
import { roundNearest500, todayStr } from "@/lib/factory/calc";
import { formatRs } from "@/lib/utils";

export default function ProductionPage() {
  const workers = useAppStore((s) => s.workers.filter((w) => w.active));
  const production = useAppStore((s) => s.production);
  const addProduction = useAppStore((s) => s.addProduction);

  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [machineId, setMachineId] = useState(1);
  const [pieces, setPieces] = useState("");
  const [note, setNote] = useState("");

  const raw = Number(pieces) || 0;
  const rounded = roundNearest500(raw);
  const worker = workers.find((w) => w.id === workerId);
  const previewAmount = worker
    ? Math.round((rounded / 100) * worker.ratePer100)
    : 0;

  const submit = () => {
    if (!workerId || raw <= 0) return;
    addProduction(workerId, machineId, raw, todayStr(), note || undefined);
    setPieces("");
    setNote("");
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
            {formatRs(previewAmount)}
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
                    M{p.machineId} - {p.rawPieces} - {p.roundedPieces}
                  </span>
                  <span className="font-medium text-[var(--text)]">
                    {formatRs(p.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
