import { useMemo, useState } from 'react'
import { useAppState } from '../../stores/app-store'
import { useAuth } from '../../auth/AuthContext'
import type { Offer, Transaction } from '../../types'
import { OfferCard, availabilityOf } from './OfferCard'
import { PurchaseDialog } from './PurchaseDialog'
import { EmptyState, Notice, SelectField, Field } from '../ui'
import { formatCredits } from '../../lib/format'
import { Link } from 'react-router-dom'

type Sort = 'price_asc' | 'price_desc' | 'energy_desc' | 'energy_asc'

/**
 * The single marketplace view used by /marketplace and the buyer dashboard. Both read the same
 * central store, so an offer bought in one place is immediately reflected everywhere.
 */
export function MarketplaceBrowser({ onPurchased, compact }: { onPurchased?: (tx: Transaction) => void; compact?: boolean }) {
  const state = useAppState()
  const { account } = useAuth()
  const [minKwh, setMinKwh] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [seller, setSeller] = useState('all')
  const [sort, setSort] = useState<Sort>('price_asc')
  const [selected, setSelected] = useState<Offer | null>(null)
  const [flash, setFlash] = useState<Transaction | null>(null)

  const isBuyer = account?.role === 'buyer'
  const sellers = useMemo(() => state.accounts.filter((a) => a.role === 'seller'), [state.accounts])

  const visible = useMemo(() => {
    const min = Number(minKwh) || 0
    const pMin = minPrice === '' ? 0 : Number(minPrice) * 100
    const pMax = maxPrice === '' ? Infinity : Number(maxPrice) * 100
    const list = state.offers.filter((o) => {
      if (o.status !== 'active' || o.remainingKwh <= 0) return false
      if (availabilityOf(o).label === 'Expired') return false
      if (o.remainingKwh < min) return false
      if (o.pricePaise < pMin || o.pricePaise > pMax) return false
      if (seller !== 'all' && o.sellerId !== seller) return false
      return true
    })
    list.sort((a, b) => {
      switch (sort) {
        case 'price_asc': return a.pricePaise - b.pricePaise
        case 'price_desc': return b.pricePaise - a.pricePaise
        case 'energy_desc': return b.remainingKwh - a.remainingKwh
        case 'energy_asc': return a.remainingKwh - b.remainingKwh
      }
    })
    return list
  }, [state.offers, minKwh, minPrice, maxPrice, seller, sort])

  const priceError = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice) ? 'Minimum price is above the maximum.' : null
  const balance = account?.balancePaise ?? 0
  const buyerAccount = isBuyer ? account : null

  return (
    <div className="flex flex-col gap-6">
      {flash && (
        <Notice tone="success" title="Purchase confirmed">
          Transaction <span className="font-mono">{flash.id}</span>: {flash.kwh.toFixed(2)} kWh from {flash.sellerLabel} for {formatCredits(flash.totalPaise)}. Your balance and the seller's ledger are updated.
        </Notice>
      )}

      <fieldset className="grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-5">
        <legend className="sr-only">Filter offers</legend>
        <Field label="Min. available (kWh)" inputMode="decimal" value={minKwh} onChange={(e) => setMinKwh(e.target.value)} placeholder="0" />
        <Field label="Min. price (₹/kWh)" inputMode="decimal" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" error={priceError ?? undefined} />
        <Field label="Max. price (₹/kWh)" inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="100" />
        <SelectField label="Seller" value={seller} onChange={(e) => setSeller(e.target.value)}>
          <option value="all">All sellers</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </SelectField>
        <SelectField label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="energy_desc">Energy: most available</option>
          <option value="energy_asc">Energy: least available</option>
        </SelectField>
      </fieldset>

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <p aria-live="polite">{visible.length} active {visible.length === 1 ? 'offer' : 'offers'}</p>
        {isBuyer && <p>Your balance: <span className="font-semibold text-forest-deep">{formatCredits(balance)}</span></p>}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No offers match these filters.">Clear a filter or check back after the next settlement window.</EmptyState>
      ) : (
        <ul className={`grid gap-4 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
          {visible.map((o) => {
            const sellerAcc = state.accounts.find((a) => a.id === o.sellerId)
            return (
              <li key={o.id}>
                <OfferCard
                  offer={o}
                  sellerStatus={`${sellerAcc?.village ?? 'Village'} · ${sellerAcc?.isSample ? 'Sample seller' : 'Registered seller'}`}
                  canBuy={isBuyer}
                  onBuy={(offer) => {
                    setFlash(null)
                    setSelected(offer)
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}

      {!account && (
        <p className="text-sm text-ink-muted">
          <Link to="/buyer/login" className="font-medium text-forest-deep underline underline-offset-4">Sign in as a buyer</Link> to purchase energy.
        </p>
      )}

      {selected && buyerAccount && (
        <PurchaseDialog
          offer={state.offers.find((o) => o.id === selected.id) ?? selected}
          buyerId={buyerAccount.id}
          buyerBalancePaise={buyerAccount.balancePaise}
          onClose={() => setSelected(null)}
          onComplete={(tx) => {
            setSelected(null)
            setFlash(tx)
            onPurchased?.(tx)
          }}
        />
      )}
    </div>
  )
}
