import crypto from 'crypto';
import { config } from '../config.js';

export interface JwtClaims {
  sub: string; // user_id (UUID)
  email: string;
  fullName: string;
  orgId?: string;
  role?: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): Buffer {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) {
    str += '=';
  }
  return Buffer.from(str, 'base64');
}

/**
 * Issue a signed HS256 JWT (Supabase Auth compatible claims: sub, email, role, exp)
 */
export function signJwtToken(payload: {
  sub: string;
  email: string;
  fullName: string;
  orgId?: string;
  role?: string;
}): { accessToken: string; expiresAt: string; expiresIn: number } {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresIn = config.JWT_EXPIRES_IN_SECONDS;
  const exp = nowSec + expiresIn;

  const header = { alg: 'HS256', typ: 'JWT' };
  const claims: JwtClaims = {
    sub: payload.sub,
    email: payload.email,
    fullName: payload.fullName,
    orgId: payload.orgId,
    role: payload.role,
    iat: nowSec,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(signingInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return {
    accessToken: `${signingInput}.${encodedSignature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
    expiresIn,
  };
}

/**
 * Verify an HS256 JWT token or extract claims.
 * Returns null if invalid or expired.
 */
export function verifyJwtToken(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', config.JWT_SECRET).update(signingInput).digest()
    );

    const sigBufA = Buffer.from(encodedSignature);
    const sigBufB = Buffer.from(expectedSig);
    if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
      return null;
    }

    const payloadJson = base64UrlDecode(encodedPayload).toString('utf8');
    const claims = JSON.parse(payloadJson) as JwtClaims;

    const nowSec = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp < nowSec) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

/**
 * Resolve User ID from Authorization header / token string.
 * Supports:
 * 1. Standard Bearer HS256 JWT token (`claims.sub`)
 * 2. Legacy development/simulator token (`user_<uuid>`)
 * 3. Default demo user fallback when no token is provided in development
 */
export function resolveUserIdFromToken(
  authHeaderOrToken: string | undefined,
  fallbackUserId?: string
): { userId: string | null; claims: JwtClaims | null; isExplicitToken: boolean } {
  if (!authHeaderOrToken) {
    return { userId: fallbackUserId || null, claims: null, isExplicitToken: false };
  }

  const rawToken = authHeaderOrToken.startsWith('Bearer ')
    ? authHeaderOrToken.substring(7).trim()
    : authHeaderOrToken.trim();

  if (!rawToken) {
    return { userId: fallbackUserId || null, claims: null, isExplicitToken: false };
  }

  // Legacy / simulator token format: user_<uuid>
  if (rawToken.startsWith('user_')) {
    const uid = rawToken.replace('user_', '').trim();
    return { userId: uid, claims: null, isExplicitToken: true };
  }

  // Verify JWT token
  const claims = verifyJwtToken(rawToken);
  if (claims && claims.sub) {
    return { userId: claims.sub, claims, isExplicitToken: true };
  }

  return { userId: null, claims: null, isExplicitToken: true };
}
