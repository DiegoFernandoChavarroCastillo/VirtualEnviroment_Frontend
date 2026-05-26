const UINT32_MAX = 0x1_0000_0000;

function getCrypto(): Crypto {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.getRandomValues === 'function') {
    return cryptoApi;
  }
  throw new Error('Secure randomness requires crypto.getRandomValues (Web Crypto API).');
}

/**
 * Número en [0, 1) usando solo crypto.getRandomValues (aptitud para IDs y UI no criptográfica).
 */
export function secureRandom(): number {
  const buffer = new Uint32Array(1);
  getCrypto().getRandomValues(buffer);
  return buffer[0] / UINT32_MAX;
}

/**
 * ID alfanumérico aleatorio (no usar para tokens de sesión o secretos).
 */
export function generateSecureId(length = 9): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = new Uint8Array(length);
  getCrypto().getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
