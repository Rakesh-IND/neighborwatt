import { useAppState } from '../../stores/app-store'
import { useAuth } from '../../auth/AuthContext'
import { transactionsFor } from '../../services/transaction-service'
import { formatCredits, formatKwh } from '../../lib/format'
import { StatTile, Card, SimulationDisclaimer } from '../../components/ui'

export default function BuyerWallet() {
  const { account } = useAuth()
  useAppState()
  if (!account) return null
  const mine = transactionsFor(account.id).filter((t) => t.buyerId === account.id)
  const kwh = mine.reduce((s, t) => s + t.kwh, 0)
  const spent = mine.reduce((s, t) => s + t.totalPaise, 0)
  const sellers = new Set(mine.map((t) => t.sellerId)).size
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald">Wallet</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Demo credit wallet</h1>
      </div>
      <section aria-label="Wallet summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Current balance" value={formatCredits(account.balancePaise)} accent="emerald" />
        <StatTile label="Total energy purchased" value={formatKwh(kwh)} accent="amber" />
        <StatTile label="Total simulated spend" value={formatCredits(spent)} accent="slate" />
        <StatTile label="Completed trades" value={mine.length} hint={`${sellers} sellers`} />
      </section>
      <Card>
        <h2 className="text-xl">About this wallet</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Each buyer starts with ₹500.00 of demo credit. Purchases deduct the total cost (kWh × price per kWh) and the amount is credited to the seller's demo account. Balances can never go negative.
        </p>
        <div className="mt-5"><SimulationDisclaimer /></div>
      </Card>
    </div>
  )
}
