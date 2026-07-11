import crypto from 'crypto';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sign(payload) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionToken() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${expires}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [role, expiresStr, signature] = parts;
  const payload = `${role}.${expiresStr}`;
  const expected = sign(payload);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  const expires = parseInt(expiresStr, 10);
  if (Number.isNaN(expires) || Date.now() > expires) return false;

  return true;
}
