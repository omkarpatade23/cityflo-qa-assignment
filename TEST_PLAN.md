# Test Plan — Unlimited Monthly Ride Pack + Auto-Renew

**Tester:** Omkar Patade
**Date:** 2026-11-05
**App:** https://app.cityflostaging.com
**PRD:** v0.9 (Aditi K.)

---

## Scope

Testing the Unlimited Monthly Ride Pack purchase flow, pack display, auto-renew toggle, and edge states on the staging rider web app. Payment via sandbox gateway only. Auto-renewal timing behaviour cannot be directly observed within the timebox — inferred from UI state and network responses.

### What I cut and why

- **Multi-browser testing:** Only testing on Chrome. The feature is money-critical; correctness matters more than cross-browser polish in a 2–4 hour window.
- **Load/stress testing:** Explicitly prohibited on shared staging.
- **Smaller ride-count packs:** Out of scope per PRD §9.
- **Seat-price/fare-breakdown display issues:** Logged as P4 cosmetic per Aditi's release checklist note — kept off blocker list.

---

## Scenario Matrix

### A. Login & OTP (PRD §8)

| # | Scenario | Expected | Priority |
|---|----------|----------|----------|
| A1 | Login with valid phone + correct 6-digit OTP | Logged in, lands on home/route screen | High |
| A2 | Login with incorrect OTP | Inline error, can retry | Medium |
| A3 | OTP expiry (wait >10 min, then enter) | Rejected, must request new OTP | Low |
| A4 | Resend OTP | New OTP sent, old one invalidated | Medium |

### B. Route Search & Ride Pack Discovery (PRD §2)

| # | Scenario | Expected | Priority |
|---|----------|----------|----------|
| B1 | Search a valid route (pickup → drop) | Results shown with available trips | High |
| B2 | From booking flow, open Ride Pack | Ride Pack screen shows available plans | High |
| B3 | Unlimited Monthly is listed among plans | Plan visible with correct name and price | High |

### C. Purchase Flow — Unlimited Monthly (PRD §2, §3)

| # | Scenario | Expected | Priority |
|---|----------|----------|----------|
| C1 | Select Unlimited Monthly, auto-renew OFF (default), proceed to pay | Price shown is ₹3,000; payment gateway opens with sandbox option | High |
| C2 | Complete payment via sandbox test option (Net Banking/Wallet) | Payment succeeds, pack is issued | High |
| C3 | Verify auto-renew default is OFF at checkout | Toggle/checkbox is off by default | High |
| C4 | Select Unlimited Monthly with auto-renew ON, complete payment | Pack issued with auto-renew ON | High |
| C5 | Verify price shown before payment matches ₹3,000 | No discrepancy | High |
| C6 | Payment failure/cancellation at gateway | Returned to app, no pack issued, appropriate error shown | High |

### D. Pack Display — Post-Purchase (PRD §4, §5)

| # | Scenario | Expected | Priority |
|---|----------|----------|----------|
| D1 | After purchase, pack appears under Ride Pack section | Pack visible with route, stops, validity dates | High |
| D2 | Validity shows 30 calendar days from purchase (D through D+29) | Correct start and end dates | High |
| D3 | "Days remaining" indicator is accurate | Matches expected countdown | Medium |
| D4 | Rides remaining shows "Unlimited" (no cap) | No ride count limit displayed | High |
| D5 | Auto-renew status matches what was selected at checkout | ON or OFF as chosen | High |

### E. Auto-Renew Toggle — Post-Purchase (PRD §6)

| # | Scenario | Expected | Priority |
|---|----------|----------|----------|
| E1 | Turn auto-renew ON from pack screen (was OFF) | Status changes to ON, confirmed in UI | High |
| E2 | Turn auto-renew OFF from pack screen (was ON) | Status changes to OFF, confirmed in UI | High |
| E3 | Toggle persists after page refresh | Same state after reload | Medium |
| E4 | Toggle auto-renew within 24h of renewal date | Should be blocked/locked per PRD §6 | High — cannot directly test timing |

### F. Auto-Renew & Renewal Logic (PRD §6) — Inferred/Not Directly Verifiable

| # | Scenario | Expected | Verifiability |
|---|----------|----------|---------------|
| F1 | Auto-renew ON: charge on renewal date | New pack issued, starts day after old expires, runs 30 days | Cannot verify — time-based |
| F2 | Auto-renew payment failure | Auto-renew stays ON, rider notified, retry next day, no active pack | Cannot verify — requires failed payment |
| F3 | Auto-renew OFF: pack expires naturally | Pack shows Expired, no renewal attempted | Cannot verify — time-based |
| F4 | Renewal price matches ₹3,000 | Same price charged | Infer from API response if available |

### G. Empty & Edge States (PRD §7)

| # | Scenario | Expected | Priority |
|---|----------|----------|----------|
| G1 | No active pack — Ride Pack screen | Empty state with invitation to buy | Medium |
| G2 | Expired/lapsed pack | Lapsed pack shown with option to buy again | Medium |
| G3 | Buy a second pack after first expires | New pack issued correctly | Low — time-dependent |

### H. Payment & Money Integrity (PRD §3)

| # | Scenario | Expected | Priority |
|---|----------|----------|----------|
| H1 | Amount in payment gateway matches ₹3,000 | Exact match | Critical |
| H2 | No double charge on single purchase | Only one transaction | Critical |
| H3 | Payment confirmation shows correct amount | ₹3,000 | High |
| H4 | Refund policy: processed within 3 business days to original method | Cannot verify — but check if mentioned in UI | Low |

---

## Questions for PM (Aditi)

1. **PRD §3 — Price: ₹3,000 or ₹5,700?** The PRD says "flat ₹3,000, the same on every route." The app shows ₹5,700 for Powai→BKC (calculated as 50 rides × ₹114/ride). **Which is the intended price?** If ₹3,000, the backend pricing is wrong. If ₹5,700, the PRD needs updating. *Assumption: I treated the mismatch as a bug (BUG-002) and tested against the PRD price of ₹3,000.*

2. **PRD §4 — Is Unlimited Monthly truly unlimited?** The API returns `no_of_rides: 50` for the `unlimited-rides-30-days` plan. **Is there a 50-ride cap, or is this a display-only field?** A daily commuter doing round trips needs ~44–60 rides/month. *Assumption: I treated no_of_rides: 50 as a likely enforced cap (BUG-001) because the field drives pricing and the UI displays a per-ride price derived from it.*

3. **PRD §2 — Route-bound or ride-anywhere?** The PRD says "bound to a route and a pickup → drop stop pair." The app says "Ride anywhere — Go one-way or round trip on any available route." **Which is correct?** *Assumption: I logged it as a spec gap (BUG-004, P3), not a blocker, because the rider experience is better with ride-anywhere.*

4. **PRD §5 — "valid for 30 calendar days from first use" vs "from purchase":** The overview says "pay once and ride every day for the month." §5 says "from first use." The user flow (§2) implies from purchase. **Which is it?** *Assumption: I assumed validity starts from purchase date for testing, since the pack screen would show dates immediately after purchase.*

5. **PRD §6 — Renewal date:** When exactly is the renewal date? D+29 (last valid day), D+30 (day after expiry), or before expiry? The PRD says "before it lapses" but doesn't specify. This affects the 24-hour cancellation cut-off. *Assumption: I assumed renewal triggers on or near the last valid day but could not verify timing.*

6. **PRD §6 — Payment failure retry:** "Retry the next day" — how many retries? Max count before auto-renew is turned off? The PRD is silent. *Assumption: I assumed unlimited retries until the rider cancels. This is a risk if the implementation silently gives up after N retries.*

7. **PRD §6 — Auto-renew at checkout:** The PRD says "The rider chooses it at checkout (default OFF)." No toggle exists at checkout in the app. **Is this a known gap or a bug?** *Assumption: I treated it as a bug (BUG-003, P2), assuming the PRD is authoritative on this point.*

8. **Pause/Change features:** The app has "Pause auto-renewal," "Change renewal date," and "Change your next pack" — none in the PRD. **Are these intentional additions since v0.9?** *Assumption: I logged them as observations (OBS-007), not defects, since the app having more than a draft PRD specifies is expected.*

9. **Duplicate plan:** Two plans named "Unlimited Monthly" exist (`unlimited-rides-30-days` and `unlimited-rides-30-days-44-rides`). **Is the second one legacy/test data that should be removed?** *Assumption: I logged it as a data integrity bug (BUG-005, P3) since duplicate display names could cause incorrect renewal plan selection.*

---

## Automation Strategy

**Automated (Playwright — 4 tests, `tests/unlimited-monthly.spec.ts`):**
- T1: Ride Pack page loads, shows auto-renew controls (session validation)
- T2: Route search → booking flow → "Pack of rides" option present
- T3: Unlimited Monthly plan listed — verify ride cap (BUG-001) and price (BUG-002) via API interception
- T4: Autorenew API — verify null amounts (BUG-006) and duplicate plans (BUG-005)

**Why these four:** They pin the bugs that matter most — money and ride cap — at the API level where regressions would be invisible in UI-only testing. T3 and T4 use `test.fail()` to assert the correct PRD expectations; they are marked as expected failures today (bugs present) and will turn green when engineering fixes BUG-001/002/005/006.

**Manual verification:**
- Login/OTP flow (cannot automate OTP entry)
- Payment gateway sandbox interaction (did not complete a purchase — would require user approval)
- Network response inspection for renewal/validity data
- Visual checks of plan cards, pricing display, auto-renew UI

**OTP wall approach:**
- Logged in manually in a Chrome instance launched with `--remote-debugging-port=9222`
- Connected via `playwright-core`'s `connectOverCDP` and saved `context.storageState()` to `auth.json`
- `auth.json` is gitignored — never committed
- Assumption: staging session tokens last several hours; if tests land on /login, re-authenticate
- Note: Playwright's bundled browsers cannot install on WSL2 (ubuntu20.04-x64 unsupported), so tests use `channel: "chrome"` pointing to Windows Chrome, or run via `playwright-core` + CDP

---

## Timebox

- **Start:** 2026-11-05 ~10:20 IST
- **End:** 2026-11-05 ~13:30 IST
- **Total:** ~3 focused hours

---

## What I'd do next (cut for timebox)

1. **Complete a sandbox purchase** — buy Unlimited Monthly, verify post-purchase pack screen (validity dates, rides display, auto-renew state), toggle auto-renew ON/OFF, verify persistence.
2. **Test a second route** — confirm the ₹5,700 price is route-dependent (not a single-route misconfiguration) to strengthen BUG-002.
3. **Verify ride cap enforcement** — after buying, book >50 rides (if feasible) to confirm whether `no_of_rides: 50` is enforced or display-only.
4. **Payment failure path** — cancel mid-payment at the gateway, verify no pack is issued and no charge occurs.
5. **Run the Playwright suite end-to-end** on a Windows machine with Chrome to confirm all 4 tests execute as expected (T1/T2 green, T3/T4 expected-fail).
