import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { useAppStore, type VoiceAction } from "@/store/useAppStore";
import {
  resolveVoiceCommand,
  speak,
  requestMicPermission,
  getSpeechRecognition,
} from "@/lib/voiceAgent";

type Msg = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  pendingAction?: VoiceAction;
};

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

export default function AgentPage() {
  const geminiKey = useAppStore((s) => s.settings.geminiApiKey);
  const applyVoiceAction = useAppStore((s) => s.applyVoiceAction);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "system",
      text: geminiKey
        ? "Agent ready. Mic dabao ya type karo. Factory commands pe pehle permission maangega."
        : "Gemini API key nahi — Settings → AI Providers mein key daalo. Tab agent baat karega. Abhi text se local commands chal sakte hain.",
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micStatus, setMicStatus] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages((prev) => {
      const rest = prev.filter((m) => m.id !== "welcome");
      return [
        {
          id: "welcome",
          role: "system",
          text: geminiKey
            ? "Agent connected (Gemini). Bolo ya type karo."
            : "API key nahi — agent baat nahi karega. Local commands (hazir / piece / advance) text se chalenge. Key: Settings → AI Providers.",
        },
        ...rest,
      ];
    });
  }, [geminiKey]);

  const push = (msg: Omit<Msg, "id">) => {
    setMessages((m) => [...m, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  };

  const handleUserText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    push({ role: "user", text: trimmed });
    setInput("");
    setBusy(true);
    try {
      const resolved = await resolveVoiceCommand(trimmed, geminiKey);

      if (resolved.kind === "action") {
        const q = describeAction(resolved.action);
        push({
          role: "agent",
          text: q + " — Confirm?",
          pendingAction: resolved.action,
        });
        if (geminiKey) speak(q);
        return;
      }

      if (resolved.kind === "chat") {
        push({ role: "agent", text: resolved.reply });
        if (geminiKey) speak(resolved.reply);
        return;
      }

      if (!geminiKey) {
        push({
          role: "agent",
          text: "Samajh nahi aya. Gemini key daalo (AI Providers) ya clear command bolo: Imran hazir / machine 3 par 2500 piece",
        });
      } else {
        push({ role: "agent", text: "Samajh nahi aya, dobara bolo." });
        speak("Samajh nahi aya");
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = (msgId: string, action: VoiceAction) => {
    const result = applyVoiceAction(action);
    setMessages((list) =>
      list.map((m) =>
        m.id === msgId ? { ...m, pendingAction: undefined, text: result } : m
      )
    );
    if (geminiKey) speak(result);
  };

  const cancelAction = (msgId: string) => {
    setMessages((list) =>
      list.map((m) =>
        m.id === msgId
          ? { ...m, pendingAction: undefined, text: "Cancel — kuch change nahi" }
          : m
      )
    );
  };

  const startListen = async () => {
    setMicStatus("Permission check...");
    const perm = await requestMicPermission();
    if (!perm.ok) {
      setMicStatus(perm.error ?? "Mic fail");
      push({ role: "system", text: perm.error ?? "Mic fail — text box use karo" });
      return;
    }
    setMicStatus("Mic OK");

    const rec = getSpeechRecognition();
    if (!rec) {
      setMicStatus("SpeechRecognition nahi — text type karo");
      push({
        role: "system",
        text: "Is WebView mein voice recognition nahi. Neeche type karke bhejo — agent same kaam karega.",
      });
      return;
    }

    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setMicStatus("Listening...");
    };
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setListening(false);
      setMicStatus("");
      void handleUserText(text);
    };
    rec.onerror = (ev) => {
      setListening(false);
      const err = (ev as SpeechRecognitionErrorEvent).error;
      let tip = `Mic error: ${err}`;
      if (err === "not-allowed") {
        tip = "Permission block. Phone Settings → Apps → TowelWorks → Microphone → Allow";
      } else if (err === "no-speech") {
        tip = "Kuch suna nahi — dobara try ya type karo";
      } else if (err === "network") {
        tip = "Network speech service fail — text type karo (offline-friendly)";
      } else if (err === "service-not-allowed") {
        tip = "Speech service block — text box use karo";
      }
      setMicStatus(tip);
      push({ role: "system", text: tip });
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setListening(false);
      setMicStatus("Start fail — text type karo");
    }
  };

  const stopListen = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
    setMicStatus("");
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div>
        <h2 className="text-base font-bold">Agent session</h2>
        <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
          {geminiKey ? "Gemini ON · talking enabled" : "Gemini OFF · key chahiye baat ke liye"}
        </p>
      </div>

      <div
        ref={listRef}
        className="surface flex-1 space-y-2 overflow-y-auto rounded-2xl p-3"
        style={{ minHeight: 280, maxHeight: "55vh" }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className="rounded-xl px-3 py-2 text-xs font-bold"
            style={{
              background:
                m.role === "user"
                  ? "var(--primary)"
                  : m.role === "system"
                    ? "var(--bg-elevated)"
                    : "var(--card-solid)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              marginLeft: m.role === "user" ? "20%" : 0,
              marginRight: m.role === "user" ? 0 : "12%",
              border: m.role !== "user" ? "1px solid var(--border)" : "none",
            }}
          >
            <p className="text-[9px] opacity-70 mb-0.5">
              {m.role === "user" ? "You" : m.role === "agent" ? "Agent" : "System"}
            </p>
            <p>{m.text}</p>
            {m.pendingAction && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => confirmAction(m.id, m.pendingAction!)}
                  className="btn-primary flex-1 rounded-lg py-1.5 text-[10px] font-bold"
                >
                  Haan, karo
                </button>
                <button
                  onClick={() => cancelAction(m.id)}
                  className="btn-solid flex-1 rounded-lg py-1.5 text-[10px] font-bold"
                >
                  Nahi
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {micStatus && (
        <p className="text-[10px] font-bold" style={{ color: "var(--warn)" }}>
          {micStatus}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={listening ? stopListen : startListen}
          disabled={busy}
          className="rounded-full p-3 border font-bold"
          style={{
            background: listening ? "var(--danger)" : "var(--card)",
            color: listening ? "#fff" : "var(--text)",
            borderColor: "var(--border-strong)",
          }}
          aria-label="Mic"
        >
          {listening ? <Square size={18} /> : <Mic size={18} />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleUserText(input);
          }}
          placeholder="Type ya mic..."
          className="flex-1 rounded-xl px-3 py-2.5 text-sm font-bold"
          disabled={busy}
        />
        <button
          onClick={() => void handleUserText(input)}
          disabled={busy || !input.trim()}
          className="btn-primary rounded-full p-3"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
