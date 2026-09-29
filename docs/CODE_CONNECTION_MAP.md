# Code Connection Map

Last updated: 2026-09-29 16:05 PKT

Repo: AdnanRaza88/towelworks-factory (main @ store split slice 1)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → calc.test.ts, cashRules.test.ts, rates.test.ts, payroll.test.ts, audit.test.ts
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/main.tsx | boot | — | App | — |
| src/App.tsx | shell/tabs + PIN gate + header lock | App | store, pages, PinScreen | main |
| src/store/useAppStore.ts | persist composer | useAppStore, VoiceAction | types, seed, pinSlice, calc, cashRules, rates | all pages, App |
| src/store/types.ts | store action types | VoiceAction, Actions, AppStore, StoreSet, StoreGet, isFourDigitPin | factory types | useAppStore, pinSlice |
| src/store/seed.ts | initial state + persist constants | SEED, initial, PERSIST_NAME, PERSIST_VERSION | factory types | useAppStore |
| src/store/slices/pinSlice.ts | unlock/lock/setPin | createPinSlice | store types | useAppStore |
| src/lib/factory/types.ts | domain types + APP_VERSION 1.3.0 | WorkerRole, Attendance, ProductionEntry, CashType, RateSnapshot, AuditEntry, AppState, MACHINES, DEFAULT_SETTINGS, APP_VERSION | — | store, pages, cashRules, rates, payroll, audit |
| src/lib/factory/calc.ts | round/pay/week/uid | roundNearest500, calcAmount, getWeekRange, todayStr, uid | — | store, ProductionPage, PayrollPage, tests |
| src/lib/factory/cashRules.ts | cash sign / net payable | cashSignedAmount, cashOutTotal, netPayable, isValidCashAmount, normalizeCashAmount | types | store.addCash, payroll, cashRules.test |
| src/lib/factory/rates.ts | historical + live rates | rateFor, resolveRate | types | store.addProduction, store.addWorker, rates.test |
| src/lib/factory/payroll.ts | week payroll rows | countsAsPresent, countPresentDays, weekProductionTotals, workerPayrollRow, buildPayrollRows, totalNetPayable | types, cashRules | PayrollPage, payroll.test |
| src/lib/factory/audit.ts | audit log walk | sortAuditNewestFirst, clampAuditIndex, prevAuditIndex, nextAuditIndex, auditAt, canGoPrev, canGoNext, formatAuditLine | types | SettingsPage, audit.test |
| src/pages/ProductionPage.tsx | production form | default | store, types, calc, utils | App |
| src/pages/PayrollPage.tsx | week payroll UI | default | store, calc, payroll, utils | App |
| src/pages/PinScreen.tsx | PIN pad | default | store.unlock | App when unlocked=false |
| src/pages/SettingsPage.tsx | settings + audit + change PIN | default | store, audit | App |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 |

## 3. Import / Call Graph

### Store split (Phase 2, slice 1)

- Public hook still `useAppStore` from `src/store/useAppStore.ts` — pages must not change import path.
- VoiceAction re-exported from useAppStore for voiceAgent / AgentPage.
- PIN actions live in `createPinSlice`; contracts unchanged: unlock compares settings.pin; setPin needs current match + 4-digit next; lock not persisted.
- Remaining actions still defined in useAppStore until later slices (workers, production, cash, backup).

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

Callers:
- ProductionPage.submit
- applyVoiceAction type production

Rate on save: `resolveRate` from rates.ts. Frozen on ProductionEntry.ratePer100/amount.

### PIN

- unlock / lock / setPin implemented in pinSlice, composed into useAppStore
- persist partialize does not save unlocked

### Persist

- name `towelworks-v2`, version 2 — constants in seed.ts

## 4. Critical Shared Contracts

- addProduction arity unchanged
- addCash arity unchanged
- persist key `towelworks-v2`, store version 2
- Pages import useAppStore from `@/store/useAppStore` only
- VoiceAction export path stays useAppStore
- unlock(pin) compares settings.pin; setPin(current, next); lock() not persisted
- appendAudit prepends, cap 500

## 5. Change Impact Rules

- Further store slices must keep useAppStore as the only public hook.
- Never rewrite historical production amounts on rate change.
- Changing addProduction signature requires ProductionPage + applyVoiceAction + this map.
- Next Phase 2 slices: workers/attendance, production/sessions, cash/rates, backup/voice.

## 6. Recent Changes Log

- 2026-09-29 16:05 PKT — Phase 2 store split slice 1: types.ts + seed.ts + pinSlice; useAppStore composes PIN slice; persist contracts unchanged.
- 2026-09-29 15:01 PKT — Phase 1 PIN wired: setPin + Settings change form + header Lock.
- 2026-09-29 14:05 PKT — Phase 1 audit: audit.ts prev/next + Settings browser + audit.test.
- 2026-09-29 13:00 PKT — Phase 1 payroll.ts: extract week row math.
- 2026-09-29 12:00 PKT — Phase 1 rates.ts: extract rateFor + resolveRate.
- 2026-09-29 11:05 PKT — Phase 1 cashRules: extract debit/credit + netPayable.
