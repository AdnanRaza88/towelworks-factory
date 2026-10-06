import { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MACHINES, WorkerRole } from "@/lib/factory/types";
import { todayStr } from "@/lib/factory/calc";
import { formatRs } from "@/lib/utils";
import { buildMachineBoard, floorSummary } from "@/lib/factory/machineBoard";

export default function MachineBoardPage() {
  const workers = useAppStore((s) => s.workers.filter((w) => w.active));
  const allWorkers = useAppStore((s) => s.workers);
  const sessions = useAppStore((s) => s.sessions);
  const production = useAppStore((s) => s.production);
  const openSession = useAppStore((s) => s.openSession);

  const [date] = useState(todayStr());
  const [pick, setPick] = useState<Record<number, { workerId: string; role: WorkerRole }>>({});

  const rows = useMemo(
    () => buildMachineBoard(MACHINES, sessions, production, allWorkers, date),
    [sessions, production, allWorkers, date]
  );
  const summary = floorSummary(rows);

  const assign = (machineId: number) => {
    const sel = pick[machineId];
    const workerId = sel?.workerId || workers[0]?.id;
    const role = sel?.role ?? "tailor";
    if (!workerId) return;
    openSession(workerId, machineId, role, date);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold">Floor</h2>
          <p className="text-xs font-bold mono" style={{ color: "var(--muted)" }}>
            {date} · Har machine: 1 tailor + 1 helper
          </p>
        </div>
        <p className="text-[11px] font-bold" style={{ color: "var(--muted)" }}>
          {summary.busy} busy · {summary.idle} idle · {summary.pieces.toLocaleString()} pcs
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {rows.map((row) => {
          const sel = pick[row.machine.id] ?? {
            workerId: workers[0]?.id ?? "",
            role: "tailor" as WorkerRole,
          };
          return (
            <div key={row.machine.id} className="surface rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{row.machine.name}</p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: row.busy ? "var(--primary)" : "var(--card-solid)",
                    color: row.busy ? "#fff" : "var(--muted)",
                    border: "1px solid var(--border-strong)",
                  }}
                >
                  {row.busy ? "busy" : "idle"}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-[11px] font-bold" style={{ color: "var(--muted)" }}>
                <span>T: {row.tailor.workerName || "—"}</span>
                <span>H: {row.helper.workerName || "—"}</span>
                <span className="mono">
                  {row.pieces.toLocaleString()} · {formatRs(row.amount)}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <select
                  value={sel.workerId}
                  onChange={(e) =>
                    setPick((p) => ({
                      ...p,
                      [row.machine.id]: { ...sel, workerId: e.target.value },
                    }))
                  }
                  className="flex-1 rounded-xl px-2 py-1.5 text-xs"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <select
                  value={sel.role}
                  onChange={(e) =>
                    setPick((p) => ({
                      ...p,
                      [row.machine.id]: { ...sel, role: e.target.value as WorkerRole },
                    }))
                  }
                  className="rounded-xl px-2 py-1.5 text-xs"
                >
                  <option value="tailor">tailor</option>
                  <option value="helper">helper</option>
                </select>
                <button
                  type="button"
                  onClick={() => assign(row.machine.id)}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold btn-primary"
                >
                  Assign
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
