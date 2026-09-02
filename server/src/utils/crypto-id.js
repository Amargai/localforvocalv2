const crypto = require('crypto');

// Cryptographic key derived from server secret
const SECRET_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'local-for-vocal-secret-2026').digest();

/**
 * Encrypts an internal database ID (e.g. 'shop_1', 'user_123') into a compact,
 * URL-safe, tamper-proof token (e.g. 's_ygZhSyeqRj8GuvLa7zt-gHw1')
 *
 * Benefits:
 * 1. Hides real primary keys from URLs and API responses
 * 2. Prevents database enumeration, scraping, and guessing
 * 3. Verified by a 32-bit cryptographic HMAC checksum to detect tampering
 */
function maskId(id) {
  if (!id || typeof id !== 'string') return id;

  // 8-byte deterministic IV derived from ID and secret
  const iv = crypto.createHmac('sha256', SECRET_KEY).update('iv_' + id).digest().subarray(0, 8);
  
  // AES-256-CTR encryption
  const cipher = crypto.createCipheriv('aes-256-ctr', SECRET_KEY, Buffer.concat([iv, Buffer.alloc(8)]));
  const encrypted = Buffer.concat([cipher.update(id, 'utf8'), cipher.final()]);

  // 4-byte HMAC signature to verify token authenticity
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(Buffer.concat([iv, encrypted])).digest().subarray(0, 4);

  // Combine IV + Encrypted + HMAC into URL-safe base64 string
  const combined = Buffer.concat([iv, encrypted, hmac]);
  return 's_' + combined.toString('base64url');
}

/**
 * Decrypts a URL-safe token back to the internal database ID.
 * Returns the unmasked ID if valid.
 * If a plain ID is passed (e.g. from internal calls or tests), returns it as-is for backward compatibility.
 * If tampered with, returns an invalid string so the DB safely returns 404 Not Found.
 */
function unmaskId(token) {
  if (!token || typeof token !== 'string') return token;
  if (!token.startsWith('s_')) return token; // Plain ID fallback

  try {
    const buffer = Buffer.from(token.slice(2), 'base64url');
    if (buffer.length <= 12) return 'invalid_token_' + token;

    const iv = buffer.subarray(0, 8);
    const encrypted = buffer.subarray(8, buffer.length - 4);
    const receivedHmac = buffer.subarray(buffer.length - 4);

    // Verify HMAC integrity
    const expectedHmac = crypto.createHmac('sha256', SECRET_KEY).update(Buffer.concat([iv, encrypted])).digest().subarray(0, 4);
    if (!crypto.timingSafeEqual(receivedHmac, expectedHmac)) {
      return 'invalid_token_tampered';
    }

    // Decrypt with AES-256-CTR
    const decipher = crypto.createDecipheriv('aes-256-ctr', SECRET_KEY, Buffer.concat([iv, Buffer.alloc(8)]));
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');

    return decrypted || 'invalid_token_empty';
  } catch (err) {
    return 'invalid_token_err';
  }
}

module.exports = { maskId, unmaskId };
