# Code Connection Map

Last updated: 2026-09-28 20:58 PKT

Repo: AdnanRaza88/towelworks-factory (main)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → `src/lib/factory/calc.test.ts`
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/main.tsx | boot | — | App | — |
| src/App.tsx | shell/tabs | App | store, pages | main |
| src/store/useAppStore.ts | persisted state + actions | useAppStore, VoiceAction | types, calc | all pages, App |
| src/lib/factory/types.ts | domain types + APP_VERSION | WorkerRole, Attendance, ProductionEntry, AppState, MACHINES, DEFAULT_SETTINGS, APP_VERSION | — | store, pages, calc consumers |
| src/lib/factory/calc.ts | round/pay/week/uid | roundNearest500, calcAmount, getWeekRange, todayStr, uid | — | store, ProductionPage, PayrollPage, tests |
| src/lib/factory/calc.test.ts | unit tests | — | calc | npm test |
| src/pages/ProductionPage.tsx | production form | default | store, types, calc, utils | App |
| src/pages/PayrollPage.tsx | week payroll | default | store, calc, utils | App |
| src/pages/PinScreen.tsx | PIN pad | default | store | **not wired in App** |
| src/pages/Dashboard.tsx | home | default | store | App |
| src/pages/WorkersPage.tsx | workers/attendance | default | store | App |
| src/pages/CashPage.tsx | cash | default | store | App |
| src/pages/SettingsPage.tsx | settings | default | store | App |
| src/pages/ProvidersPage.tsx | providers | default | store | App |
| src/pages/AgentPage.tsx | voice agent UI | default | store, voiceAgent | App |
| src/lib/voiceAgent.ts | Gemini voice | — | store VoiceAction | AgentPage |
| src/lib/utils.ts | cn, formatRs | cn, formatRs | — | pages |
| package.json | version 1.3.0 | — | — | C5 mismatch vs APP_VERSION 1.2.0 |

## 3. Import / Call Graph

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

Callers:
- ProductionPage.submit — passes role (C1 2026-09-28)
- applyVoiceAction type production — correct (passes role)

Must never change signature without updating both callers + this map.

### Attendance

- Model: `Attendance.status: AttendanceStatus`
- markAttendance writes `status`
- PayrollPage still reads `a.present` (C3)

### PIN

- settings.pin default "1234"
- unlock(pin) ignores pin (C2)
- PinScreen calls unlock(next) at 4 digits
- App does not gate on unlocked

### Rates

- rateFor(role, settings) live rates only
- rateHistory snapshots exist; addProduction does not resolve by date (C4)
- updateRates appends snapshot, does not mutate past production (keep this)

## 4. Critical Shared Contracts

- addProduction arity: workerId, machineId, role, rawPieces, date?, note?, sessionId?
- Attendance.status not .present
- RateSnapshot.effectiveFrom YYYY-MM-DD; historical ProductionEntry.ratePer100/amount frozen
- APP_VERSION string must match package.json version after C5
- persist key `towelworks-v2`, store version 2

## 5. Change Impact Rules

- Changing addProduction signature requires ProductionPage + applyVoiceAction + this map.
- Never rewrite historical production amounts on rate change.
- Payroll present-days must use status in {present, half} not a.present.
- Hybrid UI only when touching styles.

## 6. Recent Changes Log

- 2026-09-28 20:55 PKT — initial scan of towelworks-factory main.
- 2026-09-28 20:58 PKT — C1: ProductionPage addProduction(workerId, machineId, role, raw, date, note); role select + preview via settings rates.
