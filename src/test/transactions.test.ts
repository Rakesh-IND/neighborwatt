// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { initStore, getState, commit } from '../stores/app-store'
import { MemoryStorageAdapter } from '../services/storage'
import { executePurchase, quotePurchase, TransactionError } from '../services/transaction-service'
import { validateKwh, validatePassword } from '../services/validation'
import type { Account, Offer } from '../types'

let key = 0
const freshKey = () => `test-key-${++key}`

const buyer = (): Account => getState().accounts.find((a) => a.role === 'buyer')!
const offer = (id = 'off_sample_1'): Offer => getState().offers.find((o) => o.id === id)!

function expectCode(fn: () => unknown, code: string) {
  let thrown: unknown = null
  try {
    fn()
  } catch (e) {
    thrown = e
  }
  expect(thrown).toBeInstanceOf(TransactionError)
  expect((thrown as TransactionError).code).toBe(code)
}

beforeEach(async () => {
  await initStore(new MemoryStorageAdapter())
})

describe('quotePurchase', () => {
  it('computes total and balance after without changing state', () => {
    const q = quotePurchase(10000, offer(), 2)
    expect(q.totalPaise).toBe(Math.round(2 * offer().pricePaise))
    expect(q.balanceAfterPaise).toBe(10000 - q.totalPaise)
    expect(offer().remainingKwh).toBe(3.4)
  })
})

describe('executePurchase', () => {
  it('moves money, reduces remaining kWh and records a checksummed ledger entry', () => {
    const b = buyer()
    const o = offer()
    const buyerBefore = b.balancePaise
    const remainingBefore = o.remainingKwh
    const sellerBefore = getState().accounts.find((a) => a.id === o.sellerId)!.balancePaise

    const tx = executePurchase({ buyerId: b.id, offerId: o.id, kwh: 1.2, idempotencyKey: freshKey() })

    const after = getState()
    const buyerAfter = after.accounts.find((a) => a.id === b.id)!
    const sellerAfter = after.accounts.find((a) => a.id === o.sellerId)!
    expect(buyerAfter.balancePaise).toBe(buyerBefore - tx.totalPaise)
    expect(sellerAfter.balancePaise).toBe(sellerBefore + tx.totalPaise)
    expect(offer(o.id).remainingKwh).toBeCloseTo(remainingBefore - 1.2, 2)
    expect(offer(o.id).soldKwh).toBeCloseTo(1.2, 2)
    expect(after.transactions[0].id).toBe(tx.id)
    expect(tx.checksum).toBeTruthy()
    expect(tx.status).toBe('completed')
  })

  it('marks the offer sold_out when the full quantity is bought', () => {
    executePurchase({ buyerId: buyer().id, offerId: 'off_sample_2', kwh: 1.8, idempotencyKey: freshKey() })
    expect(offer('off_sample_2').status).toBe('sold_out')
    expect(offer('off_sample_2').remainingKwh).toBe(0)
  })

  it('rejects an insufficient balance and leaves all state untouched', () => {
    const b = buyer()
    // Set the buyer's balance to ₹1 so a full-offer order is unaffordable.
    commit((draft) => {
      draft.accounts.find((a) => a.id === b.id)!.balancePaise = 100
      return { next: draft, result: undefined }
    })
    const snapshot = JSON.stringify(getState())
    expectCode(
      () => executePurchase({ buyerId: b.id, offerId: 'off_sample_1', kwh: 3.4, idempotencyKey: freshKey() }),
      'INSUFFICIENT_BALANCE',
    )
    expect(JSON.stringify(getState())).toBe(snapshot)
  })

  it('rejects quantities above the remaining offer and leaves state untouched', () => {
    const snapshot = JSON.stringify(getState())
    expectCode(
      () => executePurchase({ buyerId: buyer().id, offerId: 'off_sample_2', kwh: 5, idempotencyKey: freshKey() }),
      'EXCEEDS_REMAINING',
    )
    expect(JSON.stringify(getState())).toBe(snapshot)
  })

  it('rejects zero quantities', () => {
    expectCode(
      () => executePurchase({ buyerId: buyer().id, offerId: 'off_sample_1', kwh: 0, idempotencyKey: freshKey() }),
      'INVALID_QUANTITY',
    )
  })

  it('rejects a non-buyer account (seller) attempting a purchase', () => {
    const seller = getState().accounts.find((a) => a.id === offer().sellerId)!
    expectCode(
      () => executePurchase({ buyerId: seller.id, offerId: offer().id, kwh: 1, idempotencyKey: freshKey() }),
      'NOT_BUYER',
    )
  })

  it('rejects a re-submitted idempotency key', () => {
    const k = freshKey()
    executePurchase({ buyerId: buyer().id, offerId: 'off_sample_1', kwh: 0.5, idempotencyKey: k })
    expectCode(
      () => executePurchase({ buyerId: buyer().id, offerId: 'off_sample_1', kwh: 0.5, idempotencyKey: k }),
      'DUPLICATE_SUBMISSION',
    )
  })

  it('rejects unknown offers', () => {
    expectCode(
      () => executePurchase({ buyerId: buyer().id, offerId: 'nope', kwh: 1, idempotencyKey: freshKey() }),
      'OFFER_NOT_FOUND',
    )
  })
})

describe('validation', () => {
  it('validates kWh bounds and precision', () => {
    expect(validateKwh('', 3)).toBeTruthy()
    expect(validateKwh(-1, 3)).toBeTruthy()
    expect(validateKwh(1.234, 3)).toBeTruthy()
    expect(validateKwh(4, 3)).toBeTruthy()
    expect(validateKwh(3, 3)).toBeNull()
  })

  it('requires letters and numbers in passwords of 8+', () => {
    expect(validatePassword('short1')).toBeTruthy()
    expect(validatePassword('allletters')).toBeTruthy()
    expect(validatePassword('12345678')).toBeTruthy()
    expect(validatePassword('solar2026')).toBeNull()
  })
})
