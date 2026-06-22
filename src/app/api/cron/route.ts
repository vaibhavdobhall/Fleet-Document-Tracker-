import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppAlert } from '@/lib/twilio';
import { dateInISTDays } from '@/lib/ist';

// ---------------------------------------------------------------------------
// Bearer token check — simple security so random people can't trigger the cron
// ---------------------------------------------------------------------------
function authorize(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.warn('CRON_SECRET environment variable is not set. Endpoint is unprotected!');
    return null; // allow when not configured (dev convenience)
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid bearer token' }, { status: 403 });
  }

  return null; // authorised
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Send messages in batches of `batchSize` with a `delayMs` pause between
 * batches.  This avoids hitting Twilio's per-second rate limit on the
 * WhatsApp Business API (typically ~80 messages/sec for a single sender,
 * but we stay conservative).
 */
async function sendBatched(
  alerts: Array<() => Promise<void>>,
  batchSize = 5,
  delayMs = 2_000,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize);

    const results = await Promise.allSettled(batch.map((fn) => fn()));

    for (const r of results) {
      if (r.status === 'fulfilled') {
        sent++;
      } else {
        console.error('Batch send error:', r.reason);
        failed++;
      }
    }

    // Pause between batches (skip after the last batch)
    if (i + batchSize < alerts.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Cron Handler — GET /api/cron
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authError = authorize(request);
  if (authError) return authError;

  // Build Supabase client using server-side env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // --- 1. Fetch all documents with their vehicle and client info ---
  const { data: docs, error } = await supabase
    .from('Documents')
    .select(`
      id,
      document_type,
      expiry_date,
      status,
      vehicle:Vehicles!vehicle_id (
        vehicle_number,
        client:Clients!client_id (
          whatsapp_number
        )
      )
    `);

  if (error) {
    console.error('Cron: Failed to query documents', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  if (!docs || docs.length === 0) {
    console.log('Cron: No documents found.');
    return NextResponse.json({ message: 'No documents to check', alerts: 0 });
  }

  // --- 2. Compute target dates in IST ---
  const targets = [
    { label: '30 days', delta: 30 },
    { label: '15 days', delta: 15 },
    { label: '3 days', delta: 3 },
  ] as const;

  const targetDateStrings = targets.map((t) => ({
    ...t,
    dateStr: dateInISTDays(t.delta),
  }));

  // --- 3. Filter & build alert list ---
  let alertCount = 0;
  const alertTasks: Array<() => Promise<void>> = [];

  for (const doc of docs) {
    const docDateStr = doc.expiry_date;
    const vehicleData = doc.vehicle as unknown as {
      vehicle_number: string;
      client: { whatsapp_number: string | null } | null;
    } | null;

    const vehicleNumber = vehicleData?.vehicle_number ?? 'Unknown';
    const clientWhatsapp = vehicleData?.client?.whatsapp_number ?? null;

    for (const target of targetDateStrings) {
      if (docDateStr === target.dateStr) {
        alertCount++;

        if (!clientWhatsapp) {
          console.log(`Skipping ${vehicleNumber} — no WhatsApp number on file.`);
          continue;
        }

        // Capture variables in a closure so each task is independent
        alertTasks.push(async () => {
          await sendWhatsAppAlert(
            clientWhatsapp,
            vehicleNumber,
            doc.document_type,
            target.delta,
            docDateStr,
          );
          console.log(`✓ Alert sent for ${vehicleNumber} (${doc.document_type} — ${target.label})`);
        });
      }
    }
  }

  // --- 4. Send alerts in batches (rate-limit safety) ---
  const { sent, failed } = await sendBatched(alertTasks, 5, 2_000);

  return NextResponse.json({
    message: `Checked ${docs.length} documents. Triggered ${alertCount} alerts.`,
    alerts: alertCount,
    sent,
    failed,
  });
}