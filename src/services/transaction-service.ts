/**
 * Shared transaction service — the ONLY place balances, offer quantities and the ledger change.
 * Every operation runs inside `commit`, so a failed validation leaves all state untouched.
 * Production: replace with a server endpoint that performs the same steps in one DB transaction.
 */
import { commit, getState } from '../stores/app-store'
import type { Offer, Transaction } from '../types'
import { ledgerChecksum } from '../lib/checksum'
import { round2, totalPaiseFor } from '../lib/format'
import { validateKwh } from './validation'

export type PurchaseErrorCode =
  | 'INVALID_QUANTITY'
  | 'OFFER_NOT_FOUND'
  | 'OFFER_NOT_ACTIVE'
  | 'EXCEEDS_REMAINING'
  | 'INSUFFICIENT_BALANCE'
  | 'SELF_PURCHASE'
  | 'DUPLICATE_SUBMISSION'
  | 'NOT_BUYER'

export class TransactionError extends Error {
  readonly code: PurchaseErrorCode
  constructor(code: PurchaseErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export interface PurchaseInput {
  buyerId: string
  offerId: string
  kwh: number
  /** Idempotency key generated once per order summary; re-submits with the same key are rejected. */
  idempotencyKey: string
  channel?: 'web' | 'ussd'
}

export interface PurchaseQuote {
  offer: Offer
  kwh: number
  totalPaise: number
  balanceAfterPaise: number
}

/** Pure quote used by the order summary. Does not change state. */
export function quotePurchase(buyerBalancePaise: number, offer: Offer, kwh: number): PurchaseQuote {
  const totalPaise = totalPaiseFor(kwh, offer.pricePaise)
  return { offer, kwh, totalPaise, balanceAfterPaise: buyerBalancePaise - totalPaise }
}

let txCounter = 0
const newTxId = () => {
  txCounter += 1
  return `NW-${Date.now().toString(36).toUpperCase()}-${txCounter.toString(36).toUpperCase().padStart(3, '0')}`
}

export function executePurchase(input: PurchaseInput): Transaction {
  return commit((draft) => {
    const buyer = draft.accounts.find((a) => a.id === input.buyerId)
    if (!buyer || buyer.role !== 'buyer') {
      throw new TransactionError('NOT_BUYER', 'Only a buyer account can purchase energy.')
    }
    if (draft.processedKeys.includes(input.idempotencyKey)) {
      throw new TransactionError('DUPLICATE_SUBMISSION', 'This order was already submitted.')
    }

    const offer = draft.offers.find((o) => o.id === input.offerId)
    if (!offer) throw new TransactionError('OFFER_NOT_FOUND', 'That offer no longer exists.')
    if (offer.status !== 'active') {
      throw new TransactionError('OFFER_NOT_ACTIVE', 'This offer is no longer active.')
    }
    if (offer.validUntil && new Date(offer.validUntil).getTime() < Date.now()) {
      throw new TransactionError('OFFER_NOT_ACTIVE', 'This offer has expired.')
    }
    if (offer.sellerId === buyer.id) {
      throw new TransactionError('SELF_PURCHASE', 'You cannot buy your own offer.')
    }

    const qtyError = validateKwh(input.kwh, offer.remainingKwh)
    if (qtyError) {
      const code: PurchaseErrorCode = input.kwh > offer.remainingKwh ? 'EXCEEDS_REMAINING' : 'INVALID_QUANTITY'
      throw new TransactionError(code, qtyError)
    }

    const kwh = round2(input.kwh)
    const totalPaise = totalPaiseFor(kwh, offer.pricePaise)
    if (totalPaise > buyer.balancePaise) {
      throw new TransactionError(
        'INSUFFICIENT_BALANCE',
        `Insufficient demo balance. This order costs ₹${(totalPaise / 100).toFixed(2)} and your balance is ₹${(buyer.balancePaise / 100).toFixed(2)}.`,
      )
    }

    const seller = draft.accounts.find((a) => a.id === offer.sellerId)
    if (!seller) throw new TransactionError('OFFER_NOT_FOUND', 'The seller account for this offer is missing.')

    const createdAt = new Date().toISOString()
    const id = newTxId()
    const checksum = ledgerChecksum({
      id,
      buyerId: buyer.id,
      sellerId: seller.id,
      offerId: offer.id,
      kwh,
      pricePaise: offer.pricePaise,
      totalPaise,
      createdAt,
    })

    // all mutations below are applied to the draft only; commit persists them together
    buyer.balancePaise -= totalPaise
    seller.balancePaise += totalPaise
    offer.remainingKwh = round2(offer.remainingKwh - kwh)
    offer.soldKwh = round2(offer.soldKwh + kwh)
    offer.updatedAt = createdAt
    if (offer.remainingKwh <= 0) offer.status = 'sold_out'

    const tx: Transaction = {
      id,
      offerId: offer.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      buyerLabel: buyer.name,
      sellerLabel: seller.name,
      kwh,
      pricePaise: offer.pricePaise,
      totalPaise,
      status: 'completed',
      channel: input.channel ?? 'web',
      createdAt,
      checksum,
    }
    draft.transactions.unshift(tx)
    draft.processedKeys.push(input.idempotencyKey)
    if (draft.processedKeys.length > 500) draft.processedKeys.splice(0, draft.processedKeys.length - 500)

    return { next: draft, result: tx }
  })
}

/** Ledger lookup scoped to a viewer. Returns only records the viewer participated in. */
export function transactionsFor(viewerId: string) {
  return getState().transactions.filter((t) => t.buyerId === viewerId || t.sellerId === viewerId)
}
