import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// Web Crypto helpers (Edge Runtime compatible)
// ---------------------------------------------------------------------------

/**
 * Derive an HMAC key from the ADMIN_PASSWORD env var using the Web Crypto API.
 */
async function getSigningKey(): Promise<CryptoKey> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is not set.');
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(password);

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Generate a hex string from an ArrayBuffer.
 */
function bufToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a signed session token using HMAC-SHA256.
 *
 * Format:  `random_bytes.timestamp.signature`
 */
export async function createSessionToken(): Promise<string> {
  const key = await getSigningKey();

  const random = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString(16);

  const payload = `${random}.${timestamp}`;
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  return `${payload}.${bufToHex(signature)}`;
}

/**
 * Verify a session token.  Returns `true` if the signature is valid and the
 * token has not expired.
 */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [random, timestampHex, signatureHex] = parts;
  const payload = `${random}.${timestampHex}`;

  try {
    // 1. Verify signature
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [],
    );

    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payload));
    if (!isValid) return false;

    // 2. Verify expiry
    const timestamp = parseInt(timestampHex, 16) * 1000; // convert to ms
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > SESSION_MAX_AGE_MS) return false;

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Middleware / Route helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the incoming request has a valid admin session cookie.
 * Used by proxy.ts to protect pages and API routes.
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Set the admin session cookie on a response.
 */
export async function setSessionCookie(response: NextResponse): Promise<void> {
  const token = await createSessionToken();

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000, // seconds
  });
}

/**
 * Clear the admin session cookie (logout).
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}