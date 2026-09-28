# TowelWorks Update Plan

Source of truth for phase runner. Do not invent features outside this list.

Last updated: 2026-09-28 20:58 PKT

## Phase 0 — Critical bugs

- [x] C1 ProductionPage addProduction arity + role
  - Store signature: `addProduction(workerId, machineId, role, rawPieces, date?, note?, sessionId?)`
  - Page now passes role; role select defaults to worker.role.
- [ ] C2 PIN unlock real + PinScreen gated
  - `unlock` always returns true and ignores pin.
  - `App.tsx` never renders `PinScreen` when `unlocked === false`.
- [ ] C3 Payroll status vs present
  - Attendance model uses `status`, payroll still reads `a.present`.
- [ ] C4 resolveRate by date
  - `addProduction` uses live settings rates only; must pick snapshot from `rateHistory` by entry date.
  - Never rewrite historical production amounts on later rate change.
- [ ] C5 version sync
  - `package.json` 1.3.0 vs `APP_VERSION` / `DEFAULT_SETTINGS.appVersion` 1.2.0.

Exit: all C1–C5 checked; production save uses role; PIN gates app; payroll counts present/half; rates by date; versions match.

## Phase 1 — Domain modules

- [ ] cashRules.ts
- [ ] rates.ts (resolveRate extracted)
- [ ] payroll pure functions
- [ ] audit prev/next
- [ ] PIN fully wired (change pin in settings, lock from header)

## Phase 2+

- [ ] split store
- [ ] machine board
- [ ] worker detail
- [ ] void/correct
- [ ] search
- [ ] Excel
- [ ] UI hybrid tokens (Skeuo controls, Neo cards, Glass overlays/header)

## Runner notes

One focused slice per run. Prefer Phase 0 until exit criteria pass.
Repo: https://github.com/AdnanRaza88/towelworks-factory
Connection map: artifacts/CODE_CONNECTION_MAP.md and docs/CODE_CONNECTION_MAP.md in repo.
