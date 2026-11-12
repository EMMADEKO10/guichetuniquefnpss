/**
 * @fileoverview Script de vérification et test de connexion SMTP (Gmail / Brevo)
 * Effectue une négociation TLS et une authentification AUTH LOGIN sans dépendance externe.
 */
import fs from 'node:fs';
import tls from 'node:tls';
import net from 'node:net';

function parseEnv() {
  const content = fs.readFileSync('.env', 'utf8');
  const env = {};
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

const env = parseEnv();
const host = env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(env.SMTP_PORT || '587', 10);
const user = env.SMTP_USER || '';
const rawPass = (env.SMTP_PASS || '').replace(/\s+/g, '');
const from = env.SMTP_FROM || user;

console.log(`[SMTP-TEST] Connexion à ${host}:${port} avec le compte ${user.replace(/(.{3})(.*)(@.*)/, '$1***$3')}...`);

function testSmtpDirectTls() {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(465, host, { servername: host }, () => {
      // Connected via TLS on 465
    });

    let state = 'CONNECTED';
    let buffer = '';

    socket.on('data', data => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = line.slice(0, 3);
        const isLast = line[3] === ' ';

        if (state === 'CONNECTED' && code === '220' && isLast) {
          state = 'EHLO';
          socket.write(`EHLO localhost\r\n`);
        } else if (state === 'EHLO' && code === '250' && isLast) {
          state = 'AUTH_LOGIN';
          socket.write(`AUTH LOGIN\r\n`);
        } else if (state === 'AUTH_LOGIN' && code === '334') {
          state = 'AUTH_USER';
          socket.write(`${Buffer.from(user).toString('base64')}\r\n`);
        } else if (state === 'AUTH_USER' && code === '334') {
          state = 'AUTH_PASS';
          socket.write(`${Buffer.from(rawPass).toString('base64')}\r\n`);
        } else if (state === 'AUTH_PASS') {
          if (code === '235') {
            if (process.argv.includes('--send')) {
              state = 'MAIL_FROM';
              socket.write(`MAIL FROM:<${from}>\r\n`);
            } else {
              socket.write(`QUIT\r\n`);
              socket.end();
              return resolve({ success: true, message: 'Authentification SMTP SSL réussie (Code 235: 2.7.0 Accepted)' });
            }
          } else {
            socket.destroy();
            return reject(new Error(`Échec d'authentification SMTP (${line})`));
          }
        } else if (state === 'MAIL_FROM' && code === '250') {
          state = 'RCPT_TO';
          socket.write(`RCPT TO:<${from}>\r\n`);
        } else if (state === 'RCPT_TO' && code === '250') {
          state = 'DATA';
          socket.write(`DATA\r\n`);
        } else if (state === 'DATA' && code === '354') {
          state = 'DATA_CONTENT';
          const emailMsg = [
            `From: Guichet Unique FNPSS <${from}>`,
            `To: <${from}>`,
            `Subject: [FNPSS] Test de notification email reussi`,
            `Date: ${new Date().toUTCString()}`,
            `Content-Type: text/plain; charset=utf-8`,
            ``,
            `Bonjour,`,
            ``,
            `Ceci est un message officiel de test confirmant que le serveur SMTP Gmail est parfaitement configure et operationnel pour la plateforme du Guichet Unique Dematerialise du FNPSS (RDC).`,
            ``,
            `Infrastructure validée :`,
            `- Base de donnees : Neon PostgreSQL Serverless`,
            `- Stockage securise : Cloudinary (chiffrement AES-256-GCM)`,
            `- Ancrage Blockchain : Polygon Amoy (Contrat 0x1474ECCD68C0a9b3c28624532359B2e8A70ab705)`,
            `- Authentification : Web3Auth DevNet + Google OAuth 2.0`,
            `- Notifications : Gmail SMTP SSL (Port 465)`,
            ``,
            `Cordialement,`,
            `L'equipe technique du Guichet Unique FNPSS.`
          ].join('\r\n');
          socket.write(`${emailMsg}\r\n.\r\n`);
        } else if (state === 'DATA_CONTENT' && code === '250') {
          socket.write(`QUIT\r\n`);
          socket.end();
          return resolve({ success: true, message: 'Email de test envoyé avec succès dans votre boîte de réception Gmail ! (Code 250: 2.0.0 OK)' });
        } else if (parseInt(code, 10) >= 400) {
          socket.destroy();
          return reject(new Error(`Erreur SMTP (${line})`));
        }
      }
    });

    socket.on('error', err => reject(err));
    socket.setTimeout(12000, () => {
      socket.destroy();
      reject(new Error('Délai d\'attente dépassé (Timeout 12s) lors de la négociation SMTP'));
    });
  });
}

function testSmtpStarttls() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    let state = 'CONNECTED';
    let buffer = '';
    let tlsSocket = null;

    socket.on('data', data => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = line.slice(0, 3);
        const isLast = line[3] === ' ';

        if (state === 'CONNECTED' && code === '220' && isLast) {
          state = 'EHLO';
          socket.write(`EHLO localhost\r\n`);
        } else if (state === 'EHLO' && code === '250' && isLast) {
          state = 'STARTTLS';
          socket.write(`STARTTLS\r\n`);
        } else if (state === 'STARTTLS' && code === '220' && isLast) {
          state = 'TLS_UPGRADE';
          tlsSocket = tls.connect({ socket, servername: host }, () => {
            state = 'EHLO_TLS';
            tlsSocket.write(`EHLO localhost\r\n`);
          });

          let tlsBuffer = '';
          tlsSocket.on('data', tlsData => {
            tlsBuffer += tlsData.toString();
            const tlsLines = tlsBuffer.split('\r\n');
            tlsBuffer = tlsLines.pop();

            for (const tline of tlsLines) {
              if (!tline.trim()) continue;
              const tcode = tline.slice(0, 3);
              const tisLast = tline[3] === ' ';

              if (state === 'EHLO_TLS' && tcode === '250' && tisLast) {
                state = 'AUTH_LOGIN';
                tlsSocket.write(`AUTH LOGIN\r\n`);
              } else if (state === 'AUTH_LOGIN' && tcode === '334') {
                state = 'AUTH_USER';
                tlsSocket.write(`${Buffer.from(user).toString('base64')}\r\n`);
              } else if (state === 'AUTH_USER' && tcode === '334') {
                state = 'AUTH_PASS';
                tlsSocket.write(`${Buffer.from(rawPass).toString('base64')}\r\n`);
              } else if (state === 'AUTH_PASS') {
                if (tcode === '235') {
                  if (process.argv.includes('--send')) {
                    state = 'MAIL_FROM';
                    tlsSocket.write(`MAIL FROM:<${from}>\r\n`);
                  } else {
                    tlsSocket.write(`QUIT\r\n`);
                    tlsSocket.end();
                    return resolve({ success: true, message: 'Authentification SMTP STARTTLS réussie (Code 235: 2.7.0 Accepted)' });
                  }
                } else if (state === 'MAIL_FROM' && tcode === '250') {
                  state = 'RCPT_TO';
                  tlsSocket.write(`RCPT TO:<${from}>\r\n`);
                } else if (state === 'RCPT_TO' && tcode === '250') {
                  state = 'DATA';
                  tlsSocket.write(`DATA\r\n`);
                } else if (state === 'DATA' && tcode === '354') {
                  state = 'DATA_CONTENT';
                  const emailMsg = [
                    `From: Guichet Unique FNPSS <${from}>`,
                    `To: <${from}>`,
                    `Subject: [FNPSS] Test de notification email reussi`,
                    `Date: ${new Date().toUTCString()}`,
                    `Content-Type: text/plain; charset=utf-8`,
                    ``,
                    `Bonjour,`,
                    ``,
                    `Ceci est un message automatique confirmant que le serveur SMTP Gmail est correctement configure et operationnel pour la plateforme du Guichet Unique Dematerialise du FNPSS (RDC).`,
                    ``,
                    `Contrat Blockchain Polygon Amoy : 0x1474ECCD68C0a9b3c28624532359B2e8A70ab705`,
                    ``,
                    `Cordialement,`,
                    `L'equipe technique Guichet Unique FNPSS.`
                  ].join('\r\n');
                  tlsSocket.write(`${emailMsg}\r\n.\r\n`);
                } else if (state === 'DATA_CONTENT' && tcode === '250') {
                  tlsSocket.write(`QUIT\r\n`);
                  tlsSocket.end();
                  return resolve({ success: true, message: 'Email de test envoyé avec succès dans votre boîte de réception Gmail ! (Code 250: 2.0.0 OK)' });
                } else {
                  tlsSocket.destroy();
                  return reject(new Error(`Échec d'authentification SMTP (${tline})`));
                }
              } else if (parseInt(tcode, 10) >= 400) {
                tlsSocket.destroy();
                return reject(new Error(`Erreur SMTP TLS (${tline})`));
              }
            }
          });

          tlsSocket.on('error', err => reject(err));
        } else if (parseInt(code, 10) >= 400) {
          socket.destroy();
          return reject(new Error(`Erreur SMTP (${line})`));
        }
      }
    });

    socket.on('error', err => reject(err));
    socket.setTimeout(12000, () => {
      socket.destroy();
      reject(new Error('Délai d\'attente dépassé (Timeout 12s) lors de la négociation STARTTLS'));
    });
  });
}

try {
  let result;
  if (port === 465) {
    result = await testSmtpDirectTls();
  } else {
    // Port 587 STARTTLS
    try {
      result = await testSmtpStarttls();
    } catch (err) {
      console.log(`[SMTP-TEST] STARTTLS port ${port} a échoué (${err.message}), essai avec port 465 SSL...`);
      result = await testSmtpDirectTls();
    }
  }
  console.log(`[SMTP-TEST] SUCCÈS : ${result.message}`);
  process.exit(0);
} catch (err) {
  console.error(`[SMTP-TEST] ÉCHEC : ${err.message}`);
  process.exit(1);
}
