import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import PinScreen from "@/pages/PinScreen";
import Dashboard from "@/pages/Dashboard";
import WorkersPage from "@/pages/WorkersPage";
import ProductionPage from "@/pages/ProductionPage";
import CashPage from "@/pages/CashPage";
import PayrollPage from "@/pages/PayrollPage";
import SettingsPage from "@/pages/SettingsPage";
import VoiceBar from "@/components/VoiceBar";
import {
  LayoutDashboard,
  Users,
  Factory,
  Wallet,
  CalendarCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "workers", label: "Workers", icon: Users },
  { id: "production", label: "Prod", icon: Factory },
  { id: "cash", label: "Cash", icon: Wallet },
  { id: "payroll", label: "Pay", icon: CalendarCheck },
  { id: "settings", label: "More", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const unlocked = useAppStore((s) => s.unlocked);
  const [tab, setTab] = useState<TabId>("home");

  if (!unlocked) return <PinScreen />;

  return (
    <div className="flex h-full flex-col safe-top bg-[var(--bg)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-black px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            TowelWorks
          </h1>
          <p className="text-xs text-[var(--muted)]">Offline mill book</p>
        </div>
        <VoiceBar />
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3">
        {tab === "home" && <Dashboard onNavigate={setTab} />}
        {tab === "workers" && <WorkersPage />}
        {tab === "production" && <ProductionPage />}
        {tab === "cash" && <CashPage />}
        {tab === "payroll" && <PayrollPage />}
        {tab === "settings" && <SettingsPage />}
      </main>

      <nav className="safe-bottom flex border-t border-[var(--border)] bg-black">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                active ? "text-white" : "text-[var(--muted)]"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
