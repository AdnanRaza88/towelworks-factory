# Code Connection Map

Last updated: 2026-09-29 21:05 PKT

Repo: AdnanRaza88/towelworks-factory (main @ Phase 2 machine board)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → calc.test.ts, cashRules.test.ts, rates.test.ts, payroll.test.ts, audit.test.ts, machineBoard.test.ts
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/main.tsx | boot | — | App | — |
| src/App.tsx | shell/tabs + PIN gate + header lock | App | store, pages, PinScreen | main |
| src/store/useAppStore.ts | persist composer | useAppStore, VoiceAction | types, seed, pin/workers/production/cashRates/backupVoice slices | all pages, App |
| src/lib/factory/machineBoard.ts | floor board rows | buildMachineBoard, floorSummary, slotFor, machineTotals | types | MachineBoardPage, machineBoard.test |
| src/pages/MachineBoardPage.tsx | floor assign UI | default | store, types, calc, utils, machineBoard | App tab floor |
| src/store/slices/productionSlice.ts | openSession + addProduction | createProductionSlice | store types, rates, calc | useAppStore, MachineBoardPage (openSession) |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 |

## 3. Import / Call Graph

### Machine board (Phase 2)

- Pure: `buildMachineBoard(MACHINES, sessions, production, workers, date)`
- Busy if tailor or helper assigned today or pieces > 0
- Assign uses existing `openSession(workerId, machineId, role, date)` — clash replaces worker on same machine+role+date
- Does not call addProduction; does not rewrite rates

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

## 4. Critical Shared Contracts

- addProduction / openSession arity unchanged
- persist key `towelworks-v2`, store version 2
- Pages import useAppStore from `@/store/useAppStore` only
- Never rewrite historical production amounts when rates change

## 5. Change Impact Rules

- Store split complete. useAppStore remains the only public hook.
- Next Phase 2 item: worker detail.

## 6. Recent Changes Log

- 2026-09-29 21:05 PKT — Phase 2 machine board: machineBoard.ts + Floor tab + openSession assign.
- 2026-09-29 20:00 PKT — Phase 2 store split slice 5: backupVoiceSlice.
