# Bugs — Unlimited Monthly Ride Pack + Auto-Renew

**Tester:** Omkar Patade
**Date:** 2026-11-05
**Environment:** staging — https://app.cityflostaging.com · Chrome 131 · Windows 11 (WSL2)

---

## [BUG-001] "Unlimited Monthly" plan returns no_of_rides: 50 in API — may enforce a ride cap

- **Severity:** P1
- **Severity rationale:** If the 50-ride cap is enforced, the core product promise is broken. A daily commuter doing round trips (2/day x 22 workdays = 44 rides minimum, up to 60 for 30 days) can exceed the cap. A rider who bought "Unlimited" and gets cut off at ride 51 loses their commute and trust. Even if display-only, the per-ride price (₹114) misleads the rider about what "unlimited" means.
- **Area / feature:** Rides / Pack definition
- **Environment:** staging — https://app.cityflostaging.com · Chrome · 2026-11-05 10:50 IST · account: XXXXXXXX33
- **PRD reference:** §4 — "Unlimited means unlimited: the rider can ride their route every day, with no cap on the number of rides in the validity window."

### Steps to reproduce
1. Log in, search route Powai → BKC.
2. Click Proceed on route card → Select "Pack of rides" → Proceed.
3. View the Unlimited Monthly plan card.
4. Observe the per-ride price calculation: ₹114/ride (₹5,700 / 50).
5. Inspect the API response from `GET /api/v2/rides/get-lite-pack-details-with-plans/`.

### Expected
`no_of_rides` should be `null` or absent (unlimited), and no per-ride price should be calculable from a fixed ride count.

### Actual
API returns `"no_of_rides": 50` for plan slug `unlimited-rides-30-days`. UI shows "₹114/ride" — confirming a 50-ride divisor. The plan is functionally a 50-ride pack labelled "Unlimited."

### Evidence
API response (masked, relevant fields):
```json
{
  "plan_slug": "unlimited-rides-30-days",
  "pack_name": "Unlimited Monthly",
  "no_of_rides": 50,
  "cost_per_ride": 114,
  "total_cost": 5700,
  "validity_days": 30
}
```
UI shows: "Unlimited Monthly · Validity: 30 days · ₹114/ride · ₹5700 · Save 59%"

### Notes
Reproduces 100%. The slug says "unlimited" but the data model caps it at 50. Either the backend plan definition is wrong, or the plan was misconfigured during setup. **Enforcement not verified** — no pack was purchased during testing, so we cannot confirm whether ride 51 is actually blocked at booking time. If `no_of_rides` is used only for per-ride price display and the backend does not enforce a cap, severity drops to P2 (misleading display). See DECISION.md "What would change my mind."

---

## [BUG-002] Unlimited Monthly priced at ₹5,700 — PRD says flat ₹3,000

- **Severity:** P1
- **Severity rationale:** Rider charged 90% more than the documented price. If the PRD is what sales/marketing will publish, every buyer sees a different price than advertised. If real money flows at ₹5,700 when the promise is ₹3,000, that's a support fire and potential regulatory issue.
- **Area / feature:** Pricing
- **Environment:** staging — https://app.cityflostaging.com · Chrome · 2026-11-05 10:50 IST · account: XXXXXXXX33
- **PRD reference:** §3 — "Unlimited Monthly costs a flat ₹3,000, the same on every route."

### Steps to reproduce
1. Log in, search route Powai → BKC.
2. Navigate to Pack of rides → view Unlimited Monthly plan.
3. Observe price displayed.
4. Inspect API response from `GET /api/v2/rides/get-lite-pack-details-with-plans/`.

### Expected
Total cost should be ₹3,000.

### Actual
UI shows ₹5,700. API returns `"total_cost": 5700`.

### Evidence
```json
{
  "plan_slug": "unlimited-rides-30-days",
  "total_cost": 5700,
  "textual_content": {
    "total_cost_text": "₹5700"
  }
}
```

### Notes
The price appears route-dependent (calculated as `no_of_rides × cost_per_ride` where `cost_per_ride` derives from the route's single-ride fare). This contradicts PRD §3 which says "flat ₹3,000, the same on every route." Either the PRD price is wrong, or the backend pricing logic is wrong. This needs PM clarification but ships as P1 until resolved — a rider cannot make an informed purchase when the stated price doesn't match. Tested one route only (Powai → BKC). Need to verify on at least one more route to confirm price is route-dependent, not a single misconfigured route.

---

## [BUG-003] No auto-renew opt-in at checkout — only available post-purchase

- **Severity:** P2
- **Severity rationale:** PRD promises auto-renew choice at purchase. Without it, a rider who wants auto-renew must know to find and toggle it after buying. The feature's retention benefit (never lapse) is buried.
- **Area / feature:** Auto-renew / Purchase flow
- **Environment:** staging — https://app.cityflostaging.com · Chrome · 2026-11-05 10:50 IST · account: XXXXXXXX33
- **PRD reference:** §6 — "The rider chooses it at checkout (default OFF) and can change it later from the pack screen."

### Steps to reproduce
1. Log in, search route, proceed to Pack of rides.
2. Select Unlimited Monthly plan.
3. Observe the checkout screen — look for auto-renew toggle/checkbox.

### Expected
An auto-renew toggle (default OFF) should be visible before "Proceed to payment."

### Actual
No auto-renew toggle or checkbox anywhere on the plan selection or checkout screen. The only visible action is "Proceed to payment." Auto-renew controls only appear on the Ride Pack tab post-purchase.

### Evidence
Clickable elements on checkout page (from Playwright evaluation): `["Home", "My Rides", "Ride Pack", "Support", "More", "Today, 5th Nov", "Fri, 6th Nov", ..., "Proceed to payment"]` — no auto-renew element present.

### Notes
The Ride Pack tab shows auto-renew controls (pause, cancel, change renewal date) but only when a pack is already active. A new buyer has no way to opt in at purchase time per PRD §6.

---

## [BUG-004] Pack described as "Ride anywhere" — PRD says bound to a route (spec gap)

- **Severity:** P3
- **Severity rationale:** Spec gap, not a clear defect. The PRD (v0.9 draft) says route-bound; the app says ride-anywhere. The app's behaviour may be the correct, updated product direction — it gives riders more flexibility, not less. Logging as P3 pending PM confirmation rather than P2, because the rider experience is strictly better if packs work everywhere.
- **Area / feature:** Pack scope / Route binding
- **Environment:** staging — https://app.cityflostaging.com · Chrome · 2026-11-05 10:50 IST · account: XXXXXXXX33
- **PRD reference:** §2 — "A pack is bound to a route and a pickup → drop stop pair."

### Steps to reproduce
1. Navigate to Pack of rides screen.
2. Read the benefits list.

### Expected
Pack description should mention route binding, or show the specific route the pack covers.

### Actual
Benefits say: "Ride anywhere — Go one-way or round trip on any available route." No route binding mentioned anywhere in the purchase flow.

### Evidence
API response from `get-lite-pack-details-with-plans`:
```json
{
  "title": [{"text": "Ride anywhere", "highlight": "false"}],
  "sub_title": "Go one-way or round trip on any available route"
}
```

### Notes
This may be an intentional product change from the PRD (v0.9) — the pack was maybe broadened to all routes. Needs PM confirmation. If intentional, this is not a bug — just update the PRD. Also raised as PM question #3 in TEST_PLAN.md.

---

## [BUG-005] Duplicate "Unlimited Monthly" plan in autorenew API

- **Severity:** P3
- **Severity rationale:** Two plans with the same display name but different slugs (`unlimited-rides-30-days` and `unlimited-rides-30-days-44-rides`) could cause incorrect plan selection during auto-renewal or confuse internal tooling. No direct rider-visible impact yet, but a latent data integrity issue.
- **Area / feature:** Plan configuration
- **Environment:** staging — https://app.cityflostaging.com · Chrome · 2026-11-05 10:50 IST · account: XXXXXXXX33
- **PRD reference:** §4 — only one Unlimited Monthly plan is described.

### Steps to reproduce
1. Inspect the API response from `GET /api/v2/payments/ride-pack-autorenew/`.
2. Look at `available_plans` array.

### Expected
One "Unlimited Monthly" plan.

### Actual
Two entries:
- `unlimited-rides-30-days` → "Unlimited Monthly"
- `unlimited-rides-30-days-44-rides` → "Unlimited Monthly"

The second slug implies 44 rides, further contradicting "unlimited."

### Evidence
```json
{"plan_slug":"unlimited-rides-30-days","pack_name":"Unlimited Monthly","rides_allowed":null,"amount":null},
{"plan_slug":"unlimited-rides-30-days-44-rides","pack_name":"Unlimited Monthly","rides_allowed":null,"amount":null}
```

### Notes
The `rides_allowed: null` in the autorenew API contrasts with `no_of_rides: 50` in the lite pack API — the two APIs disagree on whether the plan has a ride cap.

---

## [BUG-006] Autorenew API returns null amounts for all plans

- **Severity:** P3
- **Severity rationale:** The Ride Pack tab uses this API to show auto-renew plan options. All plans have `amount: null`, which could cause the UI to display no price or ₹0 when a rider tries to set up or change auto-renewal. Degraded experience but the lite pack API has correct pricing, so the purchase flow works.
- **Area / feature:** Auto-renew / Pricing API
- **Environment:** staging — https://app.cityflostaging.com · Chrome · 2026-11-05 10:50 IST · account: XXXXXXXX33
- **PRD reference:** §3, §6

### Steps to reproduce
1. Navigate to Ride Pack tab.
2. Inspect `GET /api/v2/payments/ride-pack-autorenew/` response.

### Expected
Each plan in `available_plans` should have a non-null `amount`.

### Actual
All plans have `"amount": null` and `"per_ride_amount": null`.

### Evidence
```json
{
  "plan_slug": "unlimited-rides-30-days",
  "pack_name": "Unlimited Monthly",
  "amount": null,
  "per_ride_amount": null
}
```
(Same for all 15 plans in the array.)

---

## [OBS-007] "Pause auto-renewal" and other undocumented features present (observation, not defect)

- **Severity:** P4 (scope observation)
- **Severity rationale:** PRD §9 excludes "Pausing a pack mid-cycle," but the app having more than the PRD specifies is not a defect — it's a scope difference between a v0.9 draft and a live build. Logging as an observation for PM awareness, not a bug to fix.
- **Area / feature:** Auto-renew / Pause
- **Environment:** staging — https://app.cityflostaging.com · Chrome · 2026-11-05 10:50 IST · account: XXXXXXXX33
- **PRD reference:** §9 — "Pausing a pack mid-cycle" listed as out of scope.

### Steps to reproduce
1. Navigate to Ride Pack tab.
2. Observe "Pause auto-renewal?" section with "Pause renewals" and "Keep auto-renew on" buttons.

### Expected
Feature should not be present per PRD scope, or should be documented if intentional.

### Actual
Full pause modal with:
- "Your current pack keeps running / No charges while paused / Resume in one tap"
- Reason selector for pausing
- Confirmation step

### Notes
Also present: "Change renewal date" (calendar picker) and "Change your next pack" — neither documented in PRD. These may be intentional additions since PRD v0.9. Recommend PM confirm scope.
