import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

// ---------------------------------------------------------------------------
// POST /api/logout
//
// Clears the admin session cookie, effectively logging the user out.
// ---------------------------------------------------------------------------

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully.' });
  clearSessionCookie(response);
  return response;
}