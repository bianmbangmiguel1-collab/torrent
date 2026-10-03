// lib/security/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_MASTER_KEY || 'torrenttwist-master-key-2024';
const IV_LENGTH = 16;

// ⭐ Dérivation de la clé avec PBKDF2
function deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// ⭐ Chiffrement AES-256-GCM
export function encryptData(text: string): string {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(ENCRYPTION_KEY, salt.toString('hex'));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// ⭐ Déchiffrement AES-256-GCM
export function decryptData(encryptedText: string): string {
  const [saltHex, ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(ENCRYPTION_KEY, salt.toString('hex'));
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ⭐ Masquer une clé pour l'affichage
export function maskKey(key: string, showFirst: number = 4, showLast: number = 4): string {
  if (!key) return '';
  if (key.length <= showFirst + showLast) return '••••••••';
  return key.substring(0, showFirst) + '••••••••' + key.substring(key.length - showLast);
}

// ⭐ Générer une signature HMAC-SHA256
export function generateHmacSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// ⭐ Vérifier une signature HMAC de manière sécurisée
export function verifyHmacSignature(data: string, signature: string, secret: string): boolean {
  try {
    const expected = generateHmacSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}