import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Deriving a 32-byte key from JWT_SECRET or fallback to prevent failure
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest()
  : crypto.createHash('sha256').update(process.env.JWT_SECRET || 'vexo-default-secret-key-32-chars').digest();

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (!text) return '';
  const parts = text.split(':');
  if (parts.length !== 2) {
    // Return plain text as fallback (legacy or unencrypted)
    return text;
  }
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    // If decryption fails, return the original text as a fallback
    console.error('Decryption failed, returning plain text:', err);
    return text;
  }
}
