import Twilio from 'twilio';

/**
 * Send a WhatsApp alert via Twilio's API using a pre-approved template message.
 *
 * The message is in Hinglish so fleet owners quickly understand the urgency.
 *
 * @param phoneNumber  - Recipient WhatsApp number (e.g. "+919XXXXXXXXX").
 *                       The function prepends "whatsapp:" if missing.
 * @param vehicleNumber - Vehicle registration number (e.g. "MH-12-AB-1234").
 * @param docType       - Document type (e.g. "Fitness", "PUC").
 * @param daysLeft      - Number of days remaining before expiry.
 * @param expiryDate    - The expiry date string to show.
 */
export async function sendWhatsAppAlert(
  phoneNumber: string,
  vehicleNumber: string,
  docType: string,
  daysLeft: number,
  expiryDate: string,
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in .env.local',
    );
    return;
  }

  const client = Twilio(accountSid, authToken);

  // Ensure the recipient number has the "whatsapp:" prefix
  const to = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;

  // Hinglish template message
  const body = `Namaste! Aapki gaadi ${vehicleNumber} ka ${docType} ${daysLeft} din mein (${expiryDate} ko) expire ho raha hai. Kripya dhyan dein.`;

  await client.messages.create({
    from: fromNumber,
    to,
    body,
  });
}