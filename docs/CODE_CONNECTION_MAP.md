# Code Connection Map

Last updated: 2026-09-30 02:05 PKT

Repo: AdnanRaza88/towelworks-factory (main @ Phase 2 Excel)

## 1. Entry Points

- `src/main.tsx` → `App.tsx`
- `npm test` → calc, cashRules, rates, payroll, audit, machineBoard, workerDetail, corrections, search, excel
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/lib/factory/excel.ts | Excel-compatible CSV workbook | csvEscape, toCsv, filterSource, workersSheet, productionSheet, cashSheet, attendanceSheet, sessionsSheet, payrollSheet, buildWorkbook | types, payroll | backupVoiceSlice.exportWorkerSheet, PayrollPage, excel.test |
| src/pages/PayrollPage.tsx | week payroll + Excel download | default | store, calc, payroll, excel, utils | App tab payroll |
| src/store/slices/backupVoiceSlice.ts | settings, backup, voice, sheet | createBackupVoiceSlice | types, calc, excel, seed | useAppStore |
| src/store/useAppStore.ts | persist composer | useAppStore, VoiceAction | types, seed, slices | all pages, App |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 |

## 3. Import / Call Graph

### Excel (Phase 2)

- Pure: `buildWorkbook(src, { workerId?, weekStart?, weekEnd? })`
- Sections: WORKERS, PRODUCTION (includes voided flagged), CASH, ATTENDANCE, SESSIONS, optional PAYROLL week
- Payroll totals skip voided via buildPayrollRows
- Store: `exportWorkerSheet(workerId?)` → buildWorkbook + current Sat-Fri week
- Settings already downloads exportWorkerSheet as CSV
- PayrollPage Excel button downloads payrollSheet only
- No store writes; no xlsx dependency

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

## 4. Critical Shared Contracts

- addProduction / openSession arity unchanged
- persist key `towelworks-v2`, store version 2
- Pages import useAppStore from `@/store/useAppStore` only
- Never rewrite historical production amounts when rates change
- exportWorkerSheet signature unchanged

## 5. Change Impact Rules

- Next Phase 2 item: UI hybrid tokens (Skeuo controls, Neo cards, Glass overlays/header).

## 6. Recent Changes Log

- 2026-09-30 02:05 PKT — Phase 2 Excel: excel.ts workbook + exportWorkerSheet + Payroll Excel; excel.test in npm test.
- 2026-09-30 00:10 PKT — Phase 2 search: search.ts + SearchPage + App Find; search.test in npm test.
- 2026-09-29 23:05 PKT — Phase 2 void/correct.
- 2026-09-29 22:05 PKT — Phase 2 worker detail.
- 2026-09-29 21:05 PKT — Phase 2 machine board.
