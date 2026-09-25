import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { todayStr, getWeekRange } from "@/lib/factory/calc";
import { formatRs } from "@/lib/utils";
import { Users, Factory, Wallet, CalendarCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line,
} from "recharts";

interface Props {
  onNavigate: (tab: "workers" | "production" | "cash" | "payroll") => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const workers = useAppStore((s) => s.workers);
  const attendance = useAppStore((s) => s.attendance);
  const production = useAppStore((s) => s.production);
  const cash = useAppStore((s) => s.cash);
  const millName = useAppStore((s) => s.settings.millName);

  const today = todayStr();
  const { start, end } = getWeekRange(today);

  const activeWorkers = workers.filter((w) => w.active).length;
  const presentToday = attendance.filter(
    (a) => a.date === today && (a.status === "present" || (a as { present?: boolean }).present === true)
  ).length;
  const todayPieces = production.filter((p) => p.date === today).reduce((s, p) => s + p.roundedPieces, 0);
  const weekPay = production.filter((p) => p.date >= start && p.date <= end).reduce((s, p) => s + p.amount, 0);
  const weekCash = cash.filter((c) => c.date >= start && c.date <= end).reduce((s, c) => {
    if (c.type === "advance" || c.type === "loan" || c.type === "deduction") return s + c.amount;
    return s - c.amount;
  }, 0);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; pieces: number; pay: number; cashOut: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), pieces: 0, pay: 0, cashOut: 0 });
    }
    for (const p of production) {
      const row = map.get(p.date);
      if (row) { row.pieces += p.roundedPieces; row.pay += p.amount; }
    }
    for (const c of cash) {
      const row = map.get(c.date);
      if (row) {
        if (c.type === "advance" || c.type === "loan" || c.type === "deduction") row.cashOut += c.amount;
        else row.cashOut -= c.amount;
      }
    }
    return Array.from(map.values());
  }, [production, cash]);

  const cards = [
    { label: "Active workers", value: String(activeWorkers), sub: `${presentToday} present today`, icon: Users, tab: "workers" as const },
    { label: "Today pieces", value: todayPieces.toLocaleString(), sub: "rounded nearest 500", icon: Factory, tab: "production" as const },
    { label: "Week production pay", value: formatRs(weekPay), sub: `${start.slice(5)} → ${end.slice(5)}`, icon: CalendarCheck, tab: "payroll" as const },
    { label: "Week cash out", value: formatRs(weekCash), sub: "advances + loans", icon: Wallet, tab: "cash" as const },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold">{millName}</h2>
        <p className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.label} onClick={() => onNavigate(c.tab)} className="surface rounded-2xl p-3 text-left">
              <Icon size={18} style={{ color: "var(--primary)" }} className="mb-2" />
              <p className="text-[11px] font-bold" style={{ color: "var(--muted)" }}>{c.label}</p>
              <p className="mt-0.5 text-lg font-bold mono">{c.value}</p>
              <p className="mt-1 text-[10px] font-bold" style={{ color: "var(--muted)" }}>{c.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="surface rounded-2xl p-3">
        <h3 className="text-sm font-bold mb-2">7-day production (pieces)</h3>
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={36} />
              <Tooltip contentStyle={{ background: "var(--card-solid)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="pieces" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface rounded-2xl p-3">
        <h3 className="text-sm font-bold mb-2">Pay vs cash out (Rs.)</h3>
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={40} />
              <Tooltip contentStyle={{ background: "var(--card-solid)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, fontWeight: 700 }} />
              <Line type="monotone" dataKey="pay" stroke="var(--chart-2)" strokeWidth={2} dot={false} name="Prod pay" />
              <Line type="monotone" dataKey="cashOut" stroke="var(--chart-3)" strokeWidth={2} dot={false} name="Cash out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface rounded-2xl p-4">
        <h3 className="text-sm font-bold">Voice tips</h3>
        <ul className="mt-2 space-y-1 text-xs font-bold" style={{ color: "var(--muted)" }}>
          <li>· Imran hazir hai</li>
          <li>· machine 3 par 2500 piece</li>
          <li>· Asif ko 2000 advance</li>
          <li>· Agent pehle permission maangega</li>
        </ul>
      </div>
    </div>
  );
}
