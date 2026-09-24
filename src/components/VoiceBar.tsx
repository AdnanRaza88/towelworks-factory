import { useState, useRef } from "react";
import { Mic } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { resolveVoiceCommand, speak } from "@/lib/voiceAgent";

export default function VoiceBar() {
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const applyVoiceAction = useAppStore((s) => s.applyVoiceAction);
  const geminiKey = useAppStore((s) => s.settings.geminiApiKey);

  const show = (msg: string, say = true) => {
    setFeedback(msg);
    if (say) speak(msg);
    setTimeout(() => setFeedback(""), 4500);
  };

  const handleText = async (text: string) => {
    setBusy(true);
    try {
      const action = await resolveVoiceCommand(text, geminiKey);
      if (!action) {
        show(`Suna: "${text}" — samajh nahi aya. Dobara bolo.`);
        return;
      }
      const result = applyVoiceAction(action);
      show(result);
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
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

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return (
    <div className="relative flex items-center gap-2">
      {feedback && (
        <span className="absolute right-12 top-1/2 z-20 max-w-[180px] -translate-y-1/2 truncate rounded-lg bg-black px-2 py-1 text-[10px] text-white border border-[var(--border-strong)]">
          {feedback}
        </span>
      )}
      <button
        onClick={listening ? stop : start}
        disabled={busy}
        className={`rounded-full p-2 border ${
          listening
            ? "bg-[var(--danger)] text-white border-transparent animate-pulse"
            : "bg-black text-white border-[var(--border-strong)]"
        }`}
        aria-label="Voice command"
      >
        <Mic size={18} />
      </button>
    </div>
  );
}
