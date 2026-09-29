import { useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { APP_VERSION } from "@/lib/factory/types";
import {
  auditAt,
  canGoNext,
  canGoPrev,
  clampAuditIndex,
  formatAuditLine,
  nextAuditIndex,
  prevAuditIndex,
  sortAuditNewestFirst,
} from "@/lib/factory/audit";

interface Props {
  onOpenProviders?: () => void;
}

export default function SettingsPage({ onOpenProviders }: Props) {
  const settings = useAppStore((s) => s.settings);
  const rateHistory = useAppStore((s) => s.rateHistory);
  const rawAudit = useAppStore((s) => s.audit);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const exportWorkerSheet = useAppStore((s) => s.exportWorkerSheet);
  const updateRates = useAppStore((s) => s.updateRates);
  const setTheme = useAppStore((s) => s.setTheme);
  const setMillName = useAppStore((s) => s.setMillName);
  const setPin = useAppStore((s) => s.setPin);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tailor, setTailor] = useState(String(settings.tailorRate));
  const [helper, setHelper] = useState(String(settings.helperRate));
  const [mill, setMill] = useState(settings.millName);
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [msg, setMsg] = useState("");
  const [auditIndex, setAuditIndex] = useState(0);
  const theme = settings.theme ?? "light";

  const audit = useMemo(() => sortAuditNewestFirst(rawAudit ?? []), [rawAudit]);
  const idx = clampAuditIndex(auditIndex, audit.length);
  const currentAudit = auditAt(audit, idx);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 pb-4">
      <h2 className="text-base font-bold">Settings</h2>
      {msg && (
        <p className="rounded-xl surface px-3 py-2 text-xs font-bold" style={{ color: "var(--success)" }}>
          {msg}
        </p>
      )}

      <div className="surface rounded-2xl p-3 space-y-2">
        <p className="text-sm font-bold">Theme</p>
        <div className="flex gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTheme(t);
                flash(t === "light" ? "Light mode" : "Dark mode");
              }}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold border"
              style={{
                background: theme === t ? "var(--text)" : "var(--bg-elevated)",
                color: theme === t ? "var(--bg)" : "var(--text)",
                borderColor: "var(--border-strong)",
              }}
            >
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onOpenProviders?.()}
        className="w-full surface rounded-2xl p-3 text-left"
      >
        <p className="text-sm font-bold">AI Providers</p>
        <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
          Gemini API key · Agent talking ·{" "}
          {settings.geminiApiKey ? "Connected" : "Not set"}
        </p>
      </button>

      <div className="surface rounded-2xl p-3 space-y-2">
        <p className="text-sm font-bold">Mill name</p>
        <input
          value={mill}
          onChange={(e) => setMill(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm font-bold"
        />
        <button
          onClick={() => {
            setMillName(mill);
            flash("Mill name saved");
          }}
          className="btn-solid w-full rounded-xl py-2 text-sm"
        >
          Save
        </button>
      </div>

      <div className="surface rounded-2xl p-3 space-y-2">
        <p className="text-sm font-bold">Floor PIN</p>
        <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
          4 digits. Current PIN required to change.
        </p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Current PIN"
          className="w-full rounded-xl px-3 py-2 text-sm font-bold"
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={nextPin}
          onChange={(e) => setNextPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="New PIN"
          className="w-full rounded-xl px-3 py-2 text-sm font-bold"
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Confirm new PIN"
          className="w-full rounded-xl px-3 py-2 text-sm font-bold"
        />
        <button
          type="button"
          onClick={() => {
            if (nextPin.length !== 4) return flash("New PIN 4 digits hona chahiye");
            if (nextPin !== confirmPin) return flash("New PIN match nahi karta");
            const ok = setPin(currentPin, nextPin);
            if (!ok) return flash("Current PIN galat hai");
            setCurrentPin("");
            setNextPin("");
            setConfirmPin("");
            flash("PIN saved");
          }}
          className="btn-solid w-full rounded-xl py-2 text-sm"
        >
          Change PIN
        </button>
      </div>

      <div className="surface rounded-2xl p-3 space-y-2">
        <p className="text-sm font-bold">Admin rates (per 100 pieces)</p>
        <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
          Purani production purani rate pe rehti hai.
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
              Tailor
            </label>
            <input
              type="number"
              value={tailor}
              onChange={(e) => setTailor(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm mono font-bold"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
              Helper
            </label>
            <input
              type="number"
              value={helper}
              onChange={(e) => setHelper(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm mono font-bold"
            />
          </div>
        </div>
        <button
          onClick={() => {
            const t = Number(tailor);
            const h = Number(helper);
            if (!t || !h) return flash("Valid rates daalo");
            updateRates(t, h);
            flash(`Rates: T${t} / H${h}`);
          }}
          className="btn-primary w-full rounded-xl py-2 text-sm"
        >
          Update rates
        </button>
        {rateHistory?.[0] && (
          <p className="text-[10px] mono font-bold" style={{ color: "var(--muted)" }}>
            Last: T{rateHistory[0].tailorRate} / H{rateHistory[0].helperRate}
          </p>
        )}
      </div>

      <div className="surface rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Audit log</p>
          <p className="text-[10px] mono font-bold" style={{ color: "var(--muted)" }}>
            {audit.length ? `${idx + 1} / ${audit.length}` : "0"}
          </p>
        </div>
        {currentAudit ? (
          <p className="text-[11px] font-bold leading-snug" style={{ color: "var(--text)" }}>
            {formatAuditLine(currentAudit)}
          </p>
        ) : (
          <p className="text-[11px] font-bold" style={{ color: "var(--muted)" }}>
            No audit entries yet
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canGoPrev(idx)}
            onClick={() => setAuditIndex(prevAuditIndex(idx, audit.length))}
            className="flex-1 rounded-xl py-2 text-sm font-bold border"
            style={{
              borderColor: "var(--border-strong)",
              opacity: canGoPrev(idx) ? 1 : 0.4,
            }}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={!canGoNext(idx, audit.length)}
            onClick={() => setAuditIndex(nextAuditIndex(idx, audit.length))}
            className="flex-1 rounded-xl py-2 text-sm font-bold border"
            style={{
              borderColor: "var(--border-strong)",
              opacity: canGoNext(idx, audit.length) ? 1 : 0.4,
            }}
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => {
            download(
              exportBackup(),
              `towelworks-backup-${new Date().toISOString().slice(0, 10)}.json`,
              "application/json"
            );
            flash("Backup downloaded");
          }}
          className="w-full rounded-xl surface py-3 text-sm font-bold"
        >
          Download JSON backup
        </button>
        <button
          onClick={() => {
            download(
              exportWorkerSheet(),
              `towelworks-sheet-${new Date().toISOString().slice(0, 10)}.csv`,
              "text/csv"
            );
            flash("Sheet downloaded");
          }}
          className="w-full rounded-xl surface py-3 text-sm font-bold"
        >
          Export Excel sheet (CSV)
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl surface py-3 text-sm font-bold"
        >
          Restore backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const ok = importBackup(await f.text());
            flash(ok ? "Restore OK" : "Invalid backup");
            e.target.value = "";
          }}
        />
        <button
          onClick={() => {
            if (confirm("Demo reset? Pehle backup lo.")) resetDemo();
          }}
          className="w-full rounded-xl surface py-3 text-sm font-bold"
          style={{ color: "var(--warn)" }}
        >
          Reset demo data
        </button>
      </div>

      <p className="text-center text-[10px] font-bold pt-2" style={{ color: "var(--muted)" }}>
        TowelWorks v{APP_VERSION} · Data local · Update se data safe
      </p>
    </div>
  );
}
