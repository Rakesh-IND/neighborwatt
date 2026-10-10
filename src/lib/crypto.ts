/**
 * Password hashing for the DEMO auth layer.
 * PBKDF2-SHA256, 100k iterations, 16-byte salt. Runs with Web Crypto in the browser and in Node 20+.
 * This is a browser-local demo: production must verify credentials on a backend identity provider.
 */
const ITERATIONS = 100_000

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export function randomSaltHex(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const subtle = globalThis.crypto.subtle
  const enc = new TextEncoder()
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
  const key = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(bits)
}

export async function verifyPassword(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  const candidate = await hashPassword(password, saltHex)
  // constant-length comparison
  if (candidate.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}
