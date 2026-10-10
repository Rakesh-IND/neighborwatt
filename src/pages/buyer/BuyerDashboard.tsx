import { Link } from 'react-router-dom'
import { useAppState } from '../../stores/app-store'
import { useAuth } from '../../auth/AuthContext'
import { transactionsFor } from '../../services/transaction-service'
import { formatCredits, formatDateTime, formatKwh } from '../../lib/format'
import { StatTile, SectionHeading, Card, Badge, buttonClass, SimulationDisclaimer, EmptyState } from '../../components/ui'
import { MarketplaceBrowser } from '../../components/marketplace/MarketplaceBrowser'

export default function BuyerDashboard() {
  const { account } = useAuth()
  const state = useAppState()
  if (!account) return null
  const mine = transactionsFor(account.id).filter((t) => t.buyerId === account.id)
  const kwhTotal = mine.reduce((s, t) => s + t.kwh, 0)
  const spent = mine.reduce((s, t) => s + t.totalPaise, 0)
  const avgPrice = kwhTotal > 0 ? spent / kwhTotal : 0
  const activeOffers = state.offers.filter((o) => o.status === 'active' && o.remainingKwh > 0).length

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald">Buyer dashboard</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Welcome, {account.name.split(' ')[0]}</h1>
          <p className="mt-2 text-ink-muted">{account.village} · {activeOffers} active offers in the community market</p>
        </div>
        <Link to="/buyer/wallet" className={buttonClass('secondary')}>Open wallet</Link>
      </header>

      <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="stats" className="sr-only">Summary</h2>
        <StatTile label="Demo wallet balance" value={formatCredits(account.balancePaise)} accent="emerald" />
        <StatTile label="Energy purchased" value={formatKwh(kwhTotal)} accent="amber" hint={`${mine.length} completed trades`} />
        <StatTile label="Simulated spend" value={formatCredits(spent)} accent="slate" />
        <StatTile label="Average price" value={`${formatCredits(Math.round(avgPrice))}/kWh`} hint={mine.length ? 'Weighted by kWh' : 'No trades yet'} />
      </section>

      <section aria-labelledby="market">
        <SectionHeading eyebrow="Live marketplace" title="Available energy offers" description="The same offers the sellers publish. Buying updates the seller's remaining quantity immediately." />
        <div className="mt-6">
          <MarketplaceBrowser compact />
        </div>
      </section>

      <section aria-labelledby="recent" className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Recent purchases</h2>
            <Link to="/buyer/transactions" className="text-sm font-medium text-forest-deep underline underline-offset-4">All transactions</Link>
          </div>
          {mine.length === 0 ? (
            <div className="mt-4"><EmptyState title="No purchases yet">Choose an offer above to make your first simulated purchase.</EmptyState></div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {mine.slice(0, 5).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{t.sellerLabel}</p>
                    <p className="text-xs text-ink-muted">{formatDateTime(t.createdAt)} · <span className="font-mono">{t.id}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatCredits(t.totalPaise)}</p>
                    <p className="text-xs text-ink-muted">{formatKwh(t.kwh)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl">Marketplace status</h2>
          <div className="flex items-center gap-2"><Badge tone="success">Open</Badge><span className="text-sm">Trading is open for demo credits.</span></div>
          <p className="text-sm text-ink-muted">Offers reflect each seller's illustrative surplus. Quantities are reserved as soon as a purchase completes.</p>
          <SimulationDisclaimer />
        </Card>
      </section>
    </div>
  )
}
