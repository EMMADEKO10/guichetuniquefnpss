/**
 * @fileoverview Templates HTML + Texte officiel pour tous les emails du Guichet Unique FNPSS (NOT-01).
 * Conforme à la charte graphique souveraine (#0a2540, #df5311, ruban RDC, slogan).
 * Aucun import Node natif pour permettre aussi la prévisualisation client dans /design-system.
 */

const DEFAULT_APP_BASE_URL = 'https://guichetuniquefnpss.vercel.app';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TONE_STYLES = {
  info: { bg: '#eff6ff', border: '#2563eb', text: '#1e40af', label: 'INFORMATION' },
  success: { bg: '#e6f4ea', border: '#137333', text: '#0d652d', label: 'VALIDÉ / SCELLÉ' },
  warning: { bg: '#fff7ed', border: '#df5311', text: '#9a3412', label: 'ACTION REQUISE' },
  danger: { bg: '#fce8e6', border: '#d93025', text: '#991b1b', label: 'ALERTE CRITIQUE' },
  brand: { bg: '#fff7ed', border: '#b83d08', text: '#9a3412', label: 'FNPSS OFFICIEL' }
};

export function renderBrandedEmailHtml({
  baseUrl = (typeof process !== 'undefined' && process.env?.PUBLIC_APP_BASE_URL) || DEFAULT_APP_BASE_URL,
  badgeTone = 'info',
  badgeText,
  title,
  greeting = 'Bonjour,',
  introParagraphs = [],
  alertBox = null,
  metadata = [],
  cta = null,
  footerNote = ''
}) {
  const cleanBase = String(baseUrl || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
  const tone = TONE_STYLES[badgeTone] || TONE_STYLES.info;
  const logoSrc = `${cleanBase}/brand/logo-fnpss.png`;

  const metadataRows = (metadata || [])
    .filter((item) => item && item.label && item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
    .map(
      (item, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
        <td style="padding:9px 12px;border-bottom:1px solid #dbe2ea;font-size:12.5px;color:#4b5563;font-weight:700;width:38%;vertical-align:top;">
          ${escapeHtml(item.label)}
        </td>
        <td style="padding:9px 12px;border-bottom:1px solid #dbe2ea;font-size:12.5px;color:#0a2540;font-weight:600;word-break:break-word;${item.mono ? 'font-family:Consolas,Monaco,monospace;font-size:11.5px;' : ''}">
          ${escapeHtml(item.value)}
        </td>
      </tr>`
    )
    .join('');

  const alertHtml = alertBox
    ? (() => {
        const at = TONE_STYLES[alertBox.tone || badgeTone] || tone;
        return `
        <div style="margin:16px 0;padding:12px 14px;border-radius:6px;background:${at.bg};border:1px solid ${at.border};border-left:4px solid ${at.border};color:${at.text};font-size:13px;line-height:1.5;">
          ${alertBox.title ? `<div style="font-weight:800;margin-bottom:4px;">${escapeHtml(alertBox.title)}</div>` : ''}
          <div>${escapeHtml(alertBox.message)}</div>
        </div>`;
      })()
    : '';

  const introHtml = (introParagraphs || [])
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#1f2937;">${escapeHtml(p)}</p>`
    )
    .join('');

  const ctaHtml = cta?.url
    ? `
    <div style="margin:22px 0 14px;text-align:left;">
      <a href="${escapeHtml(cta.url)}" target="_blank" rel="noreferrer" style="display:inline-block;background:${cta.color || '#065a82'};color:#ffffff;text-decoration:none;font-weight:700;font-size:13.5px;padding:11px 20px;border-radius:6px;">
        ${escapeHtml(cta.label || 'Accéder au Guichet Unique')}
      </a>
      <div style="margin-top:8px;font-size:11.5px;color:#4b5563;word-break:break-all;">
        Lien direct : <a href="${escapeHtml(cta.url)}" style="color:#065a82;">${escapeHtml(cta.url)}</a>
      </div>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f6f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dbe2ea;box-shadow:0 4px 16px rgba(10,37,64,0.08);">
          <!-- Ruban tricolore RDC -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="70%" style="height:5px;background:#007fff;font-size:0;line-height:0;">&nbsp;</td>
                  <td width="12%" style="height:5px;background:#f7d618;font-size:0;line-height:0;">&nbsp;</td>
                  <td width="18%" style="height:5px;background:#ce1021;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- En-tête institutionnel FNPSS -->
          <tr>
            <td style="background:#0a2540;padding:18px 24px;border-bottom:3px solid #0b4ea2;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="56" valign="middle">
                    <div style="width:46px;height:46px;background:#ffffff;border-radius:8px;border:2px solid #df5311;padding:3px;text-align:center;">
                      <img src="${escapeHtml(logoSrc)}" alt="Logo officiel FNPSS" width="38" height="38" style="display:block;border:0;margin:0 auto;" />
                    </div>
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="font-size:16px;font-weight:800;color:#ffffff;line-height:1.25;">Guichet Unique Dématérialisé — FNPSS</div>
                    <div style="font-size:12px;color:#f7d618;font-weight:600;margin-top:2px;">Fonds National de Promotion et de Service Social &bull; &laquo; Le social dans la solidarité &raquo;</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Corps du message -->
          <tr>
            <td style="padding:24px;">
              <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${tone.bg};border:1px solid ${tone.border};color:${tone.text};font-size:11px;font-weight:800;letter-spacing:0.04em;margin-bottom:10px;">
                ${escapeHtml(badgeText || tone.label)}
              </div>
              <h1 style="margin:0 0 14px;font-size:19px;line-height:1.3;color:#0a2540;">${escapeHtml(title)}</h1>
              <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#0a2540;">${escapeHtml(greeting)}</p>
              ${introHtml}
              ${alertHtml}
              ${
                metadataRows
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;border:1px solid #dbe2ea;border-radius:8px;border-collapse:collapse;">
                      ${metadataRows}
                    </table>`
                  : ''
              }
              ${ctaHtml}
              ${footerNote ? `<p style="margin:14px 0 0;font-size:12px;color:#4b5563;line-height:1.5;">${escapeHtml(footerNote)}</p>` : ''}
            </td>
          </tr>
          <!-- Pied de page souverain -->
          <tr>
            <td style="background:#f8fafc;padding:16px 24px;border-top:1px solid #dbe2ea;font-size:11.5px;color:#4b5563;line-height:1.5;">
              <div style="font-weight:700;color:#0a2540;margin-bottom:3px;">
                République Démocratique du Congo &bull; Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale
              </div>
              <div style="margin-bottom:4px;">
                Siège social FNPSS : Croisement Boulevard du 30 Juin &amp; Avenue Batetela, Kinshasa-Gombe, RDC &bull; contact@fnpss.org &bull; <a href="https://www.fnpss.org/" style="color:#0b4ea2;font-weight:600;">www.fnpss.org</a>
              </div>
              <div>
                FNPSS — Notification automatique du Guichet Unique conforme au Code du Numérique (Ordonnance-Loi n&deg; 23/010).
                Vérification publique : <a href="${escapeHtml(cleanBase)}/verifier" style="color:#0b4ea2;font-weight:600;">${escapeHtml(cleanBase)}/verifier</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWorkflowEmail(
  eventType,
  {
    referenceNumber = '',
    details = {},
    baseUrl = (typeof process !== 'undefined' && process.env?.PUBLIC_APP_BASE_URL) || DEFAULT_APP_BASE_URL
  } = {}
) {
  const cleanBase = String(baseUrl || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
  const org = details.organizationName || 'Organisation partenaire';
  const svc = details.serviceCode || '';

  const specs = {
    APPLICATION_SUBMITTED: () => {
      const subject = `[Guichet Unique FNPSS] Accusé de réception — Dossier ${referenceNumber}`;
      const text = `Bonjour ${org},\n\nVotre demande (${svc}) a bien été enregistrée sous la référence ${referenceNumber}.\nLe délai réglementaire de 10 jours ouvrables démarrera dès validation de votre quittance de frais (20 USD dépôt + 300 USD enquête).\n\nSuivi en direct : ${cleanBase}/dashboard`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'info',
        badgeText: 'ACCUSÉ DE RÉCEPTION',
        title: `Dossier ${referenceNumber} enregistré`,
        greeting: `Bonjour ${org},`,
        introParagraphs: [
          'Votre dossier a été réceptionné sur le Guichet Unique Dématérialisé du FNPSS.',
          'Notre service financier va contrôler votre bordereau de paiement (20 USD dépôt + 300 USD enquête) afin d’enclencher le compte à rebours légal de 10 jours ouvrables.'
        ],
        metadata: [
          { label: 'Référence du dossier', value: referenceNumber, mono: true },
          { label: 'Organisation requérante', value: org },
          { label: 'Procédure demandée', value: svc || 'Démarche FNPSS' },
          { label: 'Intitulé du projet', value: details.projectTitle }
        ],
        cta: { label: 'Suivre mon dossier & Télécharger l’Accusé', url: `${cleanBase}/dashboard`, color: '#065a82' }
      });
      return { subject, text, html };
    },

    PAYMENT_VALIDATED: () => {
      const subject = `[Guichet Unique FNPSS] Quittance validée (SLA 10 jours ouvrés) — ${referenceNumber}`;
      const text = `Bonjour ${org},\n\nVotre preuve de paiement pour le dossier ${referenceNumber} a été validée par le FNPSS. Le délai légal SLA de 10 jours ouvrables est enclenché (échéance : ${details.slaDueAt || '10 jours ouvrables'}).\n\nSuivi : ${cleanBase}/dashboard`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'success',
        badgeText: 'QUITTANCE VALIDÉE • SLA DÉMARRÉ',
        title: `Paiement confirmé pour ${referenceNumber}`,
        greeting: `Bonjour ${org},`,
        introParagraphs: [
          'La comptabilité du FNPSS a rapproché et validé votre quittance réglementaire (320 USD).',
          'Votre dossier est transmis à la Division technique compétente et le compteur réglementaire de 10 jours ouvrables est désormais actif.'
        ],
        metadata: [
          { label: 'Référence du dossier', value: referenceNumber, mono: true },
          { label: 'Organisation', value: org },
          { label: 'Échéance SLA (10 jours ouvrables)', value: details.slaDueAt || 'En cours de calcul' }
        ],
        cta: { label: 'Consulter l’avancement SLA', url: `${cleanBase}/dashboard`, color: '#137333' }
      });
      return { subject, text, html };
    },

    COMPLEMENT_REQUESTED: () => {
      const subject = `[Guichet Unique FNPSS] Action requise : Complément sur le dossier ${referenceNumber}`;
      const reason = details.reason || 'Pièce justificative complémentaire attendue dans votre tableau de bord.';
      const text = `Bonjour ${org},\n\nLe service instructeur du FNPSS demande un complément sur le dossier ${referenceNumber}.\nMotif : ${reason}\nLe décompte SLA est suspendu jusqu’au dépôt de la pièce demandée : ${cleanBase}/dashboard`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'warning',
        badgeText: 'COMPLÉMENT REQUIS • SLA EN PAUSE',
        title: `Action requise sur le dossier ${referenceNumber}`,
        greeting: `Bonjour ${org},`,
        introParagraphs: [
          'Lors du contrôle de recevabilité, un instructeur du FNPSS a relevé qu’une pièce ou précision complémentaire est nécessaire pour poursuivre l’instruction.'
        ],
        alertBox: {
          tone: 'warning',
          title: 'Motif indiqué par l’instructeur FNPSS',
          message: reason
        },
        metadata: [
          { label: 'Référence du dossier', value: referenceNumber, mono: true },
          { label: 'État du compteur SLA', value: 'Temporairement suspendu jusqu’au dépôt' }
        ],
        cta: { label: 'Fournir la pièce complémentaire', url: `${cleanBase}/dashboard`, color: '#b83d08' }
      });
      return { subject, text, html };
    },

    DIVISION_OPINION: () => {
      const favorable = details.favorable !== false;
      const subject = `[Guichet Unique FNPSS] Avis technique émis (${favorable ? 'Favorable' : 'Avec réserves'}) — ${referenceNumber}`;
      const note = details.opinionNote || details.reason || (favorable ? 'Avis technique favorable transmis à la Direction Générale.' : 'Avis avec réserves transmis à la Direction Générale.');
      const text = `Bonjour ${org},\n\nLe Chef de Division compétent a émis un avis technique sur le dossier ${referenceNumber}.\nSens : ${favorable ? 'Favorable' : 'Avec réserves'}\nObservation : ${note}\nLe dossier est transmis pour décision finale de la Direction Générale : ${cleanBase}/dashboard`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: favorable ? 'info' : 'warning',
        badgeText: favorable ? 'AVIS TECHNIQUE FAVORABLE' : 'AVIS AVEC RÉSERVES',
        title: `Avis de Division émis pour ${referenceNumber}`,
        greeting: `Bonjour ${org},`,
        introParagraphs: [
          'L’examen technique au fond de votre dossier est terminé. Le dossier est maintenant transmis à la Direction Générale du FNPSS pour décision finale.'
        ],
        alertBox: {
          tone: favorable ? 'info' : 'warning',
          title: `Sens de l’avis : ${favorable ? 'Favorable' : 'Avec réserves'}`,
          message: note
        },
        metadata: [
          { label: 'Référence du dossier', value: referenceNumber, mono: true },
          { label: 'Organisation', value: org },
          { label: 'Prochaine étape', value: 'Signature & scellement par la Direction Générale' }
        ],
        cta: { label: 'Suivre la décision finale', url: `${cleanBase}/dashboard`, color: '#065a82' }
      });
      return { subject, text, html };
    },

    CERTIFICATE_ISSUED: () => {
      const certNum = details.certificateNumber || referenceNumber;
      const verifyUrl = details.qrVerificationUrl || `${cleanBase}/verifier?hash=${encodeURIComponent(details.docHash || certNum)}&cert=${encodeURIComponent(certNum)}`;
      const subject = `[Guichet Unique FNPSS] Acte officiel délivré & scellé — ${certNum}`;
      const text = `Bonjour ${org},\n\nVotre acte officiel ${certNum} (dossier ${referenceNumber}) a été signé par la Direction Générale et scellé par empreinte SHA-256 sur Polygon.\nEmpreinte SHA-256 : ${details.docHash || ''}\nVérification publique / QR Code : ${verifyUrl}`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'success',
        badgeText: 'ACTE DÉLIVRÉ & SCELLÉ BLOCKCHAIN',
        title: `Votre attestation officielle ${certNum} est disponible`,
        greeting: `Bonjour ${org},`,
        introParagraphs: [
          'La Direction Générale du FNPSS a approuvé votre dossier. Votre acte officiel PDF revêtu du QR Code douanier DGDA et son empreinte SHA-256 ont été scellés sur le registre Polygon.'
        ],
        metadata: [
          { label: 'N° Officiel d’Acte', value: certNum, mono: true },
          { label: 'Référence du dossier', value: referenceNumber, mono: true },
          { label: 'Organisation bénéficiaire', value: org },
          { label: 'Empreinte SHA-256', value: details.docHash || 'Enregistrée', mono: true },
          { label: 'Preuve Polygon', value: details.explorerTxUrl || 'Registre FNPSSRegistry.sol', mono: true }
        ],
        cta: { label: 'Télécharger mon PDF & QR Code', url: `${cleanBase}/dashboard`, color: '#137333' },
        footerNote: `Lien public de contrôle douanier (DGDA / DGI / DGRAD) : ${verifyUrl}`
      });
      return { subject, text, html };
    },

    MINISTRY_COSIGNED: () => {
      const certNum = details.certificateNumber || referenceNumber;
      const minRef = details.ministryReference || 'Contre-seing ministériel enregistré';
      const subject = `[Guichet Unique FNPSS] Co-signature ministérielle apposée — ${certNum}`;
      const text = `Bonjour ${org},\n\nLe Ministère de Tutelle a apposé sa co-signature officielle (${minRef}) sur votre acte ${certNum} (dossier ${referenceNumber}).\nVotre PDF actualisé est disponible sur : ${cleanBase}/dashboard`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'success',
        badgeText: 'CO-SIGNÉ PAR LE MINISTÈRE',
        title: `Co-signature ministérielle enregistrée (${certNum})`,
        greeting: `Bonjour ${org},`,
        introParagraphs: [
          'Le Point Focal du Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale a apposé la co-signature réglementaire sur votre acte officiel.'
        ],
        metadata: [
          { label: 'N° Officiel d’Acte', value: certNum, mono: true },
          { label: 'Référence Arrêté / Convention', value: minRef, mono: true },
          { label: 'Preuve Co-signature', value: details.ministryExplorerTxUrl || 'Horodatée sur FNPSSRegistry.sol', mono: true }
        ],
        cta: { label: 'Télécharger l’acte co-signé', url: `${cleanBase}/dashboard`, color: '#137333' }
      });
      return { subject, text, html };
    },

    CERTIFICATE_REVOKED: () => {
      const certNum = details.certificateNumber || referenceNumber;
      const reason = details.reason || 'Révocation administrative prononcée par la Direction Générale.';
      const subject = `[Guichet Unique FNPSS] URGENT : Révocation d'acte — ${certNum}`;
      const text = `Notification officielle,\n\nL’acte officiel ${certNum} (dossier ${referenceNumber}) a été formellement révoqué par la Direction Générale du FNPSS.\nMotif : ${reason}\nLes régies financières (DGDA, DGRAD, DGI) et le registre public de vérification affichent désormais une Pastille Rouge.`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'danger',
        badgeText: 'ALERTE • ACTE RÉVOQUÉ',
        title: `Révocation formelle de l’acte ${certNum}`,
        greeting: 'Notification officielle FNPSS,',
        introParagraphs: [
          'La Direction Générale du FNPSS a prononcé la révocation immédiate de l’attestation mentionnée ci-dessous.',
          'Les régies financières (DGDA, DGI, DGRAD) et le portail public de vérification affichent désormais cet acte en Pastille Rouge (non utilisable).'
        ],
        alertBox: {
          tone: 'danger',
          title: 'Motif officiel de révocation',
          message: reason
        },
        metadata: [
          { label: 'N° Officiel d’Acte', value: certNum, mono: true },
          { label: 'Référence du dossier', value: referenceNumber, mono: true },
          { label: 'Organisation concernée', value: org }
        ],
        cta: { label: 'Vérifier le statut public', url: `${cleanBase}/verifier?cert=${encodeURIComponent(certNum)}`, color: '#d93025' }
      });
      return { subject, text, html };
    },

    APPLICATION_REJECTED: () => {
      const reason = details.reason || 'Dossier non conforme aux dispositions réglementaires.';
      const subject = `[Guichet Unique FNPSS] Décision motivée — Rejet du dossier ${referenceNumber}`;
      const text = `Bonjour ${org},\n\nAprès instruction, votre demande ${referenceNumber} n’a pas pu être approuvée.\nMotif officiel : ${reason}\nVous pouvez corriger les éléments relevés et déposer une nouvelle demande depuis ${cleanBase}/applications/new.`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'danger',
        badgeText: 'DÉCISION DÉFAVORABLE',
        title: `Décision motivée sur le dossier ${referenceNumber}`,
        greeting: `Bonjour ${org},`,
        introParagraphs: [
          'Après examen complet par les services techniques et la Direction Générale du FNPSS, une décision défavorable a été rendue sur votre demande.'
        ],
        alertBox: {
          tone: 'danger',
          title: 'Motif officiel de rejet',
          message: reason
        },
        metadata: [
          { label: 'Référence du dossier', value: referenceNumber, mono: true },
          { label: 'Organisation', value: org }
        ],
        cta: { label: 'Déposer une demande corrigée', url: `${cleanBase}/applications/new`, color: '#065a82' }
      });
      return { subject, text, html };
    },

    PASSWORD_RESET: () => {
      const resetToken = details.resetToken || '';
      const resetUrl = `${cleanBase}/auth/reset-password${resetToken ? `?token=${encodeURIComponent(resetToken)}` : ''}`;
      const subject = '[Guichet Unique FNPSS] Réinitialisation de votre mot de passe';
      const text = `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe sur le Guichet Unique FNPSS.\nCode / Jeton de réinitialisation (valide 15 minutes) : ${resetToken}\nLien direct : ${resetUrl}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'brand',
        badgeText: 'SÉCURITÉ DU COMPTE',
        title: 'Réinitialisation de votre mot de passe',
        greeting: 'Bonjour,',
        introParagraphs: [
          'Une demande de réinitialisation de mot de passe a été initiée pour votre compte Guichet Unique FNPSS.',
          'Utilisez le bouton ci-dessous ou recopiez le jeton à usage unique dans le formulaire (validité : 15 minutes).'
        ],
        metadata: [
          { label: 'Jeton à usage unique', value: resetToken || '(fourni sur demande)', mono: true },
          { label: 'Durée de validité', value: '15 minutes' }
        ],
        cta: { label: 'Définir un nouveau mot de passe', url: resetUrl, color: '#b83d08' },
        footerNote: 'Si vous n’êtes pas à l’origine de cette demande, aucune action n’est requise et votre mot de passe actuel reste inchangé.'
      });
      return { subject, text, html };
    },

    SMTP_TEST: () => {
      const subject = '[Guichet Unique FNPSS] Test de messagerie officielle réussi';
      const text = `Bonjour,\n\nCeci est un message officiel confirmant le bon fonctionnement du serveur SMTP SSL du Guichet Unique Dématérialisé FNPSS.\n\nPortail : ${cleanBase}`;
      const html = renderBrandedEmailHtml({
        baseUrl: cleanBase,
        badgeTone: 'success',
        badgeText: 'TEST SMTP VALIDÉ',
        title: 'Messagerie transactionnelle FNPSS opérationnelle',
        greeting: 'Bonjour,',
        introParagraphs: [
          'Ceci est un message de diagnostic confirmant que le transport SMTP SSL (Port 465) et les gabarits HTML/Texte du Guichet Unique FNPSS sont parfaitement configurés.'
        ],
        metadata: [
          { label: 'Base de données', value: 'Neon PostgreSQL Serverless' },
          { label: 'Coffre-fort pièces', value: 'Cloudinary (AES-256-GCM)' },
          { label: 'Registre Blockchain', value: 'Polygon Amoy (FNPSSRegistry.sol)' },
          { label: 'Format des emails', value: 'MIME multipart/alternative (HTML + Texte)' }
        ],
        cta: { label: 'Ouvrir le Guichet Unique FNPSS', url: cleanBase, color: '#065a82' }
      });
      return { subject, text, html };
    }
  };

  const factory = specs[eventType];
  if (!factory) return null;
  return factory();
}
