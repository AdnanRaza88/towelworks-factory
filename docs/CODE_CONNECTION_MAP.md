# Code Connection Map

Last updated: 2026-09-29 19:00 PKT

Repo: AdnanRaza88/towelworks-factory (main @ store split slice 4 cash/rates)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → calc.test.ts, cashRules.test.ts, rates.test.ts, payroll.test.ts, audit.test.ts
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/main.tsx | boot | — | App | — |
| src/App.tsx | shell/tabs + PIN gate + header lock | App | store, pages, PinScreen | main |
| src/store/useAppStore.ts | persist composer | useAppStore, VoiceAction | types, seed, pinSlice, workersSlice, productionSlice, cashRatesSlice, calc | all pages, App |
| src/store/types.ts | store action types | VoiceAction, Actions, AppStore, StoreSet, StoreGet, isFourDigitPin | factory types | useAppStore, slices |
| src/store/seed.ts | initial state + persist constants | SEED, initial, PERSIST_NAME, PERSIST_VERSION | factory types | useAppStore |
| src/store/slices/pinSlice.ts | unlock/lock/setPin | createPinSlice | store types | useAppStore |
| src/store/slices/workersSlice.ts | addWorker/updateWorker/toggleWorker/markAttendance | createWorkersSlice | store types, rates, calc | useAppStore |
| src/store/slices/productionSlice.ts | openSession + addProduction | createProductionSlice | store types, rates, calc | useAppStore |
| src/store/slices/cashRatesSlice.ts | addCash + updateRates | createCashRatesSlice | store types, cashRules, calc | useAppStore |
| src/lib/factory/types.ts | domain types + APP_VERSION 1.3.0 | WorkerRole, Attendance, ProductionEntry, CashType, RateSnapshot, AuditEntry, AppState, MACHINES, DEFAULT_SETTINGS, APP_VERSION | — | store, pages, cashRules, rates, payroll, audit |
| src/lib/factory/calc.ts | round/pay/week/uid | roundNearest500, calcAmount, getWeekRange, todayStr, uid | — | store, slices, ProductionPage, PayrollPage, tests |
| src/lib/factory/cashRules.ts | cash sign / net payable | cashSignedAmount, cashOutTotal, netPayable, isValidCashAmount, normalizeCashAmount | types | cashRatesSlice.addCash, payroll, cashRules.test |
| src/lib/factory/rates.ts | historical + live rates | rateFor, resolveRate | types | workersSlice.addWorker, productionSlice.addProduction, rates.test |
| src/lib/factory/payroll.ts | week payroll rows | countsAsPresent, countPresentDays, weekProductionTotals, workerPayrollRow, buildPayrollRows, totalNetPayable | types, cashRules | PayrollPage, payroll.test |
| src/lib/factory/audit.ts | audit log walk | sortAuditNewestFirst, clampAuditIndex, prevAuditIndex, nextAuditIndex, auditAt, canGoPrev, canGoNext, formatAuditLine | types | SettingsPage, audit.test |
| src/pages/ProductionPage.tsx | production form | default | store, types, calc, utils | App |
| src/pages/PayrollPage.tsx | week payroll UI | default | store, calc, payroll, utils | App |
| src/pages/PinScreen.tsx | PIN pad | default | store.unlock | App when unlocked=false |
| src/pages/SettingsPage.tsx | settings + audit + change PIN | default | store, audit | App |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 |

## 3. Import / Call Graph

### Store split (Phase 2, slice 4)

- Public hook still `useAppStore` from `src/store/useAppStore.ts` — pages must not change import path.
- VoiceAction re-exported from useAppStore for voiceAgent / AgentPage.
- PIN actions in `createPinSlice`.
- Worker + attendance actions in `createWorkersSlice`.
- Session + production actions in `createProductionSlice`.
- Cash + rate snapshot actions in `createCashRatesSlice`.
- Remaining in composer: settings, backup/voice.

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`
Implementation in productionSlice. Callers unchanged.
Rate on save: `resolveRate`. Frozen on ProductionEntry.ratePer100/amount.

### addCash / updateRates

Canonical: `addCash(workerId, type, amount, date?, note?)` — validates via isValidCashAmount, stores normalizeCashAmount.
Canonical: `updateRates(tailorRate, helperRate)` — prepends RateSnapshot with effectiveFrom=today; does not rewrite historical production amounts.

### Persist

- name `towelworks-v2`, version 2 — constants in seed.ts

## 4. Critical Shared Contracts

- addProduction arity unchanged
- openSession arity unchanged
- addCash arity unchanged
- updateRates arity unchanged
- addWorker / markAttendance arity unchanged
- persist key `towelworks-v2`, store version 2
- Pages import useAppStore from `@/store/useAppStore` only
- VoiceAction export path stays useAppStore
- unlock(pin) compares settings.pin; setPin(current, next); lock() not persisted
- appendAudit prepends, cap 500
- Never rewrite historical production amounts when rates change

## 5. Change Impact Rules

- Further store slices must keep useAppStore as the only public hook.
- Never rewrite historical production amounts on rate change.
- Changing addProduction signature requires ProductionPage + applyVoiceAction + this map.
- Next Phase 2 slice: backup/voice, then machine board.

## 6. Recent Changes Log

- 2026-09-29 19:00 PKT — Phase 2 store split slice 4: cashRatesSlice (addCash, updateRates).
- 2026-09-29 18:00 PKT — Phase 2 store split slice 3: productionSlice (openSession, addProduction).
- 2026-09-29 17:00 PKT — Phase 2 store split slice 2: workersSlice (addWorker, updateWorker, toggleWorker, markAttendance).
- 2026-09-29 16:05 PKT — Phase 2 store split slice 1: types.ts + seed.ts + pinSlice.
- 2026-09-29 15:01 PKT — Phase 1 PIN wired: setPin + Settings change form + header Lock.
- 2026-09-29 14:05 PKT — Phase 1 audit: audit.ts prev/next + Settings browser + audit.test.
- 2026-09-29 13:00 PKT — Phase 1 payroll.ts: extract week row math.
- 2026-09-29 12:00 PKT — Phase 1 rates.ts: extract rateFor + resolveRate.
- 2026-09-29 11:05 PKT — Phase 1 cashRules: extract debit/credit + netPayable.
