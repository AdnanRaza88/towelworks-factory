import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

interface Props {
  onBack: () => void;
}

export default function ProvidersPage({ onBack }: Props) {
  const key = useAppStore((s) => s.settings.geminiApiKey);
  const setGeminiKey = useAppStore((s) => s.setGeminiKey);
  const [draft, setDraft] = useState(key);
  const [msg, setMsg] = useState("");
  const [testing, setTesting] = useState(false);

  const save = () => {
    setGeminiKey(draft);
    setMsg(draft.trim() ? "Gemini key save ho gayi. Agent ab baat kar sakta hai." : "Key clear.");
    setTimeout(() => setMsg(""), 3000);
  };

  const testKey = async () => {
    if (!draft.trim()) {
      setMsg("Pehle key daalo");
      return;
    }
    setTesting(true);
    setMsg("Testing...");
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(draft.trim())}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with OK only" }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
      });
      if (res.ok) {
        setGeminiKey(draft);
        setMsg("Provider connected. Agent ready.");
      } else {
        setMsg("Key fail — check Gemini API key");
      }
    } catch {
      setMsg("Network error — internet chahiye test ke liye");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-xs font-bold" style={{ color: "var(--primary)" }}>
        ← Settings
      </button>
      <h2 className="text-base font-bold">AI Providers</h2>
      <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>
        Agent yahan se connect hota hai. Key save ke baad mic se Roman Urdu mein baat karo —
        agent pehle permission maangega, phir kaam karega.
      </p>

      <div className="surface rounded-2xl p-3 space-y-2">
        <p className="text-sm font-bold">Google Gemini</p>
        <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
          Model: gemini-2.0-flash · Factory voice agent + tool calling
        </p>
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Gemini API key"
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button onClick={save} className="btn-solid flex-1 rounded-xl py-2.5 text-sm">
            Save key
          </button>
          <button
            onClick={testKey}
            disabled={testing}
            className="btn-primary flex-1 rounded-xl py-2.5 text-sm"
          >
            {testing ? "..." : "Test"}
          </button>
        </div>
        {msg && (
          <p className="text-xs font-bold" style={{ color: "var(--success)" }}>
            {msg}
          </p>
        )}
        <p className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>
          Status: {key ? "Connected" : "Not connected — local voice only"}
        </p>
      </div>

      <div className="surface rounded-2xl p-3 space-y-1">
        <p className="text-sm font-bold">Agent rules</p>
        <ul className="text-[11px] font-bold space-y-1" style={{ color: "var(--muted)" }}>
          <li>· Har financial action se pehle permission</li>
          <li>· Calculation deterministic code se (agent sirf intent)</li>
          <li>· Offline local parser bina key ke bhi chalta hai</li>
          <li>· Key phone pe local store — server pe nahi bhejte</li>
        </ul>
      </div>
    </div>
  );
}
