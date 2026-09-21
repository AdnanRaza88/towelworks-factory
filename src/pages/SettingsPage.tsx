import { useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const lock = useAppStore((s) => s.lock);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadBackup = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `towelworks-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = importBackup(text);
    alert(ok ? "Backup restore ho gaya" : "Invalid backup file");
    e.target.value = "";
  };

  const exportCsv = () => {
    const { production, workers, cash } = useAppStore.getState();
    const lines = ["type,date,worker,machine,pieces,amount,cashType,note"];
    for (const p of production) {
      const w = workers.find((x) => x.id === p.workerId);
      lines.push(
        [
          "production",
          p.date,
          w?.name ?? "",
          p.machineId,
          p.roundedPieces,
          p.amount,
          "",
          p.note ?? "",
        ].join(",")
      );
    }
    for (const c of cash) {
      const w = workers.find((x) => x.id === c.workerId);
      lines.push(
        [
          "cash",
          c.date,
          w?.name ?? "",
          "",
          "",
          c.amount,
          c.type,
          c.note ?? "",
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `towelworks-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Settings and backup</h2>

      <div className="rounded-2xl bg-white p-3 shadow-sm text-sm space-y-1">
        <p>
          <span className="text-[var(--muted)]">Mill:</span> {settings.millName}
        </p>
        <p>
          <span className="text-[var(--muted)]">Tailor rate:</span> Rs.
          {settings.tailorRate}/100
        </p>
        <p>
          <span className="text-[var(--muted)]">Helper rate:</span> Rs.
          {settings.helperRate}/100
        </p>
        <p>
          <span className="text-[var(--muted)]">Week:</span> Saturday - Friday
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={downloadBackup}
          className="w-full rounded-xl bg-white py-3 text-sm font-medium shadow-sm"
        >
          Download JSON backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl bg-white py-3 text-sm font-medium shadow-sm"
        >
          Restore from JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImport}
        />
        <button
          onClick={exportCsv}
          className="w-full rounded-xl bg-white py-3 text-sm font-medium shadow-sm"
        >
          Export CSV (Excel)
        </button>
        <button
          onClick={() => {
            if (confirm("Demo data reset karna hai?")) resetDemo();
          }}
          className="w-full rounded-xl bg-white py-3 text-sm font-medium shadow-sm text-amber-700"
        >
          Reset demo data
        </button>
        <button
          onClick={lock}
          className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white"
        >
          Lock app
        </button>
      </div>

      <p className="text-[10px] text-[var(--muted)] text-center pt-4">
        TowelWorks v1.0 - Offline - No internet required
      </p>
    </div>
  );
}
