# CLAUDE.md — Agent context for cityflo-qa-assignment

## What this project is

QA take-home assignment for Cityflo's QA Engineer role. Tests the **Unlimited Monthly Ride Pack + Auto-Renew** feature on Cityflo's staging web app (`app.cityflostaging.com`).

## Key files

- `TEST_PLAN.md` — scenario matrix, PM questions, automation strategy, timebox
- `BUGS.md` — 7 bug reports (BUG-001 through BUG-006, OBS-007)
- `DECISION.md` — release call: BLOCK on BUG-001 (50-ride cap on "Unlimited" plan)
- `decisions.jsonl` — steering ledger for the agent session
- `tests/unlimited-monthly.spec.ts` — 4 Playwright tests
- `auth.json` — session state (gitignored, must be created manually via OTP login)

## Running tests

```bash
npm ci
npx playwright test
```

Requires Chrome installed. On WSL2, run from Windows PowerShell. See README.md for full setup.

## Constraints

- **Never commit auth.json** — it contains session tokens and PII.
- **Sandbox payments only** — never use real UPI apps or cards on staging.
- **Mask phone numbers** in any committed evidence (use `XXXXXXXX33`).
- **Do not run load/stress tests** — staging is a shared live environment.
- **Ask before making purchases** — sandbox purchases modify account state.

## Known bugs (release blockers)

- **BUG-001 (P1):** `no_of_rides: 50` on "Unlimited Monthly" plan — may enforce a ride cap
- **BUG-002 (P1):** Price is ₹5,700 not ₹3,000 per PRD §3

## Test architecture

- Tests use `@playwright/test` with `channel: "chrome"` (system Chrome, not bundled)
- Auth via `storageState: "auth.json"` (Playwright session persistence)
- T3/T4 use `test.fail()` to assert correct PRD expectations against known bugs
- API interception via `page.waitForResponse()` for deterministic data capture
