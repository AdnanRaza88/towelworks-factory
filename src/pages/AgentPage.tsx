import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, ImagePlus } from "lucide-react";
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
  const addSlip = useAppStore((s) => s.addSlip);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "system",
      text: "Agent ready · chat + voice + slip photo. Outside/permanent hisab poocho.",
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micStatus, setMicStatus] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        push({ role: "agent", text: q, pendingAction: resolved.action });
        speak(q);
        return;
      }

      if (resolved.kind === "chat" || resolved.kind === "error") {
        push({ role: "agent", text: resolved.reply });
        if (resolved.kind === "chat") speak(resolved.reply);
        return;
      }

      push({ role: "agent", text: "Kuch issue — dobara try karo." });
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
    speak(result);
  };

  const cancelAction = (msgId: string) => {
    setMessages((list) =>
      list.map((m) =>
        m.id === msgId
          ? { ...m, pendingAction: undefined, text: "Cancel — kuch change nahi hua" }
          : m
      )
    );
  };

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = () => reject(new Error("read fail"));
        r.readAsDataURL(file);
      });
      const id = addSlip(`slip ${file.name}`, dataUrl);
      let note = `Slip save ho gaya (${id.slice(0, 6)}). Numbers type karo ya Gemini key se OCR.`;
      if (geminiKey && dataUrl.startsWith("data:image")) {
        try {
          const b64 = dataUrl.split(",")[1] || "";
          const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/jpeg";
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: "Towel mill slip photo. Extract: worker names, pieces, Rs amounts, machine numbers. Short Roman Urdu/English list only.",
                    },
                    { inline_data: { mime_type: mime, data: b64 } },
                  ],
                },
              ],
              generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const raw =
              data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
            if (raw) note = `Slip OCR:\n${raw}`;
          }
        } catch {
          /* keep basic note */
        }
      }
      push({ role: "agent", text: note });
      speak("Slip save ho gaya");
    } catch {
      push({ role: "system", text: "Image read fail — dobara try" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startListen = async () => {
    setMicStatus("Permission...");
    const perm = await requestMicPermission();
    if (!perm.ok) {
      setMicStatus(perm.error ?? "Mic fail");
      push({ role: "system", text: perm.error ?? "Mic fail — text box use karo" });
      return;
    }
    setMicStatus("Mic OK");

    const rec = getSpeechRecognition();
    if (!rec) {
      setMicStatus("STT nahi — type karo");
      push({
        role: "system",
        text: "Speech-to-text WebView mein available nahi. Type karke bhejo.",
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
            ? `Gemini ON · ${workers.filter((w) => w.active).length} workers`
            : "Offline RAG · chat + voice + slip"}
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
              {m.role === "user" ? "You" : m.role === "agent" ? "Agent" : "System"}
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
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-full p-3 border font-bold"
          style={{
            background: "var(--card)",
            color: "var(--text)",
            borderColor: "var(--border-strong)",
          }}
          aria-label="Slip photo"
        >
          <ImagePlus size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
        />
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
