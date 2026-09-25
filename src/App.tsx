import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import Dashboard from "@/pages/Dashboard";
import WorkersPage from "@/pages/WorkersPage";
import ProductionPage from "@/pages/ProductionPage";
import CashPage from "@/pages/CashPage";
import PayrollPage from "@/pages/PayrollPage";
import SettingsPage from "@/pages/SettingsPage";
import ProvidersPage from "@/pages/ProvidersPage";
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

type TabId = (typeof TABS)[number]["id"] | "providers";

export default function App() {
  const theme = useAppStore((s) => s.settings.theme ?? "light");
  const [tab, setTab] = useState<TabId>("home");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell flex h-full flex-col safe-top" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ background: "var(--header-bg)", borderColor: "var(--border)" }}
      >
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--primary)" }}>
            TowelWorks
          </h1>
          <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>
            Offline mill book
          </p>
        </div>
        <VoiceBar />
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3">
        {tab === "home" && (
          <Dashboard onNavigate={(t) => setTab(t as TabId)} />
        )}
        {tab === "workers" && <WorkersPage />}
        {tab === "production" && <ProductionPage />}
        {tab === "cash" && <CashPage />}
        {tab === "payroll" && <PayrollPage />}
        {tab === "settings" && (
          <SettingsPage onOpenProviders={() => setTab("providers")} />
        )}
        {tab === "providers" && (
          <ProvidersPage onBack={() => setTab("settings")} />
        )}
      </main>

      <nav
        className="safe-bottom flex border-t"
        style={{ background: "var(--nav-bg)", borderColor: "var(--border)" }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id || (tab === "providers" && t.id === "settings");
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition"
              )}
              style={{ color: active ? "var(--primary)" : "var(--muted)" }}
            >
              <Icon size={20} strokeWidth={active ? 2.6 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
