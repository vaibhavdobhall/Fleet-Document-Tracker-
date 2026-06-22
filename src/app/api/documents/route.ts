import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';

// ---------------------------------------------------------------------------
// POST /api/documents
//
// Creates a new client, vehicle, and document in one atomic call, then sends
// an instant WhatsApp confirmation to the client.  If the WhatsApp call fails
// the data is still safely saved.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // --- Parse body ---
  let body: {
    clientName?: string;
    whatsappNumber?: string;
    vehicleNumber?: string;
    documentType?: string;
    expiryDate?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { clientName, whatsappNumber, vehicleNumber, documentType, expiryDate } = body;

  if (!clientName?.trim()) {
    return NextResponse.json({ error: 'clientName is required.' }, { status: 400 });
  }
  if (!vehicleNumber?.trim()) {
    return NextResponse.json({ error: 'vehicleNumber is required.' }, { status: 400 });
  }
  if (!expiryDate) {
    return NextResponse.json({ error: 'expiryDate is required.' }, { status: 400 });
  }

  // --- Build Supabase client ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // --- 1. Insert the client ---
    const { data: client, error: clientError } = await supabase
      .from('Clients')
      .insert({ name: clientName.trim(), whatsapp_number: whatsappNumber?.trim() || null })
      .select('id')
      .single();

    if (clientError) {
      return NextResponse.json({ error: `Failed to create client: ${clientError.message}` }, { status: 500 });
    }

    // --- 2. Insert the vehicle linked to the client ---
    const { data: vehicle, error: vehicleError } = await supabase
      .from('Vehicles')
      .insert({ client_id: client.id, vehicle_number: vehicleNumber.trim().toUpperCase() })
      .select('id')
      .single();

    if (vehicleError) {
      return NextResponse.json({ error: `Failed to create vehicle: ${vehicleError.message}` }, { status: 500 });
    }

    // --- 3. Insert the document linked to the vehicle ---
    const status = new Date(expiryDate) >= new Date() ? 'Active' : 'Expired';

    const { error: docError } = await supabase.from('Documents').insert({
      vehicle_id: vehicle.id,
      document_type: documentType,
      expiry_date: expiryDate,
      status,
    });

    if (docError) {
      return NextResponse.json({ error: `Failed to create document: ${docError.message}` }, { status: 500 });
    }

    // ---------------------------------------------------------------
    // 4. Send instant WhatsApp confirmation (fire-and-forget)
    // ---------------------------------------------------------------
    const recipient = whatsappNumber?.trim();
    if (recipient) {
      await sendConfirmationMessage(
        recipient,
        vehicleNumber.trim().toUpperCase(),
        documentType ?? 'Document',
        expiryDate,
      );
    }

    return NextResponse.json({
      message: 'Client, vehicle, and document saved successfully.',
    });
  } catch (err) {
    console.error('Unexpected error in POST /api/documents:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// WhatsApp confirmation helper
// ---------------------------------------------------------------------------

async function sendConfirmationMessage(
  phoneNumber: string,
  vehicleNumber: string,
  documentType: string,
  expiryDate: string,
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio not configured — skipping WhatsApp confirmation.');
    return;
  }

  const client = Twilio(accountSid, authToken);
  const to = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;

  const body = `Success! Aapki gaadi ${vehicleNumber} ka ${documentType} (Expiry: ${expiryDate}) system mein save ho gaya hai. Aapko samay par alert mil jayega.`;

  try {
    await client.messages.create({ from: fromNumber, to, body });
    console.log(`✓ WhatsApp confirmation sent to ${phoneNumber}`);
  } catch (err) {
    // Swallow the error — the data is already saved safely
    console.error(`✗ WhatsApp confirmation failed for ${phoneNumber}:`, err);
  }
}