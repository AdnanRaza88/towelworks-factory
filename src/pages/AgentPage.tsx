import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { useAppStore, type VoiceAction } from "@/store/useAppStore";
import {
  resolveVoiceCommand,
  speak,
  requestMicPermission,
  getSpeechRecognition,
  type FactorySnapshot,
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
  const settings = useAppStore((s) => s.settings);
  const workers = useAppStore((s) => s.workers);
  const attendance = useAppStore((s) => s.attendance);
  const production = useAppStore((s) => s.production);
  const cash = useAppStore((s) => s.cash);
  const sessions = useAppStore((s) => s.sessions);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "system",
      text: geminiKey
        ? "Docking agent ready. Factory data loaded. Sawal poocho ya command do."
        : "Gemini key nahi — local store se limited jawab. Full baat: More → AI Providers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micStatus, setMicStatus] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognition | null>(null);

  const snap: FactorySnapshot = {
    settings,
    workers,
    attendance,
    production,
    cash,
    sessions,
  };

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    setMessages((prev) => {
      const rest = prev.filter((m) => m.id !== "welcome");
      return [
        {
          id: "welcome",
          role: "system",
          text: geminiKey
            ? "Gemini ON · docking agent has live workers/production/cash data."
            : "Gemini OFF · local answers only. Key: More → AI Providers.",
        },
        ...rest,
      ];
    });
  }, [geminiKey]);

  const push = (msg: Omit<Msg, "id">) => {
    setMessages((m) => [
      ...m,
      { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
    ]);
  };

  const handleUserText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    push({ role: "user", text: trimmed });
    setInput("");
    setBusy(true);
    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "agent")
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));

      const resolved = await resolveVoiceCommand(
        trimmed,
        geminiKey,
        snap,
        history
      );

      if (resolved.kind === "action") {
        const q = resolved.reply || describeAction(resolved.action);
        push({
          role: "agent",
          text: q,
          pendingAction: resolved.action,
        });
        if (geminiKey) speak(q);
        return;
      }

      if (resolved.kind === "chat" || resolved.kind === "error") {
        push({ role: "agent", text: resolved.reply });
        if (geminiKey && resolved.kind === "chat") speak(resolved.reply);
        return;
      }

      push({
        role: "agent",
        text: "Kuch issue — dobara try karo.",
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = (msgId: string, action: VoiceAction) => {
    const result = applyVoiceAction(action);
    setMessages((list) =>
      list.map((m) =>
        m.id === msgId
          ? { ...m, pendingAction: undefined, text: result }
          : m
      )
    );
    if (geminiKey) speak(result);
  };

  const cancelAction = (msgId: string) => {
    setMessages((list) =>
      list.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingAction: undefined,
              text: "Cancel — kuch change nahi hua",
            }
          : m
      )
    );
  };

  const startListen = async () => {
    setMicStatus("Permission...");
    const perm = await requestMicPermission();
    if (!perm.ok) {
      setMicStatus(perm.error ?? "Mic fail");
      push({
        role: "system",
        text: perm.error ?? "Mic fail — text box use karo",
      });
      return;
    }
    setMicStatus("Mic OK");

    const rec = getSpeechRecognition();
    if (!rec) {
      setMicStatus("STT nahi — type karo");
      push({
        role: "system",
        text: "Speech-to-text is WebView mein available nahi. Type karke bhejo — agent same jawab dega.",
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
      const said = ev.results[0][0].transcript;
      setListening(false);
      setMicStatus("");
      void handleUserText(said);
    };
    rec.onerror = (ev) => {
      setListening(false);
      const err = (ev as SpeechRecognitionErrorEvent).error;
      let tip = `Mic: ${err}`;
      if (err === "not-allowed") {
        tip =
          "Permission block. Phone Settings → Apps → TowelWorks → Microphone → Allow";
      } else if (err === "no-speech") {
        tip = "Kuch suna nahi — type karo";
      } else if (err === "network") {
        tip = "Speech network service fail — text type karo";
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
      setMicStatus("Start fail — type karo");
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
          {geminiKey
            ? `Gemini ON · ${workers.filter((w) => w.active).length} workers in context`
            : "Gemini OFF · local data answers only"}
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
              marginLeft: m.role === "user" ? "18%" : 0,
              marginRight: m.role === "user" ? 0 : "10%",
              border: m.role !== "user" ? "1px solid var(--border)" : "none",
            }}
          >
            <p className="text-[9px] opacity-70 mb-0.5">
              {m.role === "user"
                ? "You"
                : m.role === "agent"
                  ? "Agent"
                  : "System"}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
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
        {busy && (
          <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
            Agent soch raha hai...
          </p>
        )}
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
          placeholder="Sawal ya command..."
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
