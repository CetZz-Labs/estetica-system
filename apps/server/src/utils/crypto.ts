import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT = 'maison-salt';

const getEncryptionKey = (): Buffer => {
    const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!secret) {
        throw new Error('CREDENTIALS_ENCRYPTION_KEY no está configurada. No se pueden cifrar/descifrar credenciales.');
    }
    return scryptSync(secret, SALT, 32);
};

export const encryptSecret = (plaintext: string): string => {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptSecret = (ciphertext: string): string => {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        throw new Error('Formato de credencial cifrada inválido');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
};
