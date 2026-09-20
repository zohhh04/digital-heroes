export default function HowItWorks() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">How it works</h1>
      <div className="card space-y-2 text-sm">
        <p className="font-bold text-white text-base">⚡ Super simple version (start here)</p>
        <p><b className="text-mint">Step 1 — Join:</b> Click <b>Join / Subscribe</b>, fill name + email + password, pick Monthly/Yearly and your charity. Pay (test mode).</p>
        <p><b className="text-mint">Step 2 — Login:</b> After payment, login with your email + password. That's it, you're inside!</p>
        <p><b className="text-mint">Step 3 — Add scores:</b> Go to <b>Dashboard → Scores</b>, type your golf score (1–45) + date. Add up to 5; oldest auto-drops.</p>
        <p><b className="text-mint">Step 4 — Win monthly:</b> Every month there's a lucky draw. Match 3, 4 or 5 numbers to win a share of the prize. Jackpot rolls over if nobody hits 5.</p>
        <p><b className="text-mint">Step 5 — Charity + payout:</b> At least 10% of your fee already went to your charity. If you win, upload a score screenshot → admin approves → you get marked Paid.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
      <div className="card space-y-3 text-sm text-slate-300">
        <p><b className="text-white">1. Subscribe.</b> Monthly ₹999 or Yearly ₹8,999 (Stripe test mode). Backend verifies active status on every protected request.</p>
        <p><b className="text-white">2. Pick a charity + %.</b> Minimum 10% of your fee funds your charity. Raise it any time; make extra donations too.</p>
        <p><b className="text-white">3. Record scores.</b> Stableford 1–45, one entry per date, last 5 kept (oldest auto-replaced), newest first.</p>
        <p><b className="text-white">4. Monthly draw.</b> Each eligible subscriber gets one 5-number entry (1–45). Tiers: 5-match 40% · 4-match 35% · 3-match 25%. Same-tier winners split equally. Unclaimed 5-match jackpot rolls over.</p>
        <p><b className="text-white">5. Verify & get paid.</b> Winners upload a score screenshot → admin approves/rejects → payout moves Pending → Paid.</p>
      </div>
      <div className="card text-sm text-slate-300">
        <p className="font-bold text-white mb-1">Implementation assumptions (PRD left these open)</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Numbers range 1–45, 5 numbers per entry, one entry per subscriber per draw.</li>
          <li>Algorithmic mode weights numbers by retained-score frequency (see README + code).</li>
          <li>Prize funding = configurable % of eligible revenue (default 50%); tiers split 40/35/25.</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
