# QA Take-Home: Unlimited Monthly Ride Pack + Auto-Renew

QA assessment of Cityflo's **Unlimited Monthly Ride Pack** with auto-renew on the staging rider web app (`app.cityflostaging.com`). Includes a test plan, 4 Playwright tests, 7 bug reports, and a release decision.

## File Structure

```
.
├── TEST_PLAN.md              # Scenario matrix, PM questions, cuts, timebox
├── BUGS.md                   # 7 bugs/observations (2x P1, 1x P2, 2x P3, 1x P3 spec-gap, 1x P4 observation)
├── DECISION.md               # Release call — BLOCK on BUG-001 (50-ride cap)
├── decisions.jsonl            # Steering ledger (agent session decisions)
├── tests/
│   └── unlimited-monthly.spec.ts   # 4 Playwright tests (T1-T4)
├── playwright.config.ts       # Playwright config (Chrome channel, storageState)
├── package.json
├── tsconfig.json
├── auth.json                  # Session state (gitignored — you create this locally)
└── .gitignore
```

## Setup

```bash
npm ci
```

## Creating `auth.json` (manual login required)

The staging app uses phone + OTP login. You cannot automate the first sign-in.

1. Launch Chrome with remote debugging:
   ```bash
   # Windows (PowerShell or cmd)
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\pw-chrome-profile" --no-first-run https://app.cityflostaging.com
   ```

2. Log in with your phone number and OTP in the browser that opens.

3. Save the session via a Node script:
   ```js
   const { chromium } = require("playwright-core");
   (async () => {
     const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
     const context = browser.contexts()[0];
     await context.storageState({ path: "auth.json" });
     console.log("Saved!");
     browser.disconnect();
   })();
   ```

4. `auth.json` is in `.gitignore` — never commit it. It contains session tokens and PII.

If the session expires (access token ~1h, refresh token ~30 days), repeat the steps above.

## Running the Tests

```bash
npx playwright test
```

For headed mode (see the browser):

```bash
HEADED=1 npx playwright test
```

### WSL2 Note

Playwright's bundled browsers cannot install on WSL2 (ubuntu20.04-x64 unsupported). The config uses `channel: "chrome"` which requires Google Chrome installed on the host. On WSL2, run tests from the **Windows side** via PowerShell:

```powershell
cd C:\Users\<you>\Desktop\cityflo-qa-assignment
npx playwright test
```

### Test Overview

| Test | Scenarios | Status |
|------|-----------|--------|
| T1 [G1] | Ride Pack page loads, shows auto-renew controls | Pass |
| T2 [B1,B2] | Route search → booking flow → "Pack of rides" visible | Pass |
| T3 [C5,H1,D4] | Unlimited Monthly price and ride cap match PRD | Expected fail (BUG-001, BUG-002) |
| T4 [E1,E2] | Autorenew API plan amounts and uniqueness | Expected fail (BUG-005, BUG-006) |

T3 and T4 use `test.fail()` — they assert the correct PRD expectations and are marked as expected failures while the bugs are present. They turn green when engineering fixes the underlying issues.

## Known Limitations

- **No sandbox purchase was executed.** Bugs were found via API response inspection, not end-to-end purchase verification. Ride cap enforcement (BUG-001) is an API-level finding — whether ride 51 is actually blocked at booking time is not proven.
- **OTP login is manual.** The `auth.json` session must be created by hand before running tests.
- **Single route tested.** Price discrepancy (BUG-002) verified on Powai → BKC only. A second route would confirm whether pricing is route-dependent.
- **Time-based behaviour not verified.** Auto-renewal execution, validity expiry, and the 24-hour cancellation cut-off cannot be tested within a 2-4 hour timebox.
- **Tests not executed on CI.** The suite was verified to compile (`tsc --noEmit`) and list (`playwright test --list`) but has not been run end-to-end due to the WSL2 browser limitation.
