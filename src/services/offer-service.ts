import { commit } from '../stores/app-store'
import type { Offer } from '../types'
import { round2, householdLabel } from '../lib/format'
import { availableToList } from './surplus'
import { validateKwh, validatePriceRupees } from './validation'

export class OfferError extends Error {}

export interface OfferDraftInput {
  sellerId: string
  kwh: number | string
  priceRupees: number | string
  description: string
  /** Optional validity in hours from now. */
  validHours?: number | null
}

/** Shared validation used by Preview, Publish and Edit. Returns field errors. */
export function validateOffer(
  input: OfferDraftInput,
  available: number,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const q = validateKwh(input.kwh, available)
  if (available <= 0) errors.kwh = 'No simulated surplus is available to list right now.'
  else if (q) errors.kwh = q
  const p = validatePriceRupees(input.priceRupees)
  if (p) errors.price = p
  if (input.description.length > 140) errors.description = 'Keep the description under 140 characters.'
  return errors
}

export function publishOffer(input: OfferDraftInput): Offer {
  return commit((draft) => {
    const seller = draft.accounts.find((a) => a.id === input.sellerId)
    if (!seller || seller.role !== 'seller') throw new OfferError('Only seller accounts can publish offers.')
    const available = availableToList(seller, draft.offers)
    const errors = validateOffer(input, available)
    const first = Object.values(errors)[0]
    if (first) throw new OfferError(first)

    const now = new Date()
    const offer: Offer = {
      id: `off_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      sellerId: seller.id,
      sellerLabel: householdLabel(seller.name),
      soldKwh: 0,
      remainingKwh: round2(Number(input.kwh)),
      pricePaise: Math.round(Number(input.priceRupees) * 100),
      originalKwh: round2(Number(input.kwh)),
      description: input.description.trim(),
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      validUntil: input.validHours ? new Date(now.getTime() + input.validHours * 3600_000).toISOString() : null,
    }
    draft.offers.unshift(offer)
    return { next: draft, result: offer }
  })
}

/** Edit remaining quantity / price on an active offer. Sold energy is never altered. */
export function updateOffer(
  sellerId: string,
  offerId: string,
  patch: { remainingKwh?: number | string; pricePaise?: number },
): Offer {
  return commit((draft) => {
    const offer = draft.offers.find((o) => o.id === offerId)
    if (!offer || offer.sellerId !== sellerId) throw new OfferError('Offer not found for this seller.')
    if (offer.status !== 'active') throw new OfferError('Only active offers can be edited.')
    const seller = draft.accounts.find((a) => a.id === sellerId)!

    if (patch.remainingKwh !== undefined) {
      const wanted = Number(patch.remainingKwh)
      // Surplus available for this offer = total surplus minus everything else committed.
      const ceiling = round2(availableToList(seller, draft.offers, offer.id) )
      if (!Number.isFinite(wanted) || wanted < 0) throw new OfferError('Remaining quantity must be zero or more.')
      if (wanted > ceiling) throw new OfferError(`You only have ${ceiling.toFixed(2)} kWh of simulated surplus to commit to this offer.`)
      offer.remainingKwh = round2(wanted)
      if (offer.remainingKwh === 0) offer.status = 'cancelled'
    }
    if (patch.pricePaise !== undefined) {
      if (!Number.isInteger(patch.pricePaise) || patch.pricePaise <= 0 || patch.pricePaise > 10000) {
        throw new OfferError('Price must be between ₹0.01 and ₹100.00 per kWh.')
      }
      offer.pricePaise = patch.pricePaise
    }
    offer.updatedAt = new Date().toISOString()
    return { next: draft, result: offer }
  })
}

/** Cancel releases remaining quantity back to the seller's available surplus. */
export function cancelOffer(sellerId: string, offerId: string): Offer {
  return commit((draft) => {
    const offer = draft.offers.find((o) => o.id === offerId)
    if (!offer || offer.sellerId !== sellerId) throw new OfferError('Offer not found for this seller.')
    if (offer.status !== 'active') throw new OfferError('Only active offers can be cancelled.')
    offer.status = 'cancelled'
    offer.updatedAt = new Date().toISOString()
    return { next: draft, result: offer }
  })
}
