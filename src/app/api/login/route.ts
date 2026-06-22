import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';

// ---------------------------------------------------------------------------
// POST /api/login
//
// Accepts `{ password: string }` and compares it against the ADMIN_PASSWORD
// environment variable using a timing-safe comparison.  On success it sets
// an HTTP-only, signed session cookie and returns 200.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { password } = body;

  if (!password) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    console.error('ADMIN_PASSWORD environment variable is not set.');
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
  }

  // Timing-safe comparison
  if (password.length !== expected.length) {
    // Return a generic error so attackers can't guess the length
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  let diff = 0;
  for (let i = 0; i < password.length; i++) {
    diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  if (diff !== 0) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  // Password matches — set the session cookie
  const response = NextResponse.json({ message: 'Authenticated successfully.' });
  await setSessionCookie(response);

  return response;
}