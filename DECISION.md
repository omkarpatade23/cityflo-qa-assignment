# Release Decision — Unlimited Monthly + Auto-Renew

**Tester:** Omkar Patade
**Date:** 2026-11-05
**Release target:** Friday

---

## The call: BLOCK on BUG-001 — "Unlimited Monthly" has a 50-ride cap

**Do not ship Friday.** Fix the ride cap first.

---

### The rule

A plan named "Unlimited" must not enforce a ride count limit. If the API field `no_of_rides` for an "Unlimited" plan is any finite number, the build does not ship.

### The case it breaks on

A daily commuter (the exact target user described in PRD §1) doing round trips on workdays uses ~44 rides/month. A commuter who also rides weekends or takes extra trips hits 50 easily. At ride 51, the "Unlimited" pack either silently fails to cover the ride (charging per-ride or blocking booking) or throws an error. Either outcome means a paying rider — one who chose the premium option specifically to never worry about ride counts — is stranded or surprised.

I would still keep this rule even though the pricing (₹5,700 vs ₹3,000) is also wrong, because: a mispriced product is a support problem and can be refunded, but an "Unlimited" product that stops working mid-month is a trust-destroying experience that no refund fixes. The name is the promise.

### The cost, and who pays it

**Cost of blocking:** Friday slips. Engineering fixes `no_of_rides` to null/uncapped for the unlimited plan. This is likely a backend configuration change, not a code rewrite — could be hours, not days.

**Cost of shipping:** A rider buys "Unlimited Monthly," hits 50 rides (possible in week 3–4 for a daily commuter), and discovers their unlimited pack has a limit. They call support, post on social media, and every future "Unlimited" buyer now has a reason to distrust the label. At Cityflo's ridership ("tens of thousands"), even 5% adoption of Unlimited Monthly means hundreds of riders hitting this cap.

The cost of shipping is paid by the rider (stranded commute, broken trust) and by Cityflo (support load, refunds, brand damage on a premium product). The cost of blocking is paid by the team (delayed launch). The team's cost is bounded; the rider's is not.

### What would change my mind

If engineering confirms that `no_of_rides: 50` is a display-only artifact and the backend does NOT enforce a ride cap — i.e., ride 51 books and gets covered normally — then the cap is cosmetic (affects per-ride price display only), and I'd downgrade to P2 and ship with a note. I would need to see a rider with >50 rides in a cycle on staging, or a backend engineer's confirmation that the field is ignored at booking time.

---

## What we are knowingly shipping (if the blocker is fixed)

### BUG-002: Price is ₹5,700, not ₹3,000 (P1 severity, but not my blocker)

This is P1 because the price mismatch is real and documented in the PRD. But I'm not blocking on it because:
- **It's unclear who's wrong.** The PRD (v0.9, pre-launch) says ₹3,000; the app shows ₹5,700. The price may have changed after the PRD was written. Aditi needs to confirm the intended price.
- **If the app price is right**, the PRD just needs an update — no code fix.
- **If the PRD price is right**, this is a backend pricing fix that could ship same-day after the blocker.
- **No rider is silently overcharged** — the price is shown before payment. A rider who doesn't want to pay ₹5,700 simply won't buy.

**Risk we accept:** If ₹3,000 was communicated externally (marketing, sales), buyers will see a different price in-app. Confirm with Aditi before Friday.

### BUG-003: No auto-renew toggle at checkout (P2)

Riders can't opt into auto-renew during purchase — they must find it in the Ride Pack tab afterward. This weakens the retention feature but doesn't break anything. A rider who doesn't know about auto-renew simply doesn't get it; they're not charged without consent.

**Risk we accept:** Lower auto-renew adoption than expected. Fixable in a fast follow.

### BUG-004: "Ride anywhere" vs route-bound (P3 — spec gap)

The app says packs work on any route; the PRD says route-bound. More likely a product evolution since the PRD v0.9 draft than a defect — the rider experience is strictly better. PM needs to confirm and update the PRD.

**Risk we accept:** If pricing was modeled on route-bound usage, "ride anywhere" could increase costs.

### BUG-005: Duplicate Unlimited Monthly plan (P3)

Two plans with the same name, different slugs. The second one (`unlimited-rides-30-days-44-rides`) isn't shown to users but exists in the autorenew API. Latent issue — could cause wrong plan selection during renewal.

### BUG-006: Autorenew API null amounts (P3)

All plans in the autorenew endpoint have `amount: null`. Could cause display issues when managing auto-renewal post-purchase. The purchase flow uses a different API (`get-lite-pack-details-with-plans`) which has correct pricing, so buying works.

### OBS-007: Pause/Change features beyond PRD scope (P4 — observation, not defect)

Pause renewals, change renewal date, and change next pack are all present but undocumented in PRD v0.9. The app having more than the draft specifies is not a defect. Logged for PM awareness.

---

## What I observed, inferred, and could not verify

### Observed (directly tested on staging)
- Unlimited Monthly plan exists and is selectable in the purchase flow
- Price shown is ₹5,700 (not ₹3,000)
- API returns `no_of_rides: 50` for the "unlimited" plan
- No auto-renew toggle exists at checkout
- Ride Pack tab shows auto-renew controls (pause, cancel, change date) for existing packs
- Pack benefits say "Ride anywhere" — no route binding
- Autorenew API returns null amounts for all plans
- Sandbox payment gateway is reachable (did not complete a purchase — see "could not verify")

### Inferred
- The ₹5,700 price is route-dependent (calculated from the route's single-ride fare of ₹279 × 50 rides × discount), not the flat ₹3,000 the PRD states
- The duplicate plan slug `unlimited-rides-30-days-44-rides` may be a legacy/test plan that should have been cleaned up
- Auto-renew was designed as a post-purchase feature in the current implementation, not a checkout-time choice

### Could not verify
- **Whether the 50-ride cap is enforced at booking time** — would need to buy a pack and book 51 rides, which exceeds the timebox
- **Auto-renewal execution** — time-based, cannot trigger within testing window
- **Payment failure retry behaviour** (PRD §6) — cannot simulate gateway failure on sandbox
- **24-hour cancellation cut-off** (PRD §6) — time-based, cannot test
- **Validity "from first use" vs "from purchase"** (PRD §5 ambiguity) — would need to buy and observe
- **Price on other routes** — tested only Powai → BKC; PRD says "same on every route"
- **Refund processing** (PRD §3) — cannot verify 3-business-day timeline
