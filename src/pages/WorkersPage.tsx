import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { todayStr } from "@/lib/factory/calc";
import { WorkerRole, AttendanceStatus } from "@/lib/factory/types";
import { formatRs } from "@/lib/utils";

export default function WorkersPage() {
  const workers = useAppStore((s) => s.workers);
  const attendance = useAppStore((s) => s.attendance);
  const production = useAppStore((s) => s.production);
  const cash = useAppStore((s) => s.cash);
  const sessions = useAppStore((s) => s.sessions);
  const markAttendance = useAppStore((s) => s.markAttendance);
  const addWorker = useAppStore((s) => s.addWorker);
  const toggleWorker = useAppStore((s) => s.toggleWorker);
  const exportWorkerSheet = useAppStore((s) => s.exportWorkerSheet);

  const [tab, setTab] = useState<"permanent" | "outside">("permanent");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<WorkerRole>("tailor");
  const [detailId, setDetailId] = useState<string | null>(null);
  const today = todayStr();
  const filtered = workers.filter((w) => w.type === tab);

  const statusToday = (id: string) =>
    attendance.find((a) => a.workerId === id && a.date === today)?.status;

  const submit = () => {
    if (!name.trim()) return;
    addWorker(name, role, tab);
    setName("");
    setShowAdd(false);
  };

  const downloadOne = (id: string, wname: string, kind: "csv" | "json" | "pdf" | "image" = "csv") => {
    const w = workers.find((x) => x.id === id);
    if (!w) return;
    const prod = production.filter((p) => p.workerId === id);
    const cashRows = cash.filter((c) => c.workerId === id);
    const att = attendance.filter((a) => a.workerId === id);
    const totalPay = prod.reduce((s, p) => s + p.amount, 0);
    const totalCash = cashRows.reduce((s, c) => (c.type === "return" || c.type === "payment" ? s - c.amount : s + c.amount), 0);
    const base = wname.replace(/\s+/g, "_");
    if (kind === "csv") {
      const blob = new Blob([exportWorkerSheet(id)], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${base}-record.csv`; a.click();
      URL.revokeObjectURL(url); return;
    }
    if (kind === "json") {
      const data = { worker: w, production: prod, cash: cashRows, attendance: att, totalPay, totalCash };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${base}-record.json`; a.click();
      URL.revokeObjectURL(url); return;
    }
    if (kind === "pdf") {
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${w.name}</title>
        <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px}th{background:#f3f4f6}</style></head><body>
        <h1>${w.name}</h1><p>${w.type} · ${w.role}</p>
        <p><b>Pay:</b> Rs.${totalPay} · <b>Cash:</b> Rs.${totalCash}</p>
        <h2>Production</h2><table><tr><th>Date</th><th>M</th><th>Role</th><th>Pcs</th><th>Amt</th></tr>
        ${prod.map((p) => `<tr><td>${p.date}</td><td>${p.machineId}</td><td>${p.role||""}</td><td>${p.roundedPieces}</td><td>${p.amount}</td></tr>`).join("")}
        </table><script>window.onload=()=>window.print()</script></body></html>`;
      window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank"); return;
    }
    if (kind === "image") {
      const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 360;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 720, 360);
      ctx.fillStyle = "#0a0a0a"; ctx.font = "bold 22px sans-serif"; ctx.fillText(w.name, 24, 40);
      ctx.font = "bold 16px monospace"; ctx.fillText(`Pay Rs.${totalPay}  Cash Rs.${totalCash}`, 24, 100);
      ctx.fillText(`Prod ${prod.length} · Cash ${cashRows.length}`, 24, 130);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${base}-summary.png`; a.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  if (detailId) {
    const w = workers.find((x) => x.id === detailId);
    if (!w) { setDetailId(null); return null; }
    const prod = production.filter((p) => p.workerId === w.id).slice().reverse();
    const cashRows = cash.filter((c) => c.workerId === w.id).slice().reverse();
    const totalPay = prod.reduce((s, p) => s + p.amount, 0);
    const totalCash = cashRows.reduce((s, c) => (c.type === "return" || c.type === "payment" ? s - c.amount : s + c.amount), 0);
    return (
      <div className="space-y-3">
        <button onClick={() => setDetailId(null)} className="text-xs font-bold" style={{ color: "var(--primary)" }}>← Back</button>
        <div className="surface rounded-2xl p-3">
          <p className="text-lg font-bold">{w.name}</p>
          <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>{w.role} · {w.type}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl p-2 border" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--muted)" }}>Production pay</p>
              <p className="mono font-bold">{formatRs(totalPay)}</p>
            </div>
            <div className="rounded-xl p-2 border" style={{ borderColor: "var(--border)" }}>
              <p style={{ color: "var(--muted)" }}>Cash out</p>
              <p className="mono font-bold">{formatRs(totalCash)}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => downloadOne(w.id, w.name, "csv")} className="rounded-xl py-2 text-xs font-bold border" style={{ borderColor: "var(--border-strong)" }}>CSV</button>
            <button onClick={() => downloadOne(w.id, w.name, "json")} className="rounded-xl py-2 text-xs font-bold border" style={{ borderColor: "var(--border-strong)" }}>JSON</button>
            <button onClick={() => downloadOne(w.id, w.name, "pdf")} className="rounded-xl py-2 text-xs font-bold border" style={{ borderColor: "var(--border-strong)" }}>PDF</button>
            <button onClick={() => downloadOne(w.id, w.name, "image")} className="rounded-xl py-2 text-xs font-bold border" style={{ borderColor: "var(--border-strong)" }}>Image</button>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold mb-1">Recent production</h3>
          {prod.slice(0, 10).map((p) => (
            <div key={p.id} className="flex justify-between text-[10px] font-bold surface rounded-lg px-2 py-1.5 mb-1">
              <span>M{p.machineId} {p.role} {p.roundedPieces}pcs</span>
              <span className="mono">{formatRs(p.amount)} · {p.date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Workers</h2>
        <button onClick={() => setShowAdd((v) => !v)} className="rounded-full btn-primary px-3 py-1.5 text-xs font-bold">
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>
      <div className="flex gap-2">
        {(["permanent", "outside"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 rounded-xl py-2 text-xs font-bold border"
            style={{ background: tab === t ? "var(--text)" : "var(--card)", color: tab === t ? "var(--bg)" : "var(--muted)", borderColor: "var(--border-strong)" }}>
            {t === "permanent" ? "Permanent" : "Outside"}
          </button>
        ))}
      </div>
      {showAdd && (
        <div className="surface rounded-2xl p-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-xl px-3 py-2 text-sm font-bold" />
          <select value={role} onChange={(e) => setRole(e.target.value as WorkerRole)} className="w-full rounded-xl px-2 py-2 text-sm font-bold">
            <option value="tailor">Tailor</option>
            <option value="helper">Helper</option>
          </select>
          <button onClick={submit} className="btn-primary w-full rounded-xl py-2 text-sm font-bold">Save worker</button>
        </div>
      )}
      <div className="space-y-2">
        {filtered.map((w) => {
          const st = statusToday(w.id);
          return (
            <div key={w.id} className={`surface rounded-2xl p-3 ${!w.active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <button onClick={() => setDetailId(w.id)} className="text-left">
                  <p className="font-bold">{w.name}</p>
                  <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>{w.role} · tap for record</p>
                </button>
                <button onClick={() => toggleWorker(w.id)} className="text-[10px] font-bold underline" style={{ color: "var(--muted)" }}>
                  {w.active ? "Disable" : "Enable"}
                </button>
              </div>
              {w.active && (
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {([["present", "Hazir"], ["absent", "Ghaib"], ["half", "Half"], ["off", "Off"]] as [AttendanceStatus, string][]).map(([status, label]) => (
                    <button key={status} onClick={() => markAttendance(w.id, status)}
                      className="rounded-lg py-2 text-[10px] font-bold"
                      style={{ background: st === status ? "var(--text)" : "var(--bg-elevated)", color: st === status ? "var(--bg)" : "var(--muted)" }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
