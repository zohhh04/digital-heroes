# Digital Heroes — Golf · Charity · Monthly Draws

Full-stack-style demo implementing the **Digital Heroes PRD Level 1**: subscriptions, 5-score rolling golf tracking, random + algorithmic monthly draws, 40/35/25 prize tiers with jackpot rollover, charity giving (min 10%), winner proof verification, subscriber + admin dashboards.

## Run locally
```bash
cd digital-heroes
npm install
npm run dev     # http://localhost:5173
node scripts/verify.mjs   # 9 engine checks (scores, prizes, draws, charity)
npm run build   # production build
```

## Test credentials (evaluators)
- Subscriber: `hero@digitalheroes.test` / `Hero@123`
- Admin: `admin@digitalheroes.test` / `Admin@123`
- Or sign up fresh: `/signup` (Stripe test checkout is mocked + activates server-side-equivalent).

## PRD coverage → where it lives
| Requirement | Implementation |
|---|---|
| Monthly ₹999 / Yearly ₹8,999, Stripe test, renewal/cancel/lapse, backend status check | `src/pages/Signup.jsx` (mock checkout + webhook-equivalent), `SubscriptionPage.jsx`, `AuthContext.activeSubscription()` |
| Scores 1–45, date required, 1/date, edit/delete, newest-first, rolling 5 | `src/lib/engine.js: rollScores`, `src/pages/Scores.jsx`, DB unique `(user_id, score_date)` in `supabase/schema.sql` |
| Random + algorithmic (score-frequency weighted) draws, monthly, simulate, publish, rollover | `src/lib/engine.js` (seeded RNG, weights), `src/pages/admin/Draws.jsx` |
| Prize pool 40/35/25, equal split, jackpot carry | `calcPrizePool`, `splitTier`; example ₹100k → 40/35/25 verified in `scripts/verify.mjs` |
| Charity select at signup, min 10%, raise %, direct donation, directory/search/filter, profiles, events, spotlight | `CharityPref.jsx`, `Charities.jsx`, `CharityDetail.jsx`, `Home.jsx` |
| Winner proof upload → admin approve/reject → Pending→Paid | `ProofUpload.jsx`, `admin/Winners.jsx` |
| Subscriber dashboard (status, renewal, scores, charity, draws, winnings, payout) | `Dashboard.jsx` + sub-pages |
| Admin: users, draws, charities, winners, reports | `src/pages/admin/*` |
| Responsive, modern, charity-first, micro-interactions | Tailwind + `index.css` |

## Documented assumptions (PRD left open)
1. Draw numbers: 5 unique numbers, range **1–45** (mirrors Stableford range); one entry per eligible subscriber per draw, derived deterministically (auditable).
2. Algorithmic weighting: normalized frequency of retained Stableford scores across eligible subscribers; config + version stored with draw.
3. Prize funding: **admin-configurable % of eligible subscription revenue (default 50%)**; only `active`, unexpired, non-duplicate payments count; tiers split 40/35/25; only unclaimed 5-match jackpot rolls over.

## Production upgrade path (Supabase + Stripe + Vercel)
1. Create **new Supabase project** → apply `supabase/schema.sql` → set RLS policies (owner-or-admin; role set by trusted provisioning only).
2. Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Swap `src/lib/db.js` calls for Supabase client; keep `engine.js` pure logic unchanged — move draw execution into an Edge Function with service-role key.
3. Stripe test mode: create Checkout Session server-side; activate subscription **only** on signature-verified `checkout.session.completed` webhook with idempotent `payment_events` insert. Never activate from success-page redirect.
4. Create **new Vercel account** → import repo → add env vars → deploy. Winner proofs go to private Supabase Storage with short-lived signed URLs.

## Deploy on Vercel (this repo)
Build command: `npm run build` · Output: `dist` · Framework: Vite. No server required for the demo.

## Testing checklist (PRD §14) — all covered
Signup/login · monthly+yearly flow · 5-score rolling · draw sim + live · charity % math · proof + payout · both dashboards · data accuracy (`verify.mjs`) · responsive · error/edge cases (duplicate date, <10%, lapsed lockout, empty tiers).
