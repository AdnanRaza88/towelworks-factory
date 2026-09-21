import { useState, useRef } from "react";
import { Mic } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { todayStr } from "@/lib/factory/calc";

/** Simple Roman Urdu / Hindi voice command parser. */
function parseCommand(text: string): string | null {
  const t = text.toLowerCase().trim();
  const workers = useAppStore.getState().workers;
  const markAttendance = useAppStore.getState().markAttendance;
  const addProduction = useAppStore.getState().addProduction;
  const addCash = useAppStore.getState().addCash;

  const hazir = t.match(/(\w+)\s+(hazir|present|haazir)/i);
  if (hazir) {
    const name = hazir[1];
    const w = workers.find(
      (x) => x.name.toLowerCase() === name.toLowerCase()
    );
    if (w) {
      markAttendance(w.id, true);
      return `${w.name} hazir marked`;
    }
  }

  const prod = t.match(
    /machine\s*(\d+)\s*(?:par|pe|on)?\s*(\d+)\s*(?:piece|pieces|pcs)?/i
  );
  if (prod) {
    const machineId = Number(prod[1]);
    const pieces = Number(prod[2]);
    const active = workers.find((w) => w.active);
    if (active && machineId >= 1 && machineId <= 11 && pieces > 0) {
      addProduction(active.id, machineId, pieces);
      return `M${machineId}: ${pieces} pcs -> ${active.name}`;
    }
  }

  const cash = t.match(
    /(\w+)\s+(?:ko|ke)\s+(\d+)\s+(advance|loan|deduction|return)/i
  );
  if (cash) {
    const name = cash[1];
    const amount = Number(cash[2]);
    const type = cash[3].toLowerCase() as
      | "advance"
      | "loan"
      | "deduction"
      | "return";
    const w = workers.find(
      (x) => x.name.toLowerCase() === name.toLowerCase()
    );
    if (w && amount > 0) {
      addCash(w.id, type, amount, todayStr());
      return `${w.name}: Rs.${amount} ${type}`;
    }
  }

  return null;
}

export default function VoiceBar() {
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);

  const start = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setFeedback("Voice not supported on this device");
      return;
    }
    const rec: SpeechRecognition = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      const msg = parseCommand(text);
      setFeedback(msg ?? `Heard: ${text} - not matched`);
      setTimeout(() => setFeedback(""), 3500);
    };
    rec.onerror = () => {
      setListening(false);
      setFeedback("Mic error");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    setFeedback("Listening...");
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return (
    <div className="relative flex items-center gap-2">
      {feedback && (
        <span className="absolute right-10 top-1/2 max-w-[140px] -translate-y-1/2 truncate rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-white">
          {feedback}
        </span>
      )}
      <button
        onClick={listening ? stop : start}
        className={`rounded-full p-2 ${
          listening
            ? "bg-red-500 text-white animate-pulse"
            : "bg-slate-100 text-[var(--primary)]"
        }`}
        aria-label="Voice command"
      >
        <Mic size={18} />
      </button>
    </div>
  );
}
