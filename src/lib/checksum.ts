/**
 * Integrity checksum for ledger records (FNV-1a 32-bit over canonical fields).
 * This detects accidental or in-memory tampering in the demo ledger. It is NOT a cryptographic
 * signature; production ledgers need a signed, append-only store.
 */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export interface LedgerFields {
  id: string
  buyerId: string
  sellerId: string
  offerId: string
  kwh: number
  pricePaise: number
  totalPaise: number
  createdAt: string
}

export const ledgerChecksum = (f: LedgerFields) =>
  fnv1a([f.id, f.buyerId, f.sellerId, f.offerId, f.kwh.toFixed(2), f.pricePaise, f.totalPaise, f.createdAt].join('|'))
