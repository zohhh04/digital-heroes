// Payment gateway abstraction (demo / Stripe-test equivalent).
//
// Production model this mirrors:
//   1. Client creates a Checkout Session / PaymentIntent server-side (pending).
//   2. User completes payment with the provider (card form / hosted checkout).
//   3. Provider sends a signature-verified webhook (checkout.session.completed /
//      payment_intent.succeeded). ONLY the webhook handler activates the
//      subscription, idempotently via payment_events(provider_event_id).
//   4. Success-page redirects NEVER activate anything on their own.
//
// In this frontend-only demo there is no server, so:
//   - `createPaymentIntent()` = step 1 (status: requires_payment_method)
//   - card form + `resolveGatewayOutcome()` = step 2 (simulated provider)
//   - `buildActivationFromPayment()` = step 3 (the webhook-equivalent; the ONLY
//     place allowed to mint an `active` subscription for a payment)
// The Subscription page enforces this ordering via its step machine:
// select -> payment -> processing -> success|failed.

export const PAYMENT_STATUS = [
  'requires_payment_method',
  'requires_confirmation',
  'processing',
  'succeeded',
  'failed',
  'canceled',
];

// Stripe-style test cards for the demo gateway.
export const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Succeeds', outcome: 'succeeded' },
  { number: '4000 0000 0000 0002', label: 'Declined (card_declined)', outcome: 'failed' },
  { number: '4000 0000 0000 9995', label: 'Fails (insufficient_funds)', outcome: 'failed' },
];

export function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

export function luhnCheck(num) {
  const d = digitsOnly(num);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(number) {
  const d = digitsOnly(number);
  if (!d) return 'Card number is required.';
  if (d.length < 13 || d.length > 19) return 'Card number must be 13–19 digits.';
  if (!luhnCheck(d)) return 'Card number is invalid (failed Luhn check). Try 4242 4242 4242 4242.';
  return null;
}

export function validateExpiry(expiry) {
  const m = String(expiry || '').trim().match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2}|\d{4})$/);
  if (!m) return 'Expiry must be MM/YY (e.g. 12/28).';
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  const month = Number(m[1]);
  const now = new Date();
  // Card valid through end of expiry month.
  const end = new Date(year, month, 0, 23, 59, 59);
  if (end < now) return 'Card is expired.';
  return null;
}

export function validateCvc(cvc) {
  if (!/^\d{3,4}$/.test(String(cvc || '').trim())) return 'CVC must be 3–4 digits.';
  return null;
}

export function validateCardForm({ name, number, expiry, cvc }) {
  if (!String(name || '').trim()) return 'Cardholder name is required.';
  return validateCardNumber(number) || validateExpiry(expiry) || validateCvc(cvc);
}

export function formatCardNumber(v) {
  return digitsOnly(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(v) {
  const d = digitsOnly(v).slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + '/' + d.slice(2);
}

export function last4(number) {
  return digitsOnly(number).slice(-4);
}

// Simulated provider decision, Stripe-test semantics:
// known decline cards fail with a gateway reason; any other Luhn-valid
// card succeeds. Luhn-invalid input never reaches here (client validation).
export function resolveGatewayOutcome(cardNumber) {
  const d = digitsOnly(cardNumber);
  if (d === '4000000000000002') {
    return { ok: false, code: 'card_declined', message: 'Your card was declined. Try the 4242 test card.' };
  }
  if (d === '4000000000009995') {
    return { ok: false, code: 'insufficient_funds', message: 'Insufficient funds. Try the 4242 test card.' };
  }
  if (!luhnCheck(d)) {
    return { ok: false, code: 'incorrect_number', message: 'Card number is incorrect.' };
  }
  return { ok: true, code: 'succeeded', message: 'Payment succeeded.' };
}

// Step 1 — create a pending intent. NEVER creates a subscription.
export function newPaymentIntent({ userId, planId, amount, currency = 'INR', charityId, pct, id }) {
  const now = new Date().toISOString();
  return {
    id,
    userId,
    planId,
    amount,
    currency,
    charityId,
    pct: Number(pct),
    status: 'requires_payment_method',
    attempts: 0,
    lastError: null,
    cardLast4: null,
    createdAt: now,
    updatedAt: now,
    // In production this is the Stripe provider_event_id used for idempotency
    // in the `payment_events` table. Reused here for the same purpose.
    providerEventId: null,
  };
}

// Step 3 (webhook-equivalent) — derive the subscription + contribution rows
// for a SUCCEEDED payment. Callers must only invoke this after the gateway
// reports success, and must guard with `payment.status === 'succeeded'` plus
// an idempotency check (one active subscription per payment id).
export function buildActivationFromPayment(payment, { subscriptionId, contributionId, at }) {
  const renewsAt = new Date(at);
  renewsAt.setDate(renewsAt.getDate() + (payment.planId === 'yearly' ? 365 : 30));
  const charityAmt = Math.round((Number(payment.amount) * Number(payment.pct)) / 100);
  return {
    subscription: {
      id: subscriptionId,
      userId: payment.userId,
      planId: payment.planId,
      status: 'active',
      amount: payment.amount,
      renewsAt: renewsAt.toISOString(),
      createdAt: at,
      provider: 'stripe_test_mock:webhook',
      paymentId: payment.id,
    },
    contribution: {
      id: contributionId,
      userId: payment.userId,
      charityId: payment.charityId,
      amount: charityAmt,
      pct: Number(payment.pct),
      source: 'subscription ' + subscriptionId,
      at,
    },
  };
}
