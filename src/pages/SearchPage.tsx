import { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { searchFactory, SearchKind } from "@/lib/factory/search";

const LABELS: Record<SearchKind, string> = {
  worker: "Worker",
  production: "Prod",
  cash: "Cash",
  attendance: "Attend",
  session: "Session",
};

export default function SearchPage() {
  const workers = useAppStore((s) => s.workers);
  const production = useAppStore((s) => s.production);
  const cash = useAppStore((s) => s.cash);
  const attendance = useAppStore((s) => s.attendance);
  const sessions = useAppStore((s) => s.sessions);
  const [q, setQ] = useState("");

  const hits = useMemo(
    () => searchFactory(q, { workers, production, cash, attendance, sessions }),
    [q, workers, production, cash, attendance, sessions]
  );

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Search</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Name, date, machine, note, void, cash type"
        className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
        autoFocus
      />
      <p className="text-xs text-[var(--muted)]">
        {q.trim() ? `${hits.length} match${hits.length === 1 ? "" : "es"}` : "Type to search the mill book."}
      </p>
      <div className="space-y-2">
        {hits.map((h) => (
          <div
            key={`${h.kind}-${h.id}`}
            className="rounded-xl bg-white px-3 py-2 text-xs shadow-sm"
          >
            <div className="flex justify-between">
              <span className="font-medium">{h.title}</span>
              <span className="text-[var(--muted)]">{LABELS[h.kind]}</span>
            </div>
            <div
              className={`mt-0.5 text-[var(--muted)] ${h.voided ? "line-through" : ""}`}
            >
              {h.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
