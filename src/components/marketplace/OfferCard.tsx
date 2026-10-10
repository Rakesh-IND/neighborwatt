import { Link } from 'react-router-dom'
import { Clock, Zap } from 'lucide-react'
import type { Offer } from '../../types'
import { formatCredits, formatKwh } from '../../lib/format'
import { Badge, buttonClass } from '../ui'

export function availabilityOf(o: Offer) {
  if (o.status !== 'active' || o.remainingKwh <= 0) return { label: 'Sold out', tone: 'neutral' as const }
  if (o.validUntil && new Date(o.validUntil).getTime() < Date.now()) return { label: 'Expired', tone: 'danger' as const }
  if (o.remainingKwh < o.originalKwh * 0.25) return { label: 'Almost gone', tone: 'warning' as const }
  return { label: 'Available', tone: 'success' as const }
}

/** Offer card shared by the public marketplace and the buyer dashboard. */
export function OfferCard({
  offer,
  sellerStatus,
  onBuy,
  canBuy,
  highlighted,
}: {
  offer: Offer
  sellerStatus: string
  onBuy?: (o: Offer) => void
  canBuy: boolean
  highlighted?: boolean
}) {
  const avail = availabilityOf(offer)
  const remainingPct = offer.originalKwh > 0 ? Math.round((offer.remainingKwh / offer.originalKwh) * 100) : 0
  const purchasable = offer.status === 'active' && offer.remainingKwh > 0 && avail.label !== 'Expired'
  return (
    <article
      aria-labelledby={`offer-${offer.id}-title`}
      className={`flex flex-col gap-4 rounded-lg border bg-paper p-5 ${highlighted ? 'border-amber' : 'border-line'}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`offer-${offer.id}-title`} className="truncate font-display text-lg text-forest-deep">
            {offer.sellerLabel}
          </h3>
          <p className="text-xs text-ink-muted">{sellerStatus}</p>
        </div>
        <Badge tone={avail.tone}>{avail.label}</Badge>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-muted">Available</dt>
          <dd className="font-semibold tabular-nums">{formatKwh(offer.remainingKwh)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Price</dt>
          <dd className="font-semibold tabular-nums">{formatCredits(offer.pricePaise)}/kWh</dd>
        </div>
      </dl>

      <div>
        <div className="flex justify-between text-xs text-ink-muted">
          <span>{remainingPct}% of {formatKwh(offer.originalKwh, 1)} remaining</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ivory-deep" role="img" aria-label={`${remainingPct}% of offer remaining`}>
          <div className="h-full rounded-full bg-emerald" style={{ width: `${remainingPct}%` }} />
        </div>
      </div>

      {offer.description && <p className="text-sm text-ink-muted">{offer.description}</p>}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {purchasable && canBuy && onBuy ? (
          <button type="button" className={buttonClass('primary', 'md', 'flex-1')} onClick={() => onBuy(offer)}>
            <Zap size={16} aria-hidden /> Buy energy
          </button>
        ) : purchasable && !canBuy ? (
          <Link to="/buyer/login" className={buttonClass('secondary', 'md', 'flex-1')}>
            Sign in as buyer to buy
          </Link>
        ) : (
          <span className="flex min-h-11 items-center gap-1.5 text-sm text-ink-muted">
            <Clock size={14} aria-hidden /> Not available to buy
          </span>
        )}
      </div>
    </article>
  )
}
