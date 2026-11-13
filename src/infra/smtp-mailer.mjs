/**
 * @fileoverview Client SMTP SSL/TLS natif sans dépendance externe (NOT-01).
 * Utilise le port 465 (SSL direct Gmail/Brevo) éprouvé en production sans timeout STARTTLS.
 */

import tls from 'node:tls';

const DEMO_DUMMY_DOMAINS = ['@ong-rdc.org', '@espoir-kivu.org', '@fnpss.cd', '@example.com', '@test.local'];

export function isSmtpConfigured(env = process.env) {
  if (env.NODE_TEST_CONTEXT || env.FNPSS_DISABLE_SMTP === 'true') return false;
  const user = (env.SMTP_USER || '').trim();
  const pass = (env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!user || !pass) return false;
  if (user.includes('votre_adresse') || pass.includes('votre_code')) return false;
  return true;
}

function isDummyDemoRecipient(email) {
  const low = String(email || '').trim().toLowerCase();
  return DEMO_DUMMY_DOMAINS.some(dom => low.endsWith(dom));
}

function encodeUtf8Header(str) {
  return `=?UTF-8?B?${Buffer.from(String(str || ''), 'utf8').toString('base64')}?=`;
}

/**
 * Envoie un email transactionnel via TLS direct (port 465).
 * Ne bloque jamais si la configuration est absente ou si le destinataire est un domaine fictif de démonstration.
 */
export async function sendSmtpEmail({ to, subject, text }, env = process.env) {
  if (!isSmtpConfigured(env)) {
    return { sent: false, skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }
  const recipient = String(to || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return { sent: false, skipped: true, reason: 'INVALID_RECIPIENT' };
  }
  if (isDummyDemoRecipient(recipient) && env.FNPSS_SEND_DEMO_EMAILS !== 'true') {
    return { sent: false, skipped: true, reason: 'DEMO_DOMAIN_SKIPPED' };
  }

  const host = (env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(env.SMTP_PORT || '465', 10) === 465 ? 465 : 465;
  const user = env.SMTP_USER.trim();
  const pass = env.SMTP_PASS.replace(/\s+/g, '');
  const from = (env.SMTP_FROM || user).trim();

  return new Promise(resolve => {
    let settled = false;
    const finish = res => {
      if (!settled) {
        settled = true;
        resolve(res);
      }
    };

    const socket = tls.connect(port, host, { servername: host });
    let state = 'CONNECTED';
    let buffer = '';

    socket.on('data', data => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = line.slice(0, 3);
        const isLast = line[3] === ' ';

        if (state === 'CONNECTED' && code === '220' && isLast) {
          state = 'EHLO';
          socket.write('EHLO guichetuniquefnpss.vercel.app\r\n');
        } else if (state === 'EHLO' && code === '250' && isLast) {
          state = 'AUTH_LOGIN';
          socket.write('AUTH LOGIN\r\n');
        } else if (state === 'AUTH_LOGIN' && code === '334') {
          state = 'AUTH_USER';
          socket.write(`${Buffer.from(user).toString('base64')}\r\n`);
        } else if (state === 'AUTH_USER' && code === '334') {
          state = 'AUTH_PASS';
          socket.write(`${Buffer.from(pass).toString('base64')}\r\n`);
        } else if (state === 'AUTH_PASS') {
          if (code === '235') {
            state = 'MAIL_FROM';
            socket.write(`MAIL FROM:<${from}>\r\n`);
          } else {
            socket.destroy();
            return finish({ sent: false, error: `AUTH_FAILED: ${line}` });
          }
        } else if (state === 'MAIL_FROM' && code === '250') {
          state = 'RCPT_TO';
          socket.write(`RCPT TO:<${recipient}>\r\n`);
        } else if (state === 'RCPT_TO' && code === '250') {
          state = 'DATA';
          socket.write('DATA\r\n');
        } else if (state === 'DATA' && code === '354') {
          state = 'DATA_CONTENT';
          const mimeMsg = [
            `From: Guichet Unique FNPSS <${from}>`,
            `To: <${recipient}>`,
            `Subject: ${encodeUtf8Header(subject)}`,
            `Date: ${new Date().toUTCString()}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=utf-8`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            String(text || '').replace(/\r?\n/g, '\r\n')
          ].join('\r\n');
          socket.write(`${mimeMsg}\r\n.\r\n`);
        } else if (state === 'DATA_CONTENT' && code === '250') {
          socket.write('QUIT\r\n');
          socket.end();
          return finish({ sent: true, to: recipient, provider: host });
        } else if (parseInt(code, 10) >= 400) {
          socket.destroy();
          return finish({ sent: false, error: `SMTP_ERROR: ${line}` });
        }
      }
    });

    socket.on('error', err => finish({ sent: false, error: err.message }));
    socket.setTimeout(10000, () => {
      socket.destroy();
      finish({ sent: false, error: 'SMTP_TIMEOUT' });
    });
  });
}

const WORKFLOW_EMAIL_TEMPLATES = {
  APPLICATION_SUBMITTED: ({ referenceNumber, details }) => ({
    subject: `[Guichet Unique FNPSS] Accusé de réception — Dossier ${referenceNumber}`,
    text: `Bonjour,\n\nVotre demande d'acte pour "${details.organizationName || 'Organisation'}" a bien été déposée sous la référence ${referenceNumber} (Service ${details.serviceCode || ''}).\n\nSuivez l'avancement depuis votre tableau de bord : https://guichetuniquefnpss.vercel.app/dashboard`
  }),
  PAYMENT_VALIDATED: ({ referenceNumber, details }) => ({
    subject: `[Guichet Unique FNPSS] Quittance validée (SLA 10 jours ouvrés) — ${referenceNumber}`,
    text: `Bonjour,\n\nLa quittance de paiement du dossier ${referenceNumber} a été validée par le FNPSS. Le délai légal d'instruction SLA de 10 jours ouvrés est enclenché (échéance : ${details.slaDueAt || 'non précisée'}).\n\nCordialement,\nFNPSS — Guichet Unique`
  }),
  COMPLEMENT_REQUESTED: ({ referenceNumber, details }) => ({
    subject: `[Guichet Unique FNPSS] Complément requis — Dossier ${referenceNumber}`,
    text: `Bonjour,\n\nLe service instructeur du FNPSS demande un complément de pièce pour le dossier ${referenceNumber}.\nMotif : ${details.reason || 'À préciser dans votre espace'}.\nLe décompte SLA est suspendu jusqu'au dépôt de la pièce.`
  }),
  CERTIFICATE_ISSUED: ({ referenceNumber, details }) => ({
    subject: `[Guichet Unique FNPSS] Acte officiel délivré & scellé — ${details.certificateNumber || referenceNumber}`,
    text: `Bonjour,\n\nVotre acte officiel ${details.certificateNumber || ''} (dossier ${referenceNumber}) a été validé par la Direction Générale et scellé cryptographiquement.\nEmpreinte SHA-256 : ${details.docHash || ''}\n${details.explorerTxUrl ? `Preuve Polygon : ${details.explorerTxUrl}\n` : ''}Vérification publique : https://guichetuniquefnpss.vercel.app/verifier`
  }),
  CERTIFICATE_REVOKED: ({ referenceNumber, details }) => ({
    subject: `[Guichet Unique FNPSS] URGENT : Révocation d'acte — ${details.certificateNumber || referenceNumber}`,
    text: `Bonjour,\n\nL'acte officiel ${details.certificateNumber || ''} (dossier ${referenceNumber}) a été révoqué par la Direction Générale du FNPSS.\nMotif : ${details.reason || 'Révocation administrative'}.\nLes régies DGDA / DGRAD / DGI et le registre de vérification ont été notifiés.`
  }),
  APPLICATION_REJECTED: ({ referenceNumber, details }) => ({
    subject: `[Guichet Unique FNPSS] Décision motivée — Rejet du dossier ${referenceNumber}`,
    text: `Bonjour,\n\nVotre demande ${referenceNumber} n'a pas pu être approuvée.\nMotif officiel : ${details.reason || 'Non précisé'}.\n\nCordialement,\nDirection Générale du FNPSS`
  })
};

/**
 * Formate et envoie un email transactionnel lié à une étape du workflow FNPSS.
 */
export async function sendTransactionalWorkflowEmail({ to, eventType, referenceNumber, details = {} }, env = process.env) {
  const builder = WORKFLOW_EMAIL_TEMPLATES[eventType];
  if (!builder) return { sent: false, skipped: true, reason: 'UNKNOWN_EVENT_TYPE' };
  const { subject, text } = builder({ referenceNumber, details });
  return sendSmtpEmail({ to, subject, text }, env);
}
