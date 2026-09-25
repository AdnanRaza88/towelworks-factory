import type { VoiceAction } from "@/store/useAppStore";
import type {
  CashType,
  WorkerRole,
  WorkerType,
  Worker,
  Attendance,
  ProductionEntry,
  CashEntry,
  WorkSession,
  AppSettings,
} from "@/lib/factory/types";
import { todayStr, getWeekRange } from "@/lib/factory/calc";

export type ResolvedVoice =
  | { kind: "action"; action: VoiceAction; reply: string }
  | { kind: "chat"; reply: string }
  | { kind: "error"; reply: string };

export type FactorySnapshot = {
  settings: AppSettings;
  workers: Worker[];
  attendance: Attendance[];
  production: ProductionEntry[];
  cash: CashEntry[];
  sessions: WorkSession[];
};

export function buildFactoryContext(snap: FactorySnapshot): string {
  const today = todayStr();
  const { start, end } = getWeekRange(today);
  const active = snap.workers.filter((w) => w.active);
  const lines: string[] = [];

  lines.push(`Mill: ${snap.settings.millName}`);
  lines.push(`Today: ${today}`);
  lines.push(`Week (Sat-Fri): ${start} to ${end}`);
  lines.push(
    `Rates: Tailor Rs.${snap.settings.tailorRate}/100, Helper Rs.${snap.settings.helperRate}/100`
  );
  lines.push(`Active workers: ${active.length}`);

  lines.push("\nWORKERS:");
  for (const w of active) {
    lines.push(
      `- ${w.name} | ${w.role} | ${w.type} | rate ${w.ratePer100}/100 | id=${w.id}`
    );
  }

  lines.push("\nATTENDANCE TODAY:");
  const attToday = snap.attendance.filter((a) => a.date === today);
  if (!attToday.length) lines.push("- (none yet)");
  for (const a of attToday) {
    const w = snap.workers.find((x) => x.id === a.workerId);
    lines.push(`- ${w?.name ?? a.workerId}: ${a.status}`);
  }

  lines.push("\nSESSIONS TODAY:");
  const sessToday = snap.sessions.filter((s) => s.date === today);
  if (!sessToday.length) lines.push("- (none)");
  for (const s of sessToday) {
    const w = snap.workers.find((x) => x.id === s.workerId);
    lines.push(`- M${s.machineId} ${s.role}: ${w?.name ?? s.workerId}`);
  }

  const weekProd = snap.production.filter(
    (p) => p.date >= start && p.date <= end
  );
  const todayProd = snap.production.filter((p) => p.date === today);
  const weekPay = weekProd.reduce((s, p) => s + p.amount, 0);
  const todayPcs = todayProd.reduce((s, p) => s + p.roundedPieces, 0);
  lines.push(`\nPRODUCTION: today pieces=${todayPcs}, week pay=Rs.${weekPay}`);
  for (const p of [...todayProd].slice(-8)) {
    const w = snap.workers.find((x) => x.id === p.workerId);
    lines.push(
      `- ${p.date} ${w?.name} M${p.machineId} ${p.role} ${p.roundedPieces}pcs Rs.${p.amount}`
    );
  }

  const weekCash = snap.cash.filter((c) => c.date >= start && c.date <= end);
  lines.push(`\nCASH THIS WEEK (${weekCash.length} entries):`);
  for (const c of weekCash.slice(-10)) {
    const w = snap.workers.find((x) => x.id === c.workerId);
    lines.push(`- ${c.date} ${w?.name}: ${c.type} Rs.${c.amount}`);
  }

  lines.push("\nWORKER TOTALS (all time in store):");
  for (const w of active) {
    const pay = snap.production
      .filter((p) => p.workerId === w.id)
      .reduce((s, p) => s + p.amount, 0);
    const cashOut = snap.cash
      .filter((c) => c.workerId === w.id)
      .reduce((s, c) => {
        if (c.type === "return" || c.type === "payment") return s - c.amount;
        return s + c.amount;
      }, 0);
    lines.push(`- ${w.name}: prod pay Rs.${pay}, cash out Rs.${cashOut}`);
  }

  return lines.join("\n");
}

const SYSTEM = `You are TowelWorks factory docking agent (Roman Urdu + simple English).
You have LIVE factory data in FACTORY_DATA below. Use ONLY that data for facts.
Be helpful, short, and clear. Answer questions about workers, attendance, production, cash, payroll, machines, rates.

If user wants a CHANGE (mark attendance, add production, cash, add worker, session), return JSON:
{"type":"action","reply":"short confirm question in Roman Urdu/English","action":{...}}

Action object must be one of:
{"type":"attendance","workerName":"Imran","status":"present"}
{"type":"production","workerName":"Imran","machineId":3,"role":"tailor","pieces":2500}
{"type":"cash","workerName":"Asif","cashType":"advance","amount":2000}
{"type":"add_worker","name":"Bilal","role":"helper","workerType":"outside"}
{"type":"session","workerName":"Imran","machineId":2,"role":"tailor"}

status: present|absent|half|off
cashType: advance|loan|deduction|return|settlement|payment
role: tailor|helper
workerType: permanent|outside

If user is chatting or asking (no change), return ONLY:
{"type":"chat","reply":"your answer using FACTORY_DATA"}

Never invent workers or numbers not in FACTORY_DATA. If unknown, say data nahi mila.
Always return valid JSON only. No markdown fences.`;

export function parseLocalVoice(text: string): VoiceAction | null {
  const t = text.toLowerCase().trim();

  const hazir = t.match(/(\w+)\s+(hazir|haazir|present|aaya|aya)/i);
  if (hazir) return { type: "attendance", workerName: hazir[1], status: "present" };

  const ghaib = t.match(/(\w+)\s+(ghaib|ghair|absent|nahi\s+aya)/i);
  if (ghaib) return { type: "attendance", workerName: ghaib[1], status: "absent" };

  const prod = t.match(
    /(?:machine|m)\s*(\d+)\s*(?:par|pe|on)?\s*(?:(\w+)\s+)?(\d+)\s*(?:piece|pieces|pcs)?/i
  );
  if (prod) {
    const machineId = Number(prod[1]);
    const maybeName = prod[2];
    const pieces = Number(prod[3]);
    if (machineId >= 1 && machineId <= 11 && pieces > 0) {
      const role: WorkerRole | undefined = /helper|cropper/.test(t)
        ? "helper"
        : /tailor|karigar/.test(t)
          ? "tailor"
          : undefined;
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
    let cashType = cash[3].toLowerCase();
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

export function answerFromStore(text: string, snap: FactorySnapshot): string | null {
  const t = text.toLowerCase();
  const today = todayStr();
  const { start, end } = getWeekRange(today);
  const active = snap.workers.filter((w) => w.active);

  if (/how are you|kya haal|kaise ho|hey|hi\b|hello|salam/i.test(t)) {
    return `Theek hoon. ${snap.settings.millName} agent ready. ${active.length} active workers. Bolo kya chahiye?`;
  }

  if (/worker|bande|staff|kitne|list/i.test(t) && /update|status|kaun|kon|kya|kitne|list|record/i.test(t)) {
    const names = active.map((w) => `${w.name} (${w.role}/${w.type})`).join(", ");
    const present = snap.attendance.filter(
      (a) => a.date === today && a.status === "present"
    ).length;
    return `Active workers (${active.length}): ${names || "—"}. Aaj present: ${present}. Week ${start} → ${end}.`;
  }

  if (/present|hazir|attendance|aaj/i.test(t)) {
    const att = snap.attendance.filter((a) => a.date === today);
    if (!att.length) return "Aaj abhi koi attendance mark nahi hui.";
    return att
      .map((a) => {
        const w = snap.workers.find((x) => x.id === a.workerId);
        return `${w?.name ?? "?"}: ${a.status}`;
      })
      .join("; ");
  }

  if (/production|piece|pieces|kaam/i.test(t)) {
    const todayPcs = snap.production
      .filter((p) => p.date === today)
      .reduce((s, p) => s + p.roundedPieces, 0);
    const weekPay = snap.production
      .filter((p) => p.date >= start && p.date <= end)
      .reduce((s, p) => s + p.amount, 0);
    return `Aaj pieces: ${todayPcs}. Is week production pay: Rs.${weekPay}.`;
  }

  if (/cash|advance|peshgi|loan|paise/i.test(t)) {
    const weekCash = snap.cash.filter((c) => c.date >= start && c.date <= end);
    if (!weekCash.length) return "Is week koi cash entry nahi.";
    const total = weekCash.reduce((s, c) => s + c.amount, 0);
    return `Is week ${weekCash.length} cash entries, total ~Rs.${total}.`;
  }

  if (/rate|tailor|helper/i.test(t)) {
    return `Tailor Rs.${snap.settings.tailorRate}/100, Helper Rs.${snap.settings.helperRate}/100.`;
  }

  for (const w of active) {
    if (t.includes(w.name.toLowerCase())) {
      const pay = snap.production
        .filter((p) => p.workerId === w.id)
        .reduce((s, p) => s + p.amount, 0);
      const cashOut = snap.cash
        .filter((c) => c.workerId === w.id)
        .reduce((s, c) => {
          if (c.type === "return" || c.type === "payment") return s - c.amount;
          return s + c.amount;
        }, 0);
      const att = snap.attendance.find((a) => a.workerId === w.id && a.date === today);
      return `${w.name}: ${w.role}/${w.type}, aaj ${att?.status ?? "unmarked"}, prod pay Rs.${pay}, cash out Rs.${cashOut}.`;
    }
  }

  return null;
}

async function callGemini(
  apiKey: string,
  userText: string,
  context: string,
  history: { role: string; text: string }[]
): Promise<{ ok: true; raw: string } | { ok: false; error: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const hist = history
    .slice(-6)
    .map((h) => `${h.role}: ${h.text}`)
    .join("\n");
  const prompt = `${SYSTEM}

FACTORY_DATA:
${context}

RECENT_CHAT:
${hist || "(none)"}

User: ${userText}

Return JSON only.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 400 || res.status === 403) {
        return { ok: false, error: "Gemini key invalid ya blocked — AI Providers mein check karo" };
      }
      if (res.status === 429) {
        return { ok: false, error: "Gemini rate limit — thori der baad try" };
      }
      return { ok: false, error: `Gemini HTTP ${res.status}: ${body.slice(0, 80)}` };
    }
    const data = await res.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!raw) return { ok: false, error: "Gemini empty reply" };
    return { ok: true, raw };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Network: ${msg}` };
  }
}

function parseAgentJson(raw: string): ResolvedVoice | null {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return { kind: "chat", reply: cleaned.slice(0, 400) };
  try {
    const p = JSON.parse(match[0]) as Record<string, unknown>;
    if (p.type === "action" && p.action && typeof p.action === "object") {
      const action = p.action as VoiceAction;
      const reply =
        typeof p.reply === "string"
          ? p.reply
          : "Yeh change karun? Confirm karo.";
      return { kind: "action", action, reply };
    }
    if (p.type === "chat" && typeof p.reply === "string") {
      return { kind: "chat", reply: p.reply };
    }
    if (
      typeof p.type === "string" &&
      ["attendance", "production", "cash", "add_worker", "session", "query"].includes(
        p.type
      )
    ) {
      return {
        kind: "action",
        action: p as unknown as VoiceAction,
        reply: "Yeh action confirm karo?",
      };
    }
    if (typeof p.reply === "string") return { kind: "chat", reply: p.reply };
  } catch {
    return { kind: "chat", reply: cleaned.slice(0, 400) };
  }
  return { kind: "chat", reply: cleaned.slice(0, 400) };
}

export async function resolveVoiceCommand(
  text: string,
  geminiKey: string,
  snap: FactorySnapshot,
  history: { role: string; text: string }[] = []
): Promise<ResolvedVoice> {
  const local = parseLocalVoice(text);
  if (local) {
    return {
      kind: "action",
      action: local,
      reply: "Command samajh gaya — confirm karo?",
    };
  }

  if (geminiKey) {
    const ctx = buildFactoryContext(snap);
    const gem = await callGemini(geminiKey, text, ctx, history);
    if (gem.ok) {
      const parsed = parseAgentJson(gem.raw);
      if (parsed) return parsed;
    } else {
      const offline = answerFromStore(text, snap);
      if (offline) {
        return {
          kind: "chat",
          reply: `${offline} (Gemini: ${gem.error})`,
        };
      }
      return { kind: "error", reply: gem.error };
    }
  }

  const offline = answerFromStore(text, snap);
  if (offline) return { kind: "chat", reply: offline };

  return {
    kind: "chat",
    reply: geminiKey
      ? "Thora clear bolo — workers, attendance, production, ya koi command?"
      : "Gemini key nahi. Local data se limited jawab. Key: More → AI Providers. Ya command: Imran hazir / machine 3 par 2500 piece",
  };
}

export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export async function requestMicPermission(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (typeof navigator === "undefined") {
    return { ok: false, error: "Browser API nahi" };
  }
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { ok: false, error: "Mic API nahi — text se type karo" };
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/NotAllowed|Permission|denied/i.test(msg)) {
      return {
        ok: false,
        error:
          "Mic permission block — Settings → Apps → TowelWorks → Microphone ON",
      };
    }
    if (/NotFound|DevicesNotFound/i.test(msg)) {
      return { ok: false, error: "Mic device nahi mila" };
    }
    return { ok: false, error: `Mic: ${msg}` };
  }
}

export function getSpeechRecognition(): SpeechRecognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
}
