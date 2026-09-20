import { STORAGE_KEYS } from './constants';

async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return window.crypto.subtle.exportKey('jwk', key);
}

async function importPublicKey(jwkObjOrStr: JsonWebKey | string): Promise<CryptoKey> {
  const jwk = typeof jwkObjOrStr === 'string' ? JSON.parse(jwkObjOrStr) : jwkObjOrStr;
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
}

async function importPrivateKey(jwkObjOrStr: JsonWebKey | string): Promise<CryptoKey> {
  const jwk = typeof jwkObjOrStr === 'string' ? JSON.parse(jwkObjOrStr) : jwkObjOrStr;
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

export async function getUserKeyPair(): Promise<CryptoKeyPair | { publicKey: CryptoKey; privateKey: CryptoKey }> {
  if (typeof window === 'undefined') {
    throw new Error('Crypto API is only available in the browser.');
  }

  const stored = localStorage.getItem(STORAGE_KEYS.RSA_KEYS);
  if (stored) {
    const { publicKeyJwk, privateKeyJwk } = JSON.parse(stored);
    const publicKey = await importPublicKey(publicKeyJwk);
    const privateKey = await importPrivateKey(privateKeyJwk);
    return { publicKey, privateKey };
  }

  const keyPair = await generateRSAKeyPair();
  const publicKeyJwk = await exportKey(keyPair.publicKey);
  const privateKeyJwk = await exportKey(keyPair.privateKey);
  localStorage.setItem(STORAGE_KEYS.RSA_KEYS, JSON.stringify({ publicKeyJwk, privateKeyJwk }));
  return keyPair;
}

export async function getPublicKeyJwk(): Promise<JsonWebKey | null> {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(STORAGE_KEYS.RSA_KEYS);
  if (stored) {
    return JSON.parse(stored).publicKeyJwk;
  }
  const keyPair = await generateRSAKeyPair();
  const publicKeyJwk = await exportKey(keyPair.publicKey);
  const privateKeyJwk = await exportKey(keyPair.privateKey);
  localStorage.setItem(STORAGE_KEYS.RSA_KEYS, JSON.stringify({ publicKeyJwk, privateKeyJwk }));
  return publicKeyJwk;
}

export async function encryptRoomKey(publicKeyJwk: JsonWebKey | string, aesKey: CryptoKey): Promise<string> {
  const publicKey = await importPublicKey(publicKeyJwk);
  const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const encrypted = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey);
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export async function decryptRoomKey(privateKey: CryptoKey, encryptedBase64: string): Promise<CryptoKey> {
  const binary = atob(encryptedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const rawKey = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, bytes);
  return window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function generateRoomKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function encryptText(aesKey: CryptoKey, plaintext: string): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptText(aesKey: CryptoKey, ciphertextBase64: string): Promise<string> {
  const binary = atob(ciphertextBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
  return new TextDecoder().decode(decrypted);
}

const roomKeys: Record<string, CryptoKey> = {};

export function storeRoomKey(roomId: string, aesKey: CryptoKey): void {
  roomKeys[roomId] = aesKey;
}

export function getRoomKey(roomId?: string | null): CryptoKey | null {
  if (!roomId) return null;
  return roomKeys[roomId] || null;
}

export function clearRoomKey(roomId: string): void {
  delete roomKeys[roomId];
}

export function clearAllCryptoKeys(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.RSA_KEYS);
  }
  for (const k in roomKeys) delete roomKeys[k];
}
