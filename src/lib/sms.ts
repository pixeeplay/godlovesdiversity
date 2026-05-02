/**
 * Envoi SMS via Twilio (sur lib HTTP-only — pas de SDK).
 * Configuration : settings 'integrations.twilio.{accountSid,authToken,fromNumber}' OU env TWILIO_*.
 *
 * Si non configuré, l'envoi est mocké (log only) et retourne ok=false silencieusement —
 * le flow ne casse pas, l'admin verra dans les logs.
 */
import { getSettings } from './settings';

export async function sendSMS(toNumber: string, message: string): Promise<{ ok: boolean; error?: string; sid?: string }> {
  if (!toNumber) return { ok: false, error: 'no recipient' };

  const settings = await getSettings([
    'integrations.twilio.accountSid',
    'integrations.twilio.authToken',
    'integrations.twilio.fromNumber'
  ]).catch(() => ({} as Record<string, string>));

  const sid = settings['integrations.twilio.accountSid'] || process.env.TWILIO_ACCOUNT_SID;
  const token = settings['integrations.twilio.authToken'] || process.env.TWILIO_AUTH_TOKEN;
  const from = settings['integrations.twilio.fromNumber'] || process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[SMS mock] → ${toNumber}: ${message.slice(0, 80)}…`);
    return { ok: false, error: 'Twilio non configuré' };
  }

  // Normaliser le numéro (E.164 — ajoute +33 si numéro français commence par 0)
  let to = toNumber.replace(/[\s.-]/g, '');
  if (to.startsWith('0') && to.length === 10) to = '+33' + to.slice(1);
  if (!to.startsWith('+')) to = '+' + to;

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message.slice(0, 1500)
  });
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    const j = await r.json();
    if (j.error_code || !j.sid) return { ok: false, error: j.message || 'Twilio error' };
    return { ok: true, sid: j.sid };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
