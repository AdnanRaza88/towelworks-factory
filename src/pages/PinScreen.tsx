import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function PinScreen() {
  const unlock = useAppStore((s) => s.unlock);
  const millName = useAppStore((s) => s.settings.millName);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const press = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (!unlock(next)) {
        setError(true);
        setTimeout(() => setPin(""), 400);
      }
    }
  };

  const clear = () => {
    setPin("");
    setError(false);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--bg)] px-6 safe-top safe-bottom">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--primary)]">TowelWorks</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{millName}</p>
        <p className="mt-4 text-xs text-[var(--muted)]">Floor PIN</p>
        <div className="mt-2 flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full border-2 ${
                pin.length > i
                  ? "border-[var(--primary)] bg-[var(--primary)]"
                  : "border-slate-300"
              } ${error ? "border-red-500 bg-red-500" : ""}`}
            />
          ))}
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600">Galat PIN — dubara try karo</p>
        )}
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map(
          (key) => (
            <button
              key={key}
              onClick={() => {
                if (key === "C") clear();
                else if (key === "⌫") setPin((p) => p.slice(0, -1));
                else press(key);
              }}
              className="rounded-2xl bg-white py-4 text-xl font-semibold shadow-sm active:bg-slate-100"
            >
              {key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
