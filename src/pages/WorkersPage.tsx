import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { todayStr } from "@/lib/factory/calc";
import { WorkerRole } from "@/lib/factory/types";
import { formatRs } from "@/lib/utils";

export default function WorkersPage() {
  const workers = useAppStore((s) => s.workers);
  const attendance = useAppStore((s) => s.attendance);
  const markAttendance = useAppStore((s) => s.markAttendance);
  const addWorker = useAppStore((s) => s.addWorker);
  const toggleWorker = useAppStore((s) => s.toggleWorker);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<WorkerRole>("tailor");
  const [type, setType] = useState<"permanent" | "outside">("permanent");
  const today = todayStr();

  const isPresent = (id: string) =>
    attendance.find((a) => a.workerId === id && a.date === today)?.present;

  const submit = () => {
    if (!name.trim()) return;
    addWorker(name, role, type);
    setName("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Workers</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white"
        >
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (Imran, Asif...)"
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkerRole)}
              className="flex-1 rounded-xl border border-[var(--border)] px-2 py-2 text-sm"
            >
              <option value="tailor">Tailor (Rs.25/100)</option>
              <option value="helper">Helper (Rs.15/100)</option>
            </select>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "permanent" | "outside")
              }
              className="flex-1 rounded-xl border border-[var(--border)] px-2 py-2 text-sm"
            >
              <option value="permanent">Permanent</option>
              <option value="outside">Outside</option>
            </select>
          </div>
          <button
            onClick={submit}
            className="w-full rounded-xl bg-[var(--primary)] py-2 text-sm font-medium text-white"
          >
            Save worker
          </button>
        </div>
      )}

      <div className="space-y-2">
        {workers.map((w) => {
          const present = isPresent(w.id);
          return (
            <div
              key={w.id}
              className={`rounded-2xl bg-white p-3 shadow-sm ${
                !w.active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {w.role} - {w.type} - {formatRs(w.ratePer100)}/100
                  </p>
                </div>
                <button
                  onClick={() => toggleWorker(w.id)}
                  className="text-[10px] text-[var(--muted)] underline"
                >
                  {w.active ? "Disable" : "Enable"}
                </button>
              </div>
              {w.active && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => markAttendance(w.id, true)}
                    className={`flex-1 rounded-xl py-2 text-xs font-medium ${
                      present === true
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Hazir
                  </button>
                  <button
                    onClick={() => markAttendance(w.id, false)}
                    className={`flex-1 rounded-xl py-2 text-xs font-medium ${
                      present === false
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Ghair-hazir
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
