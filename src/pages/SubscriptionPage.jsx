import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { PLANS } from '../lib/constants.js';
import { planById, uid } from '../lib/db.js';
import { charityAmount, validateContributionPct } from '../lib/engine.js';
import {
  TEST_CARDS,
  buildActivationFromPayment,
  formatCardNumber,
  formatExpiry,
  last4,
  newPaymentIntent,
  resolveGatewayOutcome,
  validateCardForm,
} from '../lib/payments.js';

const STEPS = ['Select plan', 'Payment', 'Confirmation'];

function Stepper({ step }) {
  const idx = step === 'select' ? 0 : step === 'payment' || step === 'processing' ? 1 : 2;
  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      {STEPS.map((s, i) => (
        <span key={s} className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full grid place-items-center ${i <= idx ? 'bg-accent text-white' : 'bg-white/10 text-slate-400'}`}>{i + 1}</span>
          <span className={i <= idx ? 'text-white' : 'text-slate-500'}>{s}</span>
          {i < STEPS.length - 1 && <span className="w-6 h-px bg-white/15 mx-1" />}
        </span>
      ))}
    </div>
  );
}

export default function SubscriptionPage() {
  const { user, db, setDb, activeSubscription } = useAuth();
  const sub = activeSubscription();
  const plan = user.planId ? planById(user.planId) : null;

  const [planId, setPlanId] = useState(user.planId || 'monthly');
  const [charityId, setCharityId] = useState(user.charityId || db.charities[0]?.id || '');
  const [pct, setPct] = useState(user.contribPct || 10);
  const [err, setErr] = useState('');
  const [step, setStep] = useState('select'); // select | payment | processing | success | failed
  const [activePaymentId, setActivePaymentId] = useState(null);
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const timer = useRef(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const selectedPlan = planById(planId);
  const activePayment = db.payments?.find((p) => p.id === activePaymentId) || null;
  const myPayments = (db.payments || []).filter((p) => p.userId === user.id).slice().reverse();

  function cancelSubscription() {
    if (!sub) return;
    setDb((d) => ({ ...d, subscriptions: d.subscriptions.map((s) => s.id === sub.id ? { ...s, status: 'cancelled' } : s) }));
  }

  // STEP 1 — validate choices and create a PENDING payment intent.
  // This never activates anything; it only moves to the payment step.
  function startCheckout() {
    setErr('');
    const pctErr = validateContributionPct(pct);
    if (pctErr) return setErr(pctErr);
    if (!charityId) return setErr('Please choose a charity recipient.');
    const p = planById(planId);
    if (!p) return setErr('Please choose a plan.');
    const intent = newPaymentIntent({
      id: uid('pay'), userId: user.id, planId, amount: p.price,
      currency: p.currency || 'INR', charityId, pct: Number(pct),
    });
    setDb((d) => ({ ...d, payments: [...(d.payments || []), intent] }));
    setActivePaymentId(intent.id);
    setStep('payment');
  }

  function cancelCheckout() {
    if (activePayment && (activePayment.status === 'requires_payment_method' || activePayment.status === 'failed')) {
      const id = activePayment.id;
      setDb((d) => ({ ...d, payments: (d.payments || []).map((p) => p.id === id ? { ...p, status: 'canceled', updatedAt: new Date().toISOString() } : p) }));
    }
    setActivePaymentId(null);
    setStep('select');
    setErr('');
  }

  // Webhook-equivalent: the ONLY place that mints an active subscription,
  // and only for a gateway-confirmed (succeeded) payment, idempotently.
  function handleWebhookSucceeded(paymentId, cardLast4) {
    let receipt = null;
    setDb((d) => {
      const payment = (d.payments || []).find((p) => p.id === paymentId);
      if (!payment || payment.status === 'succeeded') return d; // idempotent
      if (payment.status !== 'processing') return d; // only confirm from processing
      const at = new Date().toISOString();
      const { subscription, contribution } = buildActivationFromPayment(
        payment, { subscriptionId: uid('sub'), contributionId: uid('cc'), at },
      );
      // Extra idempotency: one subscription per payment.
      if (d.subscriptions.some((s) => s.paymentId === paymentId)) {
        return { ...d, payments: d.payments.map((p) => p.id === paymentId ? { ...p, status: 'succeeded', cardLast4, providerEventId: p.providerEventId || 'evt_' + paymentId, updatedAt: at } : p) };
      }
      receipt = subscription;
      return {
        ...d,
        payments: d.payments.map((p) => p.id === paymentId ? { ...p, status: 'succeeded', cardLast4, providerEventId: 'evt_' + paymentId, updatedAt: at } : p),
        users: d.users.map((u) => u.id === payment.userId ? { ...u, planId: payment.planId, charityId: payment.charityId, contribPct: Number(payment.pct) } : u),
        subscriptions: [...d.subscriptions, subscription],
        contributions: [...d.contributions, contribution],
      };
    });
    return receipt;
  }

  // STEP 2 — submit card to the (simulated) provider. Activation happens only
  // inside the timeout below, after the gateway decision — never on click.
  function payNow() {
    setErr('');
    if (!activePayment) return setErr('No payment session. Go back and start checkout again.');
    const formErr = validateCardForm(card);
    if (formErr) return setErr(formErr);
    const pid = activePayment.id;
    const l4 = last4(card.number);
    setDb((d) => ({
      ...d,
      payments: (d.payments || []).map((p) => p.id === pid
        ? { ...p, status: 'processing', attempts: (p.attempts || 0) + 1, cardLast4: l4, lastError: null, updatedAt: new Date().toISOString() }
        : p),
    }));
    setStep('processing');
    timer.current = setTimeout(() => {
      const outcome = resolveGatewayOutcome(card.number);
      if (outcome.ok) {
        handleWebhookSucceeded(pid, l4);
        setStep('success');
      } else {
        setDb((d) => ({
          ...d,
          payments: (d.payments || []).map((p) => p.id === pid
            ? { ...p, status: 'failed', lastError: outcome.message, updatedAt: new Date().toISOString() }
            : p),
        }));
        setStep('failed');
      }
    }, 1800);
  }

  function fillTest(num) {
    setCard((c) => ({ ...c, number: formatCardNumber(num), name: c.name || user.name || 'Test Hero', expiry: c.expiry || '12/28', cvc: c.cvc || '123' }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Subscription</h1>
      <Stepper step={step} />

      <div className="card text-sm space-y-1">
        <p>Status: <b>{sub ? 'Active' : 'Inactive / lapsed'}</b></p>
        <p>Plan: <b>{plan?.name || '—'}</b></p>
        <p>Renews: <b>{sub ? new Date(sub.renewsAt).toLocaleDateString() : '—'}</b></p>
        {sub && step === 'select' && <button onClick={cancelSubscription} className="btn-ghost mt-2 text-sm">Cancel subscription</button>}
      </div>

      {err && <p className="text-sm text-rose bg-rose/10 border border-rose/30 rounded-xl px-3 py-2">{err}</p>}

      {/* STEP 1 — choose plan & charity. Button only opens checkout, never pays. */}
      {step === 'select' && (
        <div className="card space-y-3">
          <p className="font-bold">Choose plan & charity</p>
          <p className="text-xs text-slate-400">You will pay on the next step. Nothing is charged or activated from this screen.</p>
          <div><label className="label">Plan</label>
            <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price.toLocaleString('en-IN')}/{p.interval}</option>)}
            </select></div>
          <div><label className="label">Charity recipient</label>
            <select className="input" value={charityId} onChange={(e) => setCharityId(e.target.value)}>
              {db.charities.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className="label">Charity contribution % (min 10)</label>
            <input className="input" type="number" min={10} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">≈ ₹{selectedPlan ? charityAmount(selectedPlan.price, Number(pct) || 0).toLocaleString('en-IN') : 0} of ₹{selectedPlan?.price.toLocaleString('en-IN')} goes to charity.</p></div>
          <button className="btn-primary" onClick={startCheckout}>Continue to payment {selectedPlan ? `· ₹${selectedPlan.price.toLocaleString('en-IN')}` : ''} →</button>
        </div>
      )}

      {/* STEP 2 — real payment form against a pending intent */}
      {step === 'payment' && activePayment && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-3">
            <p className="font-bold">Payment details</p>
            <p className="text-xs text-slate-400">Test gateway (Stripe-test equivalent). Your subscription activates only after the payment succeeds.</p>
            <div><label className="label">Name on card</label>
              <input className="input" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Aarav Sharma" /></div>
            <div><label className="label">Card number</label>
              <input className="input font-mono" inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} placeholder="4242 4242 4242 4242" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Expiry (MM/YY)</label>
                <input className="input font-mono" inputMode="numeric" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} placeholder="12/28" /></div>
              <div><label className="label">CVC</label>
                <input className="input font-mono" inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="123" /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary flex-1" onClick={payNow}>Pay ₹{activePayment.amount.toLocaleString('en-IN')}</button>
              <button className="btn-ghost" onClick={() => { setStep('select'); setErr(''); }}>Back</button>
              <button className="btn-ghost" onClick={cancelCheckout}>Cancel</button>
            </div>
            <div className="text-xs text-slate-400 border border-white/10 rounded-xl p-3 space-y-1">
              <p className="font-semibold text-slate-300">Test cards (click to fill):</p>
              {TEST_CARDS.map((t) => (
                <button key={t.number} onClick={() => fillTest(t.number)} className="block underline hover:text-white font-mono">{t.number} — {t.label}</button>
              ))}
            </div>
          </div>
          <div className="card space-y-2 text-sm h-fit">
            <p className="font-bold">Order summary</p>
            <p>Plan: <b>{planById(activePayment.planId)?.name}</b> ({activePayment.planId})</p>
            <p>Amount: <b>₹{activePayment.amount.toLocaleString('en-IN')}</b> {activePayment.currency}</p>
            <p>Charity: <b>{db.charities.find((c) => c.id === activePayment.charityId)?.name}</b> ({activePayment.pct}% ≈ ₹{charityAmount(activePayment.amount, activePayment.pct).toLocaleString('en-IN')})</p>
            <p className="text-xs text-slate-500 font-mono">Payment {activePayment.id} · {activePayment.status} · attempt {(activePayment.attempts || 0) + 1}</p>
            <p className="text-xs text-slate-400">🔒 Payment is confirmed by the gateway first — the subscription is created afterwards, never by this button alone.</p>
          </div>
        </div>
      )}

      {/* STEP 2b — processing */}
      {step === 'processing' && (
        <div className="card text-center space-y-3 py-10">
          <div className="mx-auto w-10 h-10 rounded-full border-2 border-white/15 border-t-accent animate-spin" />
          <p className="font-bold">Confirming payment with the bank…</p>
          <p className="text-sm text-slate-400">Do not close this window. Your subscription will activate automatically once the payment succeeds.</p>
        </div>
      )}

      {/* STEP 3a — success (only reachable via gateway success → webhook) */}
      {step === 'success' && (
        <div className="card space-y-3 border-mint/40">
          <p className="text-2xl">✅</p>
          <p className="font-bold text-lg">Payment successful — subscription active</p>
          <p className="text-sm text-slate-300">
            Receipt <span className="font-mono">{activePayment?.id}</span> · paid ₹{activePayment?.amount.toLocaleString('en-IN')} (card •••• {activePayment?.cardLast4}).
            {' '}₹{charityAmount(activePayment?.amount || 0, activePayment?.pct || 0).toLocaleString('en-IN')} goes to {db.charities.find((c) => c.id === activePayment?.charityId)?.name}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => { setStep('select'); setActivePaymentId(null); setCard({ name: '', number: '', expiry: '', cvc: '' }); }}>Done</button>
          </div>
        </div>
      )}

      {/* STEP 3b — failed: subscription stays inactive */}
      {step === 'failed' && (
        <div className="card space-y-3 border-rose/40">
          <p className="text-2xl">❌</p>
          <p className="font-bold text-lg">Payment failed — subscription not activated</p>
          <p className="text-sm text-slate-300">{activePayment?.lastError || 'The payment did not go through.'} No charge was made and your subscription is still inactive.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => { setStep('payment'); setErr(''); }}>Try again</button>
            <button className="btn-ghost" onClick={cancelCheckout}>Cancel payment</button>
          </div>
        </div>
      )}

      <div className="card text-sm">
        <p className="font-bold mb-2">Payments</p>
        {myPayments.length === 0 && <p className="text-slate-500">No payments yet — start a checkout above.</p>}
        {myPayments.map((p) => (
          <p key={p.id} className="text-slate-400 font-mono text-xs py-0.5">
            {p.id} · {p.planId} · ₹{p.amount} · <b className={p.status === 'succeeded' ? 'text-mint' : p.status === 'failed' ? 'text-rose' : 'text-gold'}>{p.status}</b>
            {p.cardLast4 ? ` · •••• ${p.cardLast4}` : ''}{p.lastError ? ` · ${p.lastError}` : ''}
          </p>
        ))}
      </div>

      <div className="card text-sm"><p className="font-bold mb-1">Subscription history</p>
        {db.subscriptions.filter((s) => s.userId === user.id).map((s) => <p key={s.id} className="text-slate-400">{s.planId} · ₹{s.amount} · {s.status} · renews {new Date(s.renewsAt).toLocaleDateString()}</p>)}
        {db.subscriptions.filter((s) => s.userId === user.id).length === 0 && <p className="text-slate-500">No subscription yet — complete a payment above to activate one.</p>}</div>
    </div>
  );
}
