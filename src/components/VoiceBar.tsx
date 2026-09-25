import { useState, useRef } from "react";
import { Mic } from "lucide-react";
import { useAppStore, type VoiceAction } from "@/store/useAppStore";
import { resolveVoiceCommand, speak } from "@/lib/voiceAgent";

function describeAction(a: VoiceAction): string {
  switch (a.type) {
    case "attendance":
      return `${a.workerName} ko ${a.status} mark karun?`;
    case "production":
      return `M${a.machineId} pe ${a.pieces} piece${a.workerName ? ` (${a.workerName})` : ""} add karun?`;
    case "cash":
      return `${a.workerName} ko Rs.${a.amount} ${a.cashType} add karun?`;
    case "add_worker":
      return `Naya worker ${a.name} (${a.role}/${a.workerType}) add karun?`;
    case "session":
      return `${a.workerName} ko M${a.machineId} pe ${a.role} session dun?`;
    case "query":
      return `Query: ${a.topic}`;
    default:
      return "Yeh action chalaun?";
  }
}

export default function VoiceBar() {
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState<VoiceAction | null>(null);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const applyVoiceAction = useAppStore((s) => s.applyVoiceAction);
  const geminiKey = useAppStore((s) => s.settings.geminiApiKey);

  const show = (msg: string, say = true) => {
    setFeedback(msg);
    if (say) speak(msg);
    setTimeout(() => setFeedback(""), 5000);
  };

  const handleText = async (text: string) => {
    setBusy(true);
    try {
      const action = await resolveVoiceCommand(text, geminiKey);
      if (!action) {
        show(`Suna: "${text}" — samajh nahi aya.`);
        return;
      }
      if (action.type === "query") {
        show(describeAction(action));
        return;
      }
      setPending(action);
      show(describeAction(action) + " Haan / Nahi?", true);
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!pending) return;
    const result = applyVoiceAction(pending);
    setPending(null);
    show(result);
  };

  const cancel = () => {
    setPending(null);
    show("Cancel — kuch change nahi hua", true);
  };

  const start = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      show("Is device pe voice support nahi", false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      void handleText(text);
    };
    rec.onerror = () => {
      setListening(false);
      show("Mic error — permission check karo", false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    setFeedback(geminiKey ? "Listening (Gemini)..." : "Listening (local)...");
  };

  return (
    <div className="relative flex items-center gap-2">
      {pending && (
        <div
          className="fixed inset-x-3 bottom-24 z-50 surface rounded-2xl p-3 shadow-lg border"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <p className="text-xs font-bold mb-2">{describeAction(pending)}</p>
          <p className="text-[10px] font-bold mb-2" style={{ color: "var(--muted)" }}>
            Tool call permission — confirm karo
          </p>
          <div className="flex gap-2">
            <button onClick={confirm} className="btn-primary flex-1 rounded-xl py-2 text-xs font-bold">
              Haan, karo
            </button>
            <button onClick={cancel} className="btn-solid flex-1 rounded-xl py-2 text-xs font-bold">
              Nahi
            </button>
          </div>
        </div>
      )}
      {feedback && !pending && (
        <span
          className="absolute right-12 top-1/2 z-20 max-w-[160px] -translate-y-1/2 truncate rounded-lg px-2 py-1 text-[10px] font-bold border"
          style={{
            background: "var(--card)",
            color: "var(--text)",
            borderColor: "var(--border-strong)",
          }}
        >
          {feedback}
        </span>
      )}
      <button
        onClick={listening ? () => recRef.current?.stop() : start}
        disabled={busy}
        className="rounded-full p-2 border font-bold"
        style={{
          background: listening ? "var(--danger)" : "var(--card)",
          color: listening ? "#fff" : "var(--text)",
          borderColor: "var(--border-strong)",
        }}
        aria-label="Voice"
      >
        <Mic size={18} />
      </button>
    </div>
  );
}
