/**
 * @fileoverview Script CLI unifié de test WhatsApp (Meta Cloud API / Twilio) + SMS (Twilio).
 * Usage :
 *   npm run whatsapp:test -- --to=+243821355601 --template=hello_world
 *   npm run whatsapp:test -- --to=+243821355601
 *   npm run messaging:test -- --to=+243821355601 --channel=whatsapp --provider=meta
 *   npm run messaging:test -- --to=+243821355601 --channel=sms --provider=twilio
 */
import fs from 'node:fs';
import {
  buildShortMessagingText,
  isMetaWhatsAppConfigured,
  isTwilioConfigured,
  normalizePhoneE164,
  sendMetaWhatsAppMessage,
  sendTwilioMessage
} from '../src/infra/messaging-client.mjs';

function parseEnv() {
  if (!fs.existsSync('.env')) return { ...process.env };
  const content = fs.readFileSync('.env', 'utf8');
  const env = { ...process.env };
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const clean = arg.replace(/^--/, '');
    const idx = clean.indexOf('=');
    if (idx === -1) return [clean, 'true'];
    return [clean.slice(0, idx), clean.slice(idx + 1)];
  })
);

const env = parseEnv();
const rawTo = args.to || env.MESSAGING_TEST_TO || env.TWILIO_TEST_TO || '';
const channelArg = (args.channel || 'whatsapp').toLowerCase();
const providerArg = (args.provider || env.MESSAGING_PROVIDER || 'auto').toLowerCase();
const templateArg = args.template || '';
const langArg = args.lang || '';
const modeArg = args.mode || (templateArg ? 'template' : 'text');

const normalized = normalizePhoneE164(rawTo);
if (!normalized) {
  console.error('[MESSAGING-TEST] Veuillez indiquer un numero destinataire valide : --to=+243XXXXXXXXX');
  process.exit(1);
}

const metaReady = isMetaWhatsAppConfigured(env);
const twilioReady = isTwilioConfigured(env);

if (!metaReady && !twilioReady) {
  console.error('[MESSAGING-TEST] Aucun fournisseur configure dans .env.');
  console.error('[MESSAGING-TEST] Variables requises pour Meta WhatsApp Cloud API (0 $) :');
  console.error('  - META_WA_ACCESS_TOKEN');
  console.error('  - META_WA_PHONE_NUMBER_ID');
  console.error('[MESSAGING-TEST] (Ou pour Twilio : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM / TWILIO_SMS_FROM)');
  process.exit(1);
}

const channels = channelArg === 'both' ? ['whatsapp', 'sms'] : [channelArg];
const body = buildShortMessagingText('MESSAGING_TEST', { baseUrl: env.PUBLIC_APP_BASE_URL });

let allOk = true;
for (const ch of channels) {
  if (ch === 'whatsapp') {
    let resolvedWaProvider = providerArg;
    if (resolvedWaProvider === 'auto') {
      resolvedWaProvider = metaReady ? 'meta' : 'twilio';
    }

    if (resolvedWaProvider === 'meta') {
      console.log(`[MESSAGING-TEST] Envoi WHATSAPP [META] (${modeArg}${templateArg ? `=${templateArg}` : ''}) vers ${normalized}...`);
      const res = await sendMetaWhatsAppMessage(
        {
          to: normalized,
          body,
          mode: modeArg,
          templateName: templateArg,
          templateLang: langArg
        },
        env
      );
      if (res.sent) {
        console.log(`[MESSAGING-TEST] SUCCES WHATSAPP [META] : ID=${res.messageId} (statut=${res.status}, mode=${res.mode})`);
        if (res.mode === 'text') {
          console.log('[MESSAGING-TEST] Note : si le message texte libre n\'apparait pas sur WhatsApp, envoyez d\'abord --template=hello_world et repondez "OK" sur votre telephone pour ouvrir la fenetre 24h Meta.');
        }
      } else {
        allOk = false;
        console.error(`[MESSAGING-TEST] ECHEC WHATSAPP [META] : ${res.error || res.reason}${res.code ? ` (code=${res.code})` : ''}`);
        if (res.code === 190) {
          console.error('[MESSAGING-TEST] Conseil : votre META_WA_ACCESS_TOKEN temporaire (24h) a expire ou est invalide. Generez un nouveau jeton dans Meta for Developers.');
        } else if (res.code === 131030) {
          console.error('[MESSAGING-TEST] Conseil : ajoutez ce numero dans la liste "To / Gerer la liste des numeros de telephone" de l\'onglet WhatsApp -> API Setup dans Meta for Developers.');
        }
      }
      continue;
    }

    console.log(`[MESSAGING-TEST] Envoi WHATSAPP [TWILIO] vers ${normalized}...`);
    const res = await sendTwilioMessage({ to: normalized, channel: 'whatsapp', body }, env);
    if (res.sent) {
      console.log(`[MESSAGING-TEST] SUCCES WHATSAPP [TWILIO] : SID=${res.sid} (statut=${res.status})`);
    } else {
      allOk = false;
      console.error(`[MESSAGING-TEST] ECHEC WHATSAPP [TWILIO] : ${res.error || res.reason}`);
    }
  } else {
    console.log(`[MESSAGING-TEST] Envoi SMS [TWILIO] vers ${normalized}...`);
    const res = await sendTwilioMessage({ to: normalized, channel: 'sms', body }, env);
    if (res.sent) {
      console.log(`[MESSAGING-TEST] SUCCES SMS [TWILIO] : SID=${res.sid} (statut=${res.status})`);
    } else {
      allOk = false;
      console.error(`[MESSAGING-TEST] ECHEC SMS [TWILIO] : ${res.error || res.reason}`);
    }
  }
}

process.exit(allOk ? 0 : 1);
