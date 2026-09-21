import { useAppStore } from "@/store/useAppStore";
import { todayStr, getWeekRange } from "@/lib/factory/calc";
import { formatRs } from "@/lib/utils";
import { Users, Factory, Wallet, CalendarCheck } from "lucide-react";

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
    (a) => a.date === today && a.present
  ).length;
  const todayPieces = production
    .filter((p) => p.date === today)
    .reduce((s, p) => s + p.roundedPieces, 0);
  const weekPay = production
    .filter((p) => p.date >= start && p.date <= end)
    .reduce((s, p) => s + p.amount, 0);
  const weekCash = cash
    .filter((c) => c.date >= start && c.date <= end)
    .reduce((s, c) => {
      if (c.type === "advance" || c.type === "loan" || c.type === "deduction")
        return s + c.amount;
      return s - c.amount;
    }, 0);

  const cards = [
    {
      label: "Active workers",
      value: String(activeWorkers),
      sub: `${presentToday} present today`,
      icon: Users,
      tab: "workers" as const,
    },
    {
      label: "Today pieces",
      value: todayPieces.toLocaleString(),
      sub: "rounded nearest 500",
      icon: Factory,
      tab: "production" as const,
    },
    {
      label: "Week production pay",
      value: formatRs(weekPay),
      sub: `${start} → ${end}`,
      icon: CalendarCheck,
      tab: "payroll" as const,
    },
    {
      label: "Week cash out",
      value: formatRs(weekCash),
      sub: "advances + loans − returns",
      icon: Wallet,
      tab: "cash" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{millName}</h2>
        <p className="text-xs text-[var(--muted)] mono">{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={() => onNavigate(c.tab)}
              className="rounded-2xl bg-white p-3 text-left shadow-sm active:bg-slate-50"
            >
              <Icon size={18} className="mb-2 text-[var(--primary)]" />
              <p className="text-[11px] text-[var(--muted)]">{c.label}</p>
              <p className="mt-0.5 text-lg font-semibold mono">{c.value}</p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">{c.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Quick tips</h3>
        <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
          <li>· Voice: “Imran hazir hai”</li>
          <li>· Voice: “machine 3 par 2500 piece”</li>
          <li>· Voice: “Asif ko 2000 advance”</li>
          <li>· PIN demo: 1234</li>
        </ul>
      </div>
    </div>
  );
}
