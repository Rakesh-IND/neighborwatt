import type { Account, Offer, SellerSim } from '../types'
import { round2 } from '../lib/format'

/**
 * Illustrative surplus rule from the spec:
 *   Estimated Surplus = max(0, Generation − Household Demand − Required Reserve)
 * This is a simulated estimate, not verified physical electricity availability.
 */
export function estimateSurplus(sim: SellerSim): number {
  return round2(Math.max(0, sim.generationKwh - sim.demandKwh - sim.reserveKwh))
}

/**
 * kWh already committed from this seller's surplus: everything sold, plus the remaining
 * quantity on still-active offers. Cancelled offers release their unsold energy.
 */
export function committedKwh(offers: Offer[], sellerId: string, excludeOfferId?: string): number {
  return round2(
    offers
      .filter((o) => o.sellerId === sellerId && o.id !== excludeOfferId)
      .reduce((sum, o) => {
        if (o.status === 'cancelled') return sum + o.soldKwh
        return sum + o.soldKwh + o.remainingKwh
      }, 0),
  )
}

/** Surplus still available to list, after commitments. Never negative. */
export function availableToList(account: Account, offers: Offer[], excludeOfferId?: string): number {
  if (!account.sim) return 0
  return Math.max(0, round2(estimateSurplus(account.sim) - committedKwh(offers, account.id, excludeOfferId)))
}
