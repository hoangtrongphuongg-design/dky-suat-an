import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const DASHBOARD_COOKIE = 'dashboard_session';
const SESSION_SECONDS = 8 * 60 * 60;

function signingKey() {
  return `${process.env.DASHBOARD_SECRET || ''}:${process.env.DASHBOARD_PIN || ''}`;
}

export function isDashboardConfigured() {
  return /^\d{4}$/.test(process.env.DASHBOARD_PIN || '') &&
    (process.env.DASHBOARD_SECRET || '').length >= 32;
}

function sign(payload) {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

export function pinsMatch(input) {
  const actual = String(process.env.DASHBOARD_PIN || '');
  const supplied = String(input || '');
  if (!/^\d{4}$/.test(supplied) || actual.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(supplied));
}

export function createDashboardSession() {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    nonce: randomUUID(),
  })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, maxAge: SESSION_SECONDS };
}

export function verifyDashboardSession(token) {
  if (!isDashboardConfigured() || !token) return false;
  const [payload, signature, extra] = String(token).split('.');
  if (!payload || !signature || extra) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(data.exp) && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
