# Code Connection Map

Last updated: 2026-09-29 22:05 PKT

Repo: AdnanRaza88/towelworks-factory (main @ Phase 2 worker detail)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → calc.test.ts, cashRules.test.ts, rates.test.ts, payroll.test.ts, audit.test.ts, machineBoard.test.ts, workerDetail.test.ts
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/main.tsx | boot | — | App | — |
| src/App.tsx | shell/tabs + PIN gate + header lock | App | store, pages, PinScreen | main |
| src/store/useAppStore.ts | persist composer | useAppStore, VoiceAction | types, seed, pin/workers/production/cashRates/backupVoice slices | all pages, App |
| src/lib/factory/machineBoard.ts | floor board rows | buildMachineBoard, floorSummary, slotFor, machineTotals | types | MachineBoardPage, machineBoard.test |
| src/lib/factory/workerDetail.ts | one-worker ledger | buildWorkerDetail, forWorker, sortByDateDesc, productionTotals, presentDays | types, cashRules, payroll | WorkersPage, workerDetail.test |
| src/pages/WorkersPage.tsx | workers list + detail | default | store, types, calc, utils, workerDetail | App tab workers |
| src/pages/MachineBoardPage.tsx | floor assign UI | default | store, types, calc, utils, machineBoard | App tab floor |
| src/store/slices/productionSlice.ts | openSession + addProduction | createProductionSlice | store types, rates, calc | useAppStore, MachineBoardPage (openSession) |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 |

## 3. Import / Call Graph

### Worker detail (Phase 2)

- Pure: `buildWorkerDetail(worker, production, cash, attendance, sessions)`
- Filters by workerId, newest date first
- Totals: pieces, prodPay, cashOut via cashOutTotal, net via netPayable, daysPresent via countsAsPresent
- Read-only. Does not call addProduction / addCash / markAttendance

### Machine board (Phase 2)

- Pure: `buildMachineBoard(MACHINES, sessions, production, workers, date)`
- Assign uses existing `openSession`

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

## 4. Critical Shared Contracts

- addProduction / openSession arity unchanged
- persist key `towelworks-v2`, store version 2
- Pages import useAppStore from `@/store/useAppStore` only
- Never rewrite historical production amounts when rates change
- cashOut sign: debit +, credit − (cashRules)

## 5. Change Impact Rules

- Store split complete. useAppStore remains the only public hook.
- Next Phase 2 item: void/correct.

## 6. Recent Changes Log

- 2026-09-29 22:05 PKT — Phase 2 worker detail: workerDetail.ts + WorkersPage record (prod/cash/attendance/net).
- 2026-09-29 21:05 PKT — Phase 2 machine board: machineBoard.ts + Floor tab + openSession assign.
- 2026-09-29 20:00 PKT — Phase 2 store split slice 5: backupVoiceSlice.
