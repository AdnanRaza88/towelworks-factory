# Code Connection Map

Last updated: 2026-09-29 13:00 PKT

Repo: AdnanRaza88/towelworks-factory (main @ Phase 1 payroll.ts)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → calc.test.ts, cashRules.test.ts, rates.test.ts, payroll.test.ts
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/main.tsx | boot | — | App | — |
| src/App.tsx | shell/tabs + PIN gate | App | store, pages, PinScreen | main |
| src/store/useAppStore.ts | persisted state + actions | useAppStore, VoiceAction | types, calc, cashRules, rates | all pages, App |
| src/lib/factory/types.ts | domain types + APP_VERSION 1.3.0 | WorkerRole, Attendance, ProductionEntry, CashType, RateSnapshot, AppState, MACHINES, DEFAULT_SETTINGS, APP_VERSION | — | store, pages, cashRules, rates, payroll |
| src/lib/factory/calc.ts | round/pay/week/uid | roundNearest500, calcAmount, getWeekRange, todayStr, uid | — | store, ProductionPage, PayrollPage, tests |
| src/lib/factory/cashRules.ts | cash sign / net payable | cashSignedAmount, cashOutTotal, netPayable, isValidCashAmount, normalizeCashAmount | types | store.addCash, payroll, cashRules.test |
| src/lib/factory/rates.ts | historical + live rates | rateFor, resolveRate | types | store.addProduction, store.addWorker, rates.test |
| src/lib/factory/payroll.ts | week payroll rows | countsAsPresent, countPresentDays, weekProductionTotals, workerPayrollRow, buildPayrollRows, totalNetPayable | types, cashRules | PayrollPage, payroll.test |
| src/lib/factory/calc.test.ts | unit tests | — | calc | npm test |
| src/lib/factory/cashRules.test.ts | cash rule tests | — | cashRules | npm test |
| src/lib/factory/rates.test.ts | rate resolution tests | — | rates, types | npm test |
| src/lib/factory/payroll.test.ts | payroll week tests | — | payroll, types | npm test |
| src/pages/ProductionPage.tsx | production form | default | store, types, calc, utils | App |
| src/pages/PayrollPage.tsx | week payroll UI | default | store, calc, payroll, utils | App |
| src/pages/PinScreen.tsx | PIN pad | default | store.unlock | App when unlocked=false |
| src/pages/Dashboard.tsx | home | default | store | App |
| src/pages/WorkersPage.tsx | workers/attendance | default | store | App |
| src/pages/CashPage.tsx | cash form | default | store, types, calc, utils | App |
| src/pages/SettingsPage.tsx | settings | default | store | App |
| src/pages/ProvidersPage.tsx | providers | default | store | App |
| src/pages/AgentPage.tsx | voice agent UI | default | store, voiceAgent | App |
| src/lib/voiceAgent.ts | Gemini voice | — | store VoiceAction | AgentPage |
| src/lib/utils.ts | cn, formatRs | cn, formatRs | — | pages |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 (C5) |

## 3. Import / Call Graph

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

Callers:
- ProductionPage.submit — passes role (C1 2026-09-28)
- applyVoiceAction type production — correct (passes role)

Must never change signature without updating both callers + this map.

Rate on save: `resolveRate(role, date, rateHistory, settings)` from `src/lib/factory/rates.ts` — latest snapshot with effectiveFrom <= date; fallback live settings (C4). Frozen on ProductionEntry.ratePer100/amount.

### Attendance

- Model: `Attendance.status: AttendanceStatus`
- markAttendance writes `status`
- `countsAsPresent` / `countPresentDays` in payroll.ts: status === "present" || status === "half" (C3)

### PIN

- settings.pin default "1234"
- unlock(pin) compares pin === settings.pin; returns false on mismatch (C2 2026-09-29)
- PinScreen calls unlock(next) at 4 digits
- App renders PinScreen when unlocked === false (C2)
- lock() sets unlocked false; persist partialize does not save unlocked (reload starts unlocked)
- Phase 1 still: change pin in settings, lock from header

### Rates (Phase 1 rates.ts)

- Canonical: `src/lib/factory/rates.ts` — `rateFor`, `resolveRate`
- rateFor(role, settings) live rates (addWorker)
- resolveRate(role, date, history, settings) used by addProduction
- updateRates appends snapshot, does not mutate past production (keep this)
- Empty / future-only history falls back to live settings

### Cash (Phase 1 cashRules)

- Debit types (increase cashOut, reduce net): advance, loan, deduction
- Credit types (decrease cashOut, raise net): return, settlement, payment
- `cashSignedAmount` / `cashOutTotal` / `netPayable` used by payroll.ts
- `addCash` still `(workerId, type, amount, date?, note?)`; stores Math.abs; rejects 0/NaN via isValidCashAmount
- Callers: CashPage.submit, applyVoiceAction type cash — signature unchanged

### Payroll (Phase 1 payroll.ts)

- Canonical week row math: `src/lib/factory/payroll.ts`
- PayrollPage calls `buildPayrollRows` + `totalNetPayable` only
- Net still `prodPay - cashOutTotal(week cash)` via cashRules
- Present days still status in {present, half}
- Inactive workers and empty rows (no pieces, zero cashOut, zero days) omitted

### Version

- package.json version, APP_VERSION, DEFAULT_SETTINGS.appVersion all "1.3.0" (C5 2026-09-29)

## 4. Critical Shared Contracts

- addProduction arity: workerId, machineId, role, rawPieces, date?, note?, sessionId?
- addCash arity: workerId, type, amount, date?, note?
- Attendance.status not .present
- RateSnapshot.effectiveFrom YYYY-MM-DD; historical ProductionEntry.ratePer100/amount frozen
- resolveRate lives in rates.ts; store must not keep a second copy
- Cash debit = advance|loan|deduction; credit = return|settlement|payment
- net = prodPay - cashOutTotal(week cash)
- Week payroll row math lives in payroll.ts; PayrollPage must not reimplement it
- APP_VERSION string must match package.json version (1.3.0 after C5)
- persist key `towelworks-v2`, store version 2
- unlock(pin) must compare settings.pin and return boolean

## 5. Change Impact Rules

- Changing addProduction signature requires ProductionPage + applyVoiceAction + this map.
- Changing addCash signature requires CashPage + applyVoiceAction + this map.
- Never rewrite historical production amounts on rate change.
- Payroll present-days must use status in {present, half} not a.present.
- Cash week net must use cashRules, not a second copy of debit/credit lists.
- Rate lookup must use rates.ts, not a second copy of resolveRate.
- Week payroll totals must use payroll.ts, not a second copy in PayrollPage.
- Hybrid UI only when touching styles.
- Changing unlock contract requires PinScreen + App gate.
- Bumping version requires package.json + APP_VERSION + DEFAULT_SETTINGS.appVersion together.

## 6. Recent Changes Log

- 2026-09-28 20:55 PKT — initial scan of towelworks-factory main e97d177; C1 identified as next (ProductionPage arity).
- 2026-09-28 20:58 PKT — C1: ProductionPage addProduction(workerId, machineId, role, raw, date, note); role select + preview via settings rates.
- 2026-09-29 07:55 PKT — C2: unlock compares settings.pin; App gates with PinScreen when unlocked=false.
- 2026-09-29 08:00 PKT — C3: PayrollPage daysPresent uses status present or half.
- 2026-09-29 09:00 PKT — C4: addProduction resolveRate from rateHistory by entry date (e2de741).
- 2026-09-29 10:05 PKT — C5: APP_VERSION and DEFAULT_SETTINGS.appVersion set to 1.3.0 to match package.json.
- 2026-09-29 11:05 PKT — Phase 1 cashRules: extract debit/credit + netPayable; PayrollPage + addCash consume it.
- 2026-09-29 12:00 PKT — Phase 1 rates.ts: extract rateFor + resolveRate; store imports module; rates.test added.
- 2026-09-29 13:00 PKT — Phase 1 payroll.ts: extract week row math; PayrollPage uses buildPayrollRows; payroll.test added.
