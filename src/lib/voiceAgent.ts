import type { VoiceAction } from "@/store/useAppStore";
import type { AttendanceStatus, CashType, WorkerRole, WorkerType } from "@/lib/factory/types";

const SYSTEM = `You are TowelWorks factory voice agent. User speaks Roman Urdu or simple English.
Return ONLY valid JSON for one action. No markdown.

Schema examples:
{"type":"attendance","workerName":"Imran","status":"present"}
{"type":"production","workerName":"Imran","machineId":3,"role":"tailor","pieces":2500}
{"type":"cash","workerName":"Asif","cashType":"advance","amount":2000}
{"type":"add_worker","name":"Bilal","role":"helper","workerType":"outside"}
{"type":"session","workerName":"Imran","machineId":2,"role":"tailor"}
{"type":"query","topic":"payroll"}

status: present|absent|half|off
cashType: advance|loan|deduction|return|settlement|payment
role: tailor|helper
workerType: permanent|outside

Roman Urdu: hazir=present, ghair-hazir/ghaib=absent, piece/pieces=production, advance/peshgi=advance.
If unclear return {"type":"query","topic":"clarify"}.`;

export function parseLocalVoice(text: string): VoiceAction | null {
  const t = text.toLowerCase().trim();

  const hazir = t.match(/(\w+)\s+(hazir|haazir|present|aaya|aya)/i);
  if (hazir) {
    return { type: "attendance", workerName: hazir[1], status: "present" };
  }
  const ghaib = t.match(/(\w+)\s+(ghaib|ghair|absent|nahi)/i);
  if (ghaib) {
    return { type: "attendance", workerName: ghaib[1], status: "absent" };
  }

  const prod = t.match(
    /(?:machine|m)\s*(\d+)\s*(?:par|pe|on)?\s*(?:(\w+)\s+)?(\d+)\s*(?:piece|pieces|pcs)?/i
  );
  if (prod) {
    const machineId = Number(prod[1]);
    const maybeName = prod[2];
    const pieces = Number(prod[3]);
    if (machineId >= 1 && machineId <= 11 && pieces > 0) {
      const role: WorkerRole | undefined =
        /helper|cropper/.test(t) ? "helper" : /tailor|karigar/.test(t) ? "tailor" : undefined;
      return {
        type: "production",
        machineId,
        pieces,
        workerName: maybeName && !/^\d+$/.test(maybeName) ? maybeName : undefined,
        role,
      };
    }
  }

  const cash = t.match(
    /(\w+)\s+(?:ko|ke)\s+(\d+)\s+(advance|peshgi|loan|qarz|deduction|return|wapsi|settlement)/i
  );
  if (cash) {
    let cashType = cash[3].toLowerCase() as string;
    if (cashType === "peshgi") cashType = "advance";
    if (cashType === "qarz") cashType = "loan";
    if (cashType === "wapsi") cashType = "return";
    return {
      type: "cash",
      workerName: cash[1],
      amount: Number(cash[2]),
      cashType: cashType as CashType,
    };
  }

  const session = t.match(
    /(\w+)\s+(?:ko|on)?\s*(?:machine|m)\s*(\d+)\s*(?:par|pe)?\s*(tailor|helper|karigar|cropper)/i
  );
  if (session) {
    const roleRaw = session[3].toLowerCase();
    const role: WorkerRole =
      roleRaw === "helper" || roleRaw === "cropper" ? "helper" : "tailor";
    return {
      type: "session",
      workerName: session[1],
      machineId: Number(session[2]),
      role,
    };
  }

  const add = t.match(
    /(?:naya|new|add)\s+(?:worker|banda)?\s*(\w+)\s+(tailor|helper)?\s*(outside|permanent|bahar)?/i
  );
  if (add) {
    return {
      type: "add_worker",
      name: add[1],
      role: (add[2] as WorkerRole) || "helper",
      workerType: (add[3] === "outside" || add[3] === "bahar"
        ? "outside"
        : "permanent") as WorkerType,
    };
  }

  return null;
}

export async function parseWithGemini(
  text: string,
  apiKey: string
): Promise<VoiceAction | null> {
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM}\n\nUser said: ${text}` }],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as VoiceAction;
    if (!parsed?.type) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function resolveVoiceCommand(
  text: string,
  geminiKey: string
): Promise<VoiceAction | null> {
  const local = parseLocalVoice(text);
  if (local) return local;
  if (geminiKey) {
    const ai = await parseWithGemini(text, geminiKey);
    if (ai) return ai;
  }
  return null;
}

export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
