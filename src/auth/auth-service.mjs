/**
 * @fileoverview Service d'Authentification Hybride Web2/Web3Auth & Gestion des Profils ONG
 * Références Backlog :
 * - REQ-01 : Inscription et connexion par email/mot de passe (scrypt salé + anti-brute-force)
 * - REQ-02 : Connexion rapide via Google OAuth 2.0 (nom et post-nom pré-remplis, liaison de compte)
 * - REQ-03 : Réinitialisation du mot de passe oublié (jeton à usage unique avec expiration)
 * - REQ-04 : Gestion du profil de l'organisation et déconnexion
 * - BLK-02 / BLK-03 : Abstraction de compte Web3Auth (portefeuille 0x... dérivé sans seed phrase)
 * - ADM-03 : Administration des comptes requérants (activation / suspension tracée)
 */

import crypto from 'node:crypto';
import { Roles, assertPermission } from '../workflow/application-engine.mjs';

const MAX_FAILED_ATTEMPTS = 5;

/**
 * Dérive de manière déterministe une adresse EVM non-custodiale (0x + 40 hex) via Web3Auth MPC simulé,
 * sans que l'utilisateur final n'ait à manipuler de clé privée ni de seed phrase (BLK-02 / BLK-03).
 */
export function deriveWeb3AuthWallet(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const digest = crypto.createHmac('sha256', 'FNPSS-WEB3AUTH-MPC-NODE-RDC').update(normalized).digest('hex');
  return '0x' + digest.slice(0, 40);
}

function hashPasswordScrypt(password, saltHex = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), 64).toString('hex');
  return `${saltHex}:${derived}`;
}

function verifyPasswordScrypt(password, storedHash) {
  const [saltHex, expectedHex] = String(storedHash || '').split(':');
  if (!saltHex || !expectedHex) return false;
  const candidateHex = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidateHex, 'hex'), Buffer.from(expectedHex, 'hex'));
}

export class AuthService {
  constructor({ sessionTtlMs = 8 * 60 * 60 * 1000 } = {}) {
    this.sessionTtlMs = sessionTtlMs;
    this.usersById = new Map();
    this.usersByEmail = new Map();
    this.sessions = new Map();
    this.resetTokens = new Map();
    this.authLogs = [];
    this.seq = 1;
  }

  _log(action, emailOrUserId, metadata = {}) {
    const entry = Object.freeze({
      id: this.authLogs.length + 1,
      action,
      target: emailOrUserId,
      metadata: Object.freeze({ ...metadata }),
      timestamp: new Date().toISOString()
    });
    this.authLogs.push(entry);
    return entry;
  }

  /**
   * Inscription par email et mot de passe (REQ-01 + BLK-03).
   */
  registerUser({
    email,
    password,
    firstName,
    lastName,
    organizationName,
    province = 'Kinshasa',
    enrollmentNumber = null,
    role = Roles.REQUERANT
  }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Adresse email invalide');
    }
    if (!password || String(password).length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (this.usersByEmail.has(cleanEmail)) {
      throw new Error('Un compte existe déjà avec cette adresse email');
    }

    const userId = `usr-${String(this.seq++).padStart(4, '0')}`;
    const walletAddress = deriveWeb3AuthWallet(cleanEmail);
    const user = {
      id: userId,
      email: cleanEmail,
      passwordHash: hashPasswordScrypt(password),
      firstName: String(firstName || '').trim(),
      lastName: String(lastName || '').trim(),
      organizationName: String(organizationName || '').trim(),
      province,
      enrollmentNumber,
      role,
      walletAddress,
      authProvider: 'EMAIL_PASSWORD',
      status: 'ACTIVE',
      statusReason: '',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString()
    };

    this.usersById.set(userId, user);
    this.usersByEmail.set(cleanEmail, user);
    this._log('USER_REGISTERED', cleanEmail, { userId, walletAddress, role });

    return this._sanitizeUser(user);
  }

  /**
   * Connexion par email et mot de passe avec limitation anti-brute-force (REQ-01).
   */
  loginWithEmail({ email, password, nowMs = Date.now() }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = this.usersByEmail.get(cleanEmail);
    if (!user) {
      throw new Error('Identifiants invalides');
    }
    if (user.status === 'SUSPENDED') {
      throw new Error('Compte suspendu par l\'administration du FNPSS');
    }
    if (user.lockedUntil && nowMs < user.lockedUntil) {
      throw new Error('Compte temporairement verrouillé suite à trop de tentatives échouées');
    }

    if (!user.passwordHash || !verifyPasswordScrypt(password, user.passwordHash)) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = nowMs + 15 * 60 * 1000; // Verrouillage 15 minutes
        this._log('ACCOUNT_LOCKED_BRUTEFORCE', cleanEmail, { attempts: user.failedLoginAttempts });
        throw new Error('Compte temporairement verrouillé suite à trop de tentatives échouées');
      }
      this._log('LOGIN_FAILED', cleanEmail, { attempts: user.failedLoginAttempts });
      throw new Error('Identifiants invalides');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    const sessionToken = crypto.randomBytes(24).toString('hex');
    this.sessions.set(sessionToken, { userId: user.id, createdAt: nowMs });
    this._log('LOGIN_SUCCESS', cleanEmail, { provider: 'EMAIL_PASSWORD', walletAddress: user.walletAddress });

    return {
      sessionToken,
      user: this._sanitizeUser(user)
    };
  }

  /**
   * Connexion rapide ou création/liaison automatique via Google OAuth 2.0 (REQ-02 + BLK-03).
   */
  loginWithGoogleOAuth({ googleEmail, givenName, familyName, organizationName = 'ONG Partenaire RDC', province = 'Kinshasa' }) {
    const cleanEmail = String(googleEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Email Google OAuth manquant');
    }

    let user = this.usersByEmail.get(cleanEmail);
    if (!user) {
      const userId = `usr-${String(this.seq++).padStart(4, '0')}`;
      user = {
        id: userId,
        email: cleanEmail,
        passwordHash: null,
        firstName: String(givenName || '').trim(),
        lastName: String(familyName || '').trim(),
        organizationName,
        province,
        enrollmentNumber: null,
        role: Roles.REQUERANT,
        walletAddress: deriveWeb3AuthWallet(cleanEmail),
        authProvider: 'GOOGLE_OAUTH',
        status: 'ACTIVE',
        statusReason: '',
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString()
      };
      this.usersById.set(userId, user);
      this.usersByEmail.set(cleanEmail, user);
      this._log('GOOGLE_OAUTH_REGISTERED', cleanEmail, { userId, walletAddress: user.walletAddress });
    } else {
      if (user.status === 'SUSPENDED') {
        throw new Error('Compte suspendu par l\'administration du FNPSS');
      }
      user.firstName = user.firstName || String(givenName || '').trim();
      user.lastName = user.lastName || String(familyName || '').trim();
      user.authProvider = 'GOOGLE_OAUTH_LINKED';
      this._log('GOOGLE_OAUTH_LINKED_LOGIN', cleanEmail, { userId: user.id });
    }

    const sessionToken = crypto.randomBytes(24).toString('hex');
    this.sessions.set(sessionToken, { userId: user.id, createdAt: Date.now() });
    return {
      sessionToken,
      user: this._sanitizeUser(user)
    };
  }

  /**
   * Demande de réinitialisation de mot de passe (REQ-03).
   * Retourne toujours un message neutre sans révéler si l'email existe ou non.
   */
  requestPasswordReset(email, nowMs = Date.now()) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = this.usersByEmail.get(cleanEmail);
    let resetToken = null;

    if (user) {
      resetToken = crypto.randomBytes(20).toString('hex');
      this.resetTokens.set(resetToken, {
        userId: user.id,
        expiresAt: nowMs + 15 * 60 * 1000,
        used: false
      });
      this._log('PASSWORD_RESET_REQUESTED', cleanEmail, { userId: user.id });
    } else {
      this._log('PASSWORD_RESET_UNKNOWN_EMAIL', cleanEmail, {});
    }

    return {
      message: 'Si un compte est associé à cette adresse, un lien de réinitialisation à usage unique a été envoyé.',
      _devResetToken: resetToken
    };
  }

  /**
   * Confirmation de réinitialisation de mot de passe avec jeton à usage unique (REQ-03).
   */
  confirmPasswordReset(token, newPassword, nowMs = Date.now()) {
    const entry = this.resetTokens.get(token);
    if (!entry || entry.used || nowMs > entry.expiresAt) {
      throw new Error('Lien de réinitialisation invalide ou expiré');
    }
    if (!newPassword || String(newPassword).length < 8) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }
    const user = this.usersById.get(entry.userId);
    entry.used = true;
    user.passwordHash = hashPasswordScrypt(newPassword);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    this._log('PASSWORD_RESET_COMPLETED', user.email, { userId: user.id });
    return this._sanitizeUser(user);
  }

  /**
   * Mise à jour du profil de l'organisation et du représentant légal (REQ-04).
   */
  updateOrganizationProfile(userId, { firstName, lastName, organizationName, province, enrollmentNumber }) {
    const user = this.usersById.get(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }
    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();
    if (organizationName !== undefined) user.organizationName = String(organizationName).trim();
    if (province !== undefined) user.province = String(province).trim();
    if (enrollmentNumber !== undefined) user.enrollmentNumber = enrollmentNumber;

    this._log('PROFILE_UPDATED', user.email, { userId: user.id, organizationName: user.organizationName });
    return this._sanitizeUser(user);
  }

  /**
   * Résout un jeton de session en acteur authentifié (ADM-01) : refuse les jetons inconnus,
   * expirés (durée de vie `sessionTtlMs`) ou appartenant à un compte suspendu.
   */
  authenticateSession(sessionToken, nowMs = Date.now()) {
    const sess = this.sessions.get(sessionToken);
    if (!sess) {
      throw new Error('Session invalide ou expirée');
    }
    if (nowMs - sess.createdAt > this.sessionTtlMs) {
      this.sessions.delete(sessionToken);
      this._log('SESSION_EXPIRED', sess.userId, {});
      throw new Error('Session invalide ou expirée');
    }
    const user = this.usersById.get(sess.userId);
    if (!user || user.status === 'SUSPENDED') {
      this.sessions.delete(sessionToken);
      throw new Error('Session invalide ou expirée');
    }
    return { id: user.id, role: user.role, email: user.email };
  }

  /**
   * Déconnexion d'une session active (REQ-04).
   */
  logout(sessionToken) {
    const sess = this.sessions.get(sessionToken);
    if (sess) {
      this.sessions.delete(sessionToken);
      this._log('USER_LOGGED_OUT', sess.userId, {});
    }
    return { loggedOut: true };
  }

  /**
   * Activation ou suspension d'un compte requérant par l'administrateur FNPSS (ADM-03).
   */
  setApplicantAccountStatus(adminActor, targetUserId, newStatus, reason = '') {
    assertPermission(adminActor, 'MANAGE_USERS');
    if (!['ACTIVE', 'SUSPENDED'].includes(newStatus)) {
      throw new Error(`Statut de compte invalide : ${newStatus}`);
    }
    const user = this.usersById.get(targetUserId);
    if (!user) {
      throw new Error(`Compte requérant introuvable : ${targetUserId}`);
    }
    user.status = newStatus;
    user.statusReason = reason;
    this._log('APPLICANT_STATUS_CHANGED', user.email, {
      actorId: adminActor.id,
      newStatus,
      reason
    });
    return this._sanitizeUser(user);
  }

  listApplicants() {
    return Array.from(this.usersById.values())
      .filter(u => u.role === Roles.REQUERANT)
      .map(u => this._sanitizeUser(u));
  }

  _sanitizeUser(user) {
    const { passwordHash, ...safe } = user;
    return { ...safe };
  }
}

