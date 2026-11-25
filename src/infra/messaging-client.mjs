/**
 * @fileoverview Client unifié SMS + WhatsApp (NOT-01 / V3) via Twilio REST API
 * (Sandbox WhatsApp gratuit & Trial SMS à 0,00 $, extensible vers Infobip / Meta + Africa's Talking).
 */

const DEFAULT_APP_BASE_URL = 'https://guichetuniquefnpss.vercel.app';
const DEMO_DUMMY_DOMAINS = ['@ong-rdc.org', '@espoir-kivu.org', '@fnpss.cd', '@example.com', '@test.local'];

function isDummyDemoPhoneOrEmail(phone, email = '') {
  const lowEmail = String(email || '').trim().toLowerCase();
  if (lowEmail && DEMO_DUMMY_DOMAINS.some((dom) => lowEmail.endsWith(dom))) {
    return true;
  }
  const clean = String(phone || '').replace(/\D/g, '');
  if (!clean || /^(\d)\1{6,}$/.test(clean) || clean.endsWith('0000000')) {
    return true;
  }
  return false;
}

/**
 * Normalise un numéro de téléphone au format international E.164 (ex: 0812345678 -> +243812345678).
 * Retourne null si le numéro est vide ou invalide.
 */
export function normalizePhoneE164(rawPhone, defaultCountryCode = '+243') {
  const raw = String(rawPhone || '').trim();
  if (!raw) return null;

  let cleaned = raw.replace(/^whatsapp:/i, '').replace(/[\s().-]+/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  const ccDigits = String(defaultCountryCode || '+243').replace(/\D/g, '') || '243';

  if (cleaned.startsWith('+')) {
    // Garder tel quel
  } else if (cleaned.startsWith(ccDigits) && cleaned.length >= ccDigits.length + 7) {
    cleaned = `+${cleaned}`;
  } else if (cleaned.startsWith('0') && cleaned.length >= 9) {
    cleaned = `+${ccDigits}${cleaned.slice(1)}`;
  } else if (/^\d{9}$/.test(cleaned)) {
    cleaned = `+${ccDigits}${cleaned}`;
  } else {
    return null;
  }
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}

export function isTwilioConfigured(env = process.env) {
  if (env.NODE_TEST_CONTEXT || env.FNPSS_DISABLE_MESSAGING === 'true') return false;
  const sid = String(env.TWILIO_ACCOUNT_SID || '').trim();
  const token = String(env.TWILIO_AUTH_TOKEN || '').trim();
  if (!sid || !token) return false;
  if (!sid.startsWith('AC') || sid.includes('votre_') || token.includes('votre_')) return false;
  return Boolean(String(env.TWILIO_WHATSAPP_FROM || '').trim() || String(env.TWILIO_SMS_FROM || '').trim());
}

export function isMetaWhatsAppConfigured(env = process.env) {
  if (env.NODE_TEST_CONTEXT || env.FNPSS_DISABLE_MESSAGING === 'true') return false;
  const token = String(env.META_WA_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(env.META_WA_PHONE_NUMBER_ID || '').trim();
  if (!token || !phoneNumberId) return false;
  if (token.includes('votre_') || phoneNumberId.includes('votre_')) return false;
  return /^\d{6,25}$/.test(phoneNumberId);
}

export function isMessagingConfigured(env = process.env) {
  return isMetaWhatsAppConfigured(env) || isTwilioConfigured(env);
}

/**
 * Construit un message court sans données sensibles ni mots de passe pour SMS / WhatsApp.
 */
export function buildShortMessagingText(
  eventType,
  {
    referenceNumber = '',
    details = {},
    baseUrl = (typeof process !== 'undefined' && process.env?.PUBLIC_APP_BASE_URL) || DEFAULT_APP_BASE_URL
  } = {}
) {
  const cleanBase = String(baseUrl || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
  const cert = details.certificateNumber || referenceNumber;
  const ref = referenceNumber || cert;

  const templates = {
    APPLICATION_SUBMITTED: `FNPSS Guichet Unique : Dossier ${ref} enregistre (${details.serviceCode || 'Demarche'}). Suivi : ${cleanBase}/dashboard`,
    PAYMENT_VALIDATED: `FNPSS : Quittance validee pour ${ref}. Delai SLA 10 jours ouvrables demarre. Suivi : ${cleanBase}/dashboard`,
    COMPLEMENT_REQUESTED: `FNPSS Action requise : Complement demande sur ${ref}. Consultez votre espace : ${cleanBase}/dashboard`,
    DIVISION_OPINION: `FNPSS : Avis technique emis sur ${ref}. Dossier transmis a la Direction Generale.`,
    CERTIFICATE_ISSUED: `FNPSS : Acte officiel ${cert} delivre et scelle Blockchain ! Verifier / QR Code : ${cleanBase}/verifier?cert=${encodeURIComponent(cert)}`,
    MINISTRY_COSIGNED: `FNPSS : Co-signature ministerielle apposee sur l'acte ${cert}. PDF actualise sur ${cleanBase}/dashboard`,
    CERTIFICATE_REVOKED: `FNPSS URGENT : L'acte ${cert} (${ref}) a ete REVOQUE. Consultez ${cleanBase}/verifier?cert=${encodeURIComponent(cert)}`,
    APPLICATION_REJECTED: `FNPSS : Decision defavorable rendue sur le dossier ${ref}. Consultez le motif sur ${cleanBase}/dashboard`,
    MESSAGING_TEST: `FNPSS Guichet Unique : Test WhatsApp/SMS reussi ! Plateforme operationnelle (${cleanBase}).`
  };

  return templates[eventType] || `FNPSS Guichet Unique : Mise a jour sur votre dossier ${ref} (${cleanBase}/dashboard).`;
}

/**
 * Envoie un message WhatsApp ou SMS via l'API REST Twilio.
 */
export async function sendTwilioMessage(
  { to, channel = 'whatsapp', body },
  env = process.env,
  fetchImpl = globalThis.fetch
) {
  if (!isTwilioConfigured(env)) {
    return { sent: false, skipped: true, channel, reason: 'TWILIO_NOT_CONFIGURED' };
  }
  const normalizedTo = normalizePhoneE164(to);
  if (!normalizedTo) {
    return { sent: false, skipped: true, channel, reason: 'INVALID_PHONE_NUMBER' };
  }
  if (typeof fetchImpl !== 'function') {
    return { sent: false, skipped: true, channel, reason: 'FETCH_UNAVAILABLE' };
  }

  const sid = String(env.TWILIO_ACCOUNT_SID).trim();
  const authToken = String(env.TWILIO_AUTH_TOKEN).trim();
  const useWhatsapp = channel === 'whatsapp';

  const rawFrom = useWhatsapp
    ? String(env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886').trim()
    : String(env.TWILIO_SMS_FROM || '').trim();

  if (!rawFrom) {
    return { sent: false, skipped: true, channel, reason: useWhatsapp ? 'MISSING_WHATSAPP_FROM' : 'MISSING_SMS_FROM' };
  }

  const fromParam = useWhatsapp
    ? (rawFrom.startsWith('whatsapp:') ? rawFrom : `whatsapp:${normalizePhoneE164(rawFrom) || rawFrom}`)
    : (normalizePhoneE164(rawFrom) || rawFrom);
  const toParam = useWhatsapp ? `whatsapp:${normalizedTo}` : normalizedTo;

  const form = new URLSearchParams({
    From: fromParam,
    To: toParam,
    Body: String(body || '').slice(0, 1500)
  });

  const credentials = Buffer.from(`${sid}:${authToken}`, 'utf8').toString('base64');
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        sent: false,
        channel,
        status: res.status,
        error: data?.message || `TWILIO_HTTP_${res.status}`,
        code: data?.code || null
      };
    }
    return {
      sent: true,
      channel,
      sid: data.sid || null,
      status: data.status || 'queued',
      to: toParam
    };
  } catch (err) {
    return {
      sent: false,
      channel,
      error: err?.message || 'TWILIO_NETWORK_ERROR'
    };
  }
}

/**
 * Envoie un message WhatsApp via l'API officielle Meta WhatsApp Cloud (Graph API).
 */
export async function sendMetaWhatsAppMessage(
  { to, body = '', mode = 'text', templateName = '', templateLang = '' },
  env = process.env,
  fetchImpl = globalThis.fetch
) {
  if (!isMetaWhatsAppConfigured(env)) {
    return { sent: false, skipped: true, provider: 'meta', channel: 'whatsapp', reason: 'META_WA_NOT_CONFIGURED' };
  }
  const normalizedTo = normalizePhoneE164(to);
  if (!normalizedTo) {
    return { sent: false, skipped: true, provider: 'meta', channel: 'whatsapp', reason: 'INVALID_PHONE_NUMBER' };
  }
  if (typeof fetchImpl !== 'function') {
    return { sent: false, skipped: true, provider: 'meta', channel: 'whatsapp', reason: 'FETCH_UNAVAILABLE' };
  }

  const token = String(env.META_WA_ACCESS_TOKEN).trim();
  const phoneNumberId = String(env.META_WA_PHONE_NUMBER_ID).trim();
  const apiVersion = String(env.META_WA_API_VERSION || 'v22.0').trim() || 'v22.0';
  const recipientDigits = normalizedTo.slice(1);
  const endpoint = `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;

  const useTemplate = mode === 'template' || Boolean(String(templateName || '').trim());
  let payload;
  if (useTemplate) {
    const resolvedTemplateName = String(templateName || env.META_WA_TEMPLATE_NAME || 'hello_world').trim();
    const resolvedTemplateLang = String(
      templateLang || env.META_WA_TEMPLATE_LANG || (resolvedTemplateName === 'hello_world' ? 'en_US' : 'fr')
    ).trim();
    payload = {
      messaging_product: 'whatsapp',
      to: recipientDigits,
      type: 'template',
      template: {
        name: resolvedTemplateName,
        language: { code: resolvedTemplateLang }
      }
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientDigits,
      type: 'text',
      text: {
        preview_url: false,
        body: String(body || '').slice(0, 4096)
      }
    };
  }

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        sent: false,
        provider: 'meta',
        channel: 'whatsapp',
        status: res.status,
        error: data?.error?.message || `META_HTTP_${res.status}`,
        code: data?.error?.code || null,
        subcode: data?.error?.error_subcode || null
      };
    }
    return {
      sent: true,
      provider: 'meta',
      channel: 'whatsapp',
      messageId: data?.messages?.[0]?.id || null,
      status: data?.messages?.[0]?.message_status || 'accepted',
      to: normalizedTo,
      mode: useTemplate ? 'template' : 'text'
    };
  } catch (err) {
    return {
      sent: false,
      provider: 'meta',
      channel: 'whatsapp',
      error: err?.message || 'META_NETWORK_ERROR'
    };
  }
}

/**
 * Envoie les notifications mobiles selon les préférences (opt-in WhatsApp / SMS) avec repli intelligent :
 * WhatsApp en priorité (Meta Cloud API ou Twilio) si activé -> SMS Twilio si activé ou en repli si échec WhatsApp (hors mode test dummy).
 */
export async function sendTransactionalMobileAlerts(
  {
    to,
    email = '',
    eventType,
    referenceNumber = '',
    details = {},
    preferences = {}
  },
  env = process.env,
  fetchImpl = globalThis.fetch
) {
  if (!isMessagingConfigured(env)) {
    return { sent: false, skipped: true, reason: 'MESSAGING_NOT_CONFIGURED', attempts: [] };
  }
  const normalizedPhone = normalizePhoneE164(to);
  if (!normalizedPhone) {
    return { sent: false, skipped: true, reason: 'INVALID_OR_MISSING_PHONE', attempts: [] };
  }
  if (isDummyDemoPhoneOrEmail(normalizedPhone, email) && env.FNPSS_SEND_DEMO_EMAILS !== 'true') {
    return { sent: false, skipped: true, reason: 'DEMO_RECIPIENT_SKIPPED', attempts: [] };
  }

  const prefProvider = String(env.MESSAGING_PROVIDER || 'auto').trim().toLowerCase();
  const metaReady = isMetaWhatsAppConfigured(env);
  const twilioReady = isTwilioConfigured(env);
  const twilioWaReady = twilioReady && Boolean(String(env.TWILIO_WHATSAPP_FROM || '').trim());
  const twilioSmsReady = twilioReady && Boolean(String(env.TWILIO_SMS_FROM || '').trim());

  let waProvider = null;
  if (prefProvider === 'twilio') {
    waProvider = twilioWaReady ? 'twilio' : null;
  } else if (prefProvider === 'meta') {
    waProvider = metaReady ? 'meta' : null;
  } else {
    waProvider = metaReady ? 'meta' : (twilioWaReady ? 'twilio' : null);
  }

  const isCriticalRevocation = eventType === 'CERTIFICATE_REVOKED';
  const wantsWhatsapp = Boolean(preferences?.whatsappEnabled) || (isCriticalRevocation && Boolean(waProvider));
  const wantsSms = Boolean(preferences?.smsEnabled) || (isCriticalRevocation && twilioSmsReady);

  if (!wantsWhatsapp && !wantsSms) {
    return { sent: false, skipped: true, reason: 'MOBILE_OPT_IN_DISABLED', attempts: [] };
  }

  const text = buildShortMessagingText(eventType, {
    referenceNumber,
    details,
    baseUrl: env.PUBLIC_APP_BASE_URL
  });

  const attempts = [];
  let whatsappSucceeded = false;

  if (wantsWhatsapp) {
    let waRes;
    if (waProvider === 'meta') {
      const metaMode = env.META_WA_MODE || 'text';
      waRes = await sendMetaWhatsAppMessage(
        {
          to: normalizedPhone,
          body: text,
          mode: metaMode,
          templateName: metaMode === 'template' ? (env.META_WA_TEMPLATE_NAME || 'hello_world') : '',
          templateLang: env.META_WA_TEMPLATE_LANG || ''
        },
        env,
        fetchImpl
      );
    } else if (waProvider === 'twilio') {
      waRes = await sendTwilioMessage({ to: normalizedPhone, channel: 'whatsapp', body: text }, env, fetchImpl);
    } else {
      waRes = { sent: false, skipped: true, channel: 'whatsapp', reason: 'NO_WHATSAPP_PROVIDER_CONFIGURED' };
    }
    attempts.push(waRes);
    whatsappSucceeded = Boolean(waRes.sent);
  }

  const shouldFallbackToSms = !whatsappSucceeded && twilioSmsReady && preferences?.smsFallback !== false;
  if ((wantsSms && twilioSmsReady) || (wantsWhatsapp && shouldFallbackToSms)) {
    const smsRes = await sendTwilioMessage({ to: normalizedPhone, channel: 'sms', body: text }, env, fetchImpl);
    attempts.push(smsRes);
  }

  return {
    sent: attempts.some((a) => a.sent),
    attempts
  };
}
