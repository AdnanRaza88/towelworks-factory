# Code Connection Map

Last updated: 2026-10-06 13:21 PKT

Repo: AdnanRaza88/towelworks-factory (main — agent slice restored over PLACEHOLDER)

## 1. Entry Points

- `src/main.tsx` → `App.tsx` → `src/index.css`
- `npm test` → calc, cashRules, rates, payroll, audit, machineBoard, workerDetail, corrections, search, excel
- Capacitor Android via `capacitor.config.ts` + `.github/workflows/build-apk.yml`

## 2. File Inventory

| Path | Role | Key exports | Depends on | Depended by |
|------|------|-------------|------------|-------------|
| src/index.css | hybrid tokens | --skeuo-*, --neo-*, --glass-*, .skeuo-btn, .skeuo-key, .neo-card, .surface, .glass-overlay | theme data-theme | App, PinScreen, all pages via .surface |
| src/App.tsx | shell | default | store, pages | main |
| src/pages/PinScreen.tsx | PIN gate | default | store | App when unlocked=false |
| src/lib/factory/excel.ts | Excel-compatible CSV workbook | csvEscape, toCsv, buildWorkbook, payrollSheet | types, payroll | backupVoiceSlice, PayrollPage, excel.test |
| src/store/useAppStore.ts | persist composer | useAppStore, VoiceAction | types, seed, slices | all pages, App |
| src/lib/voiceAgent.ts | offline RAG + Gemini | answerFromStore, resolveVoiceCommand, readSlipWithGemini, speak | cashRules, calc, types | AgentPage |
| src/pages/AgentPage.tsx | agent chat + slip attach | default | voiceAgent, useAppStore.addSlip | App tab agent |
| src/pages/SettingsPage.tsx | agentModel + Needle stub | default | setAgentModel, setNeedleStatus | App |
| src/pages/MachineBoardPage.tsx | 1 tailor + 1 helper label | default | openSession, machineBoard | App floor |
| package.json | version 1.3.0 | — | — | matches APP_VERSION 1.3.0 |

## 3. Import / Call Graph

### UI hybrid tokens (Phase 2)

- Skeuo: inputs inset; `.skeuo-btn` header Find/Lock/Agent; `.skeuo-key` PinScreen pad
- Neo: `.surface` / `.neo-card` dual shadow (pages already using .surface inherit)
- Glass: `.glass-overlay` on App header + nav
- No store writes; addProduction unchanged

### addProduction (CRITICAL)

Canonical: `useAppStore.addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`

## 4. Critical Shared Contracts

- addProduction / openSession arity unchanged
- persist key `towelworks-v2`, store version 2
- Pages import useAppStore from `@/store/useAppStore` only
- Never rewrite historical production amounts when rates change
- exportWorkerSheet signature unchanged
- `.surface` remains valid class (now Neo card)

## 5. Change Impact Rules

- Plan items C1–C5, Phase 1, Phase 2 complete.

## 6. Recent Changes Log

- 2026-10-06 13:21 PKT — Restored voiceAgent + AgentPage after PLACEHOLDER; hisab/permanent/outside/sessions RAG; slip attach + Gemini OCR; TTS on. Settings Needle UI and floor pair label already on main.
- 2026-09-30 03:00 PKT — Phase 2 UI hybrid tokens: Skeuo controls, Neo cards, Glass header/nav.
- 2026-09-30 02:05 PKT — Phase 2 Excel: excel.ts workbook + exportWorkerSheet + Payroll Excel; excel.test in npm test.
- 2026-09-30 00:10 PKT — Phase 2 search: search.ts + SearchPage + App Find; search.test in npm test.
- 2026-09-29 23:05 PKT — Phase 2 void/correct.
- 2026-09-29 22:05 PKT — Phase 2 worker detail.
- 2026-09-29 21:05 PKT — Phase 2 machine board.
