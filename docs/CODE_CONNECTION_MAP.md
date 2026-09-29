# Code Connection Map

Last updated: 2026-09-30 00:10 PKT

Repo: AdnanRaza88/towelworks-factory (main @ Phase 2 search)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → calc.test.ts, cashRules.test.ts, rates.test.ts, payroll.test.ts, audit.test.ts, machineBoard.test.ts, workerDetail.test.ts, corrections.test.ts, search.test.ts
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/main.tsx | boot | — | App | — |
| src/App.tsx | shell/tabs + PIN gate + header lock + Find | App | store, pages, PinScreen, SearchPage | main |
| src/store/useAppStore.ts | persist composer | useAppStore, VoiceAction | types, seed, slices | all pages, App |
| src/lib/factory/search.ts | mill-book search | searchFactory, normalizeQuery, matchesHay | types | SearchPage, search.test |
| src/pages/SearchPage.tsx | Find UI | default | store, search | App header Find |
| src/lib/factory/corrections.ts | void + correct production | isLiveProduction, liveProduction, applyVoid, applyCorrect | types, calc | productionSlice, corrections.test |
| src/lib/factory/machineBoard.ts | floor board rows | buildMachineBoard, floorSummary, slotFor, machineTotals | types | MachineBoardPage, machineBoard.test |
| src/lib/factory/workerDetail.ts | one-worker ledger | buildWorkerDetail, forWorker, sortByDateDesc, productionTotals, presentDays | types, cashRules, payroll | WorkersPage, workerDetail.test |
| src/pages/WorkersPage.tsx | workers list + detail | default | store, types, calc, utils, workerDetail | App tab workers |
| src/pages/MachineBoardPage.tsx | floor assign UI | default | store, types, calc, utils, machineBoard | App tab floor |
| src/pages/ProductionPage.tsx | add + void/correct | default | store, types, calc, utils | App tab production |
| src/store/slices/productionSlice.ts | openSession + addProduction + void/correct | createProductionSlice | store types, rates, calc, corrections | useAppStore |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 |

## 3. Import / Call Graph

### Search (Phase 2)

- Pure: `searchFactory(query, { workers, production, cash, attendance, sessions })`
- Blank query → `[]`
- Hits include voided production (flagged)
- App header Find → SearchPage; no store mutation

### Void / correct (Phase 2)

- Pure: `applyVoid(entry)` marks voided; refuses already-voided
- Pure: `applyCorrect(entry, rawPieces)` voids original, inserts correction with same date/machine/role and original ratePer100
- Store: `voidProduction(id)`, `correctProduction(id, rawPieces)`
- Totals in payroll / workerDetail / machineBoard skip `voided`
- addProduction arity unchanged

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

## 4. Critical Shared Contracts

- addProduction / openSession arity unchanged
- persist key `towelworks-v2`, store version 2
- Pages import useAppStore from `@/store/useAppStore` only
- Never rewrite historical production amounts when rates change
- Correction uses the original entry ratePer100, not live settings
- cashOut sign: debit +, credit − (cashRules)

## 5. Change Impact Rules

- Store split complete. useAppStore remains the only public hook.
- Next Phase 2 item: Excel.

## 6. Recent Changes Log

- 2026-09-30 00:10 PKT — Phase 2 search: search.ts + SearchPage + App Find; search.test in npm test.
- 2026-09-29 23:05 PKT — Phase 2 void/correct: corrections.ts + productionSlice + ProductionPage; totals skip voided.
- 2026-09-29 22:05 PKT — Phase 2 worker detail: workerDetail.ts + WorkersPage record (prod/cash/attendance/net).
- 2026-09-29 21:05 PKT — Phase 2 machine board: machineBoard.ts + Floor tab + openSession assign.
- 2026-09-29 20:00 PKT — Phase 2 store split slice 5: backupVoiceSlice.
