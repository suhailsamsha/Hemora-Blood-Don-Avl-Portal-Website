import crypto from 'node:crypto';

const DEFAULT_SECRET = 'blood-portal-local-dev-secret-2026-keep-safe';

function getSecret(): string {
  return process.env.OTP_HMAC_SECRET && process.env.OTP_HMAC_SECRET.trim().length >= 8
    ? process.env.OTP_HMAC_SECRET.trim()
    : DEFAULT_SECRET;
}

function getAesKey(): Buffer {
  return crypto.createHash('sha256').update(getSecret()).digest();
}

/**
 * Normalizes Indian mobile numbers to +91XXXXXXXXXX.
 * Rejects numbers that do not contain a valid 10-digit Indian mobile starting with 6-9.
 */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let ten = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    ten = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    ten = digits.slice(1);
  }
  if (!/^[6-9]\d{9}$/.test(ten)) {
    return null;
  }
  return `+91${ten}`;
}

export function maskPhone(normalizedPhone: string): string {
  if (normalizedPhone.length < 6) return '******';
  return `${normalizedPhone.slice(0, 5)}••••${normalizedPhone.slice(-2)}`;
}

export function hashPhone(normalizedPhone: string): string {
  return crypto.createHmac('sha256', getSecret()).update(normalizedPhone).digest('hex');
}

export function hashOtpCode(challengeId: string, code: string): string {
  return crypto.createHmac('sha256', getSecret()).update(`${challengeId}:${code}`).digest('hex');
}

export function encryptPhone(normalizedPhone: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getAesKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalizedPhone, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPhone(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) return '';
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getAesKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  const expectedBuf = Buffer.from(hashHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export interface SessionPayload {
  role: 'donor' | 'admin' | 'requester';
  sub: string;
  email?: string;
  name?: string;
  jti?: string;
  exp: number;
}

export function signSessionToken(
  payload: Omit<SessionPayload, 'exp'>,
  ttlSeconds = 60 * 60 * 24 * 7
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString('base64url');
  const full: SessionPayload = {
    ...payload,
    jti: payload.jti ?? crypto.randomBytes(12).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const signingInput = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  let signingInput = '';
  let bodyB64 = '';
  let sig = '';
  if (parts.length === 3) {
    signingInput = `${parts[0]}.${parts[1]}`;
    bodyB64 = parts[1];
    sig = parts[2];
  } else if (parts.length === 2) {
    signingInput = parts[0];
    bodyB64 = parts[0];
    sig = parts[1];
  } else {
    return null;
  }
  if (!signingInput || !sig) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(signingInput).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
