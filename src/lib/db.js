// Local demo persistence layer (localStorage).
// Shape mirrors supabase/schema.sql so swapping to Supabase is mechanical:
// every collection below maps 1:1 to a Postgres table.
import { PLANS, DEFAULT_PRIZE_FUNDING_PCT } from './constants.js';

const KEY = 'dh_db_v1';

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
function todayPlus(days) {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString();
}

export function seedCharities() {
  return [
    { id: 'ch_hope', name: 'Hope Greens Foundation', description: 'Funds junior golf + school meals across India.', image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80', events: 'City Golf Day — Oct 12; Charity Pro-Am — Nov 3', featured: true, active: true, raised: 184500 },
    { id: 'ch_ocean', name: 'Ocean & Fairways Trust', description: 'Cleans coastlines; every round funds 5kg of cleanup.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', events: 'Beach Cleanup Open — Oct 26', featured: true, active: true, raised: 96200 },
    { id: 'ch_edu', name: 'Scholarship Birdies', description: 'Golf scholarships for first-generation students.', image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80', events: 'Scholars Cup — Nov 16', featured: false, active: true, raised: 74150 },
    { id: 'ch_health', name: 'Healing Rounds', description: 'Therapy-through-sport programs in hospitals.', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80', events: 'Hospital Heroes Clinic — Dec 1', featured: false, active: true, raised: 52800 },
  ];
}

export function seedDb() {
  return {
    version: 1,
    users: [
      { id: 'u_admin', name: 'Ava Admin', email: 'admin@digitalheroes.test', pass: 'Admin@123', role: 'admin', planId: null, charityId: 'ch_hope', contribPct: 10, createdAt: new Date().toISOString() },
      { id: 'u_hero', name: 'Ravi Hero', email: 'hero@digitalheroes.test', pass: 'Hero@123', role: 'subscriber', planId: 'monthly', charityId: 'ch_hope', contribPct: 15, createdAt: new Date().toISOString() },
    ],
    subscriptions: [
      { id: 'sub_hero1', userId: 'u_hero', planId: 'monthly', status: 'active', amount: 999, renewsAt: todayPlus(30), createdAt: new Date().toISOString(), provider: 'stripe_test_mock' },
    ],
    scores: [
      { id: uid('sc'), userId: 'u_hero', score_date: '2026-09-18', stableford: 36 },
      { id: uid('sc'), userId: 'u_hero', score_date: '2026-09-12', stableford: 32 },
      { id: uid('sc'), userId: 'u_hero', score_date: '2026-09-05', stableford: 28 },
    ],
    charities: seedCharities(),
    draws: [],
    entries: [], // {id, drawId, userId, numbers, matches, tier}
    pools: [], // {id, drawId, ...calcPrizePool}
    winners: [], // {id, drawId, userId, tier, amount, verify, payout, proofUrl, reviewerNote, paidAt}
    donations: [],
    contributions: [ // derived charity ledger
      { id: uid('cc'), userId: 'u_hero', charityId: 'ch_hope', amount: 150, pct: 15, source: 'subscription sub_hero1', at: new Date().toISOString() },
    ],
    audit: [],
    settings: { prizeFundingPct: DEFAULT_PRIZE_FUNDING_PCT, rolloverJackpot: 0 },
    sessionUserId: null,
  };
}

export function loadDb() {
  const migrate = (db) => {
    // Fix old broken Scholarship Birdies photo for existing saved data.
    if (db.charities) {
      db.charities = db.charities.map((c) => (c.id === 'ch_edu' && c.image.includes('1523050854058')
        ? { ...c, image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80' } : c));
    }
    return db;
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = seedDb(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
    return migrate(JSON.parse(raw));
  } catch { const s = seedDb(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
}
export function saveDb(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
export function resetDb() { const s = seedDb(); saveDb(s); return s; }
export function planById(id) { return PLANS.find((p) => p.id === id); }
export { uid };
