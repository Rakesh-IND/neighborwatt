import { Link } from 'react-router-dom'
import { useAppState } from '../../stores/app-store'
import { useAuth } from '../../auth/AuthContext'
import { transactionsFor } from '../../services/transaction-service'
import { estimateSurplus, availableToList, committedKwh } from '../../services/surplus'
import { updateSellerSim, SimulationError } from '../../services/energy-simulation-service'
import { formatCredits, formatKwh, round2 } from '../../lib/format'
import { Card, StatTile, SectionHeading, Notice, Button, Field, SimulationDisclaimer, buttonClass, EmptyState } from '../../components/ui'
import { TransactionTable } from '../../components/ledger/TransactionTable'
import { useState } from 'react'
import type { SellerSim } from '../../types'
import { SurplusBars } from '../../components/energy/SurplusBars'

export default function SellerDashboard() {
  const { account } = useAuth()
  const state = useAppState()
  if (!account || !account.sim) return null
  const sim = account.sim
  const surplus = estimateSurplus(sim)
  const committed = committedKwh(state.offers, account.id)
  const free = availableToList(account, state.offers)
  const myOffers = state.offers.filter((o) => o.sellerId === account.id)
  const active = myOffers.filter((o) => o.status === 'active')
  const sold = myOffers.reduce((s, o) => s + o.soldKwh, 0)
  const earned = transactionsFor(account.id).filter((t) => t.sellerId === account.id).reduce((s, t) => s + t.totalPaise, 0)
  const ledger = transactionsFor(account.id).filter((t) => t.sellerId === account.id)

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber">Seller dashboard</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">{account.name}'s household</h1>
        <p className="mt-2 text-ink-muted">{account.village} · {account.solarCapacityKw} kW rooftop array (simulated)</p>
      </header>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Simulated generation" value={formatKwh(sim.generationKwh, 1)} accent="amber" hint="Typical day" />
        <StatTile label="Household demand" value={formatKwh(sim.demandKwh, 1)} accent="slate" />
        <StatTile label="Estimated surplus" value={formatKwh(surplus)} accent="emerald" hint="Illustrative estimate" />
        <StatTile label="Demo credits earned" value={formatCredits(earned)} accent="forest" hint={`${formatKwh(sold)} sold`} />
      </section>

      <section aria-labelledby="surplus" className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 id="surplus" className="text-xl">Surplus calculation</h2>
          <p className="mt-1 text-sm text-ink-muted">Estimated surplus = max(0, generation − demand − reserve)</p>
          <div className="mt-5"><SurplusBars sim={sim} /></div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-ink-muted">Required reserve</dt><dd className="font-semibold">{formatKwh(sim.reserveKwh)}</dd></div>
            <div><dt className="text-ink-muted">Committed to offers</dt><dd className="font-semibold">{formatKwh(committed)}</dd></div>
            <div className="col-span-2"><dt className="text-ink-muted">Free to list now</dt><dd className="font-display text-2xl text-forest-deep">{formatKwh(free)}</dd></div>
          </dl>
          <div className="mt-5"><SimulationDisclaimer>This surplus is an illustrative estimate from the inputs below. It does not represent verified physical electricity availability.</SimulationDisclaimer></div>
        </Card>
        <SimControls accountId={account.id} sim={sim} />
      </section>

      <section aria-labelledby="active">
        <SectionHeading
          eyebrow="Your offers"
          title="Active offers"
          action={<Link to="/seller/offers" className={buttonClass('primary')}>Create or manage offers</Link>}
        />
        <div className="mt-5">
          {active.length === 0 ? (
            <EmptyState title="No active offers">Publish part of your free surplus to appear in the marketplace.</EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {active.map((o) => (
                <li key={o.id}>
                  <Card className="p-4">
                    <p className="font-medium">{formatKwh(o.remainingKwh)} remaining · {formatCredits(o.pricePaise)}/kWh</p>
                    <p className="mt-1 text-xs text-ink-muted">Listed {formatKwh(o.originalKwh, 1)} · sold {formatKwh(o.soldKwh)}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ivory-deep" role="img" aria-label={`${Math.round((o.soldKwh / o.originalKwh) * 100)}% sold`}>
                      <div className="h-full bg-amber" style={{ width: `${(o.soldKwh / o.originalKwh) * 100}%` }} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Recent sales</h2>
          <Link to="/seller/transactions" className="text-sm font-medium text-forest-deep underline underline-offset-4">Full ledger</Link>
        </div>
        {ledger.length === 0 ? (
          <EmptyState title="No sales yet">Completed buyer purchases appear here with a verifiable record.</EmptyState>
        ) : (
          <TransactionTable rows={ledger.slice(0, 5)} viewer="seller" />
        )}
      </section>
    </div>
  )
}

function SimControls({ accountId, sim }: { accountId: string; sim: SellerSim }) {
  const [vals, setVals] = useState({ generationKwh: String(sim.generationKwh), demandKwh: String(sim.demandKwh), reserveKwh: String(sim.reserveKwh) })
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const nums = {
    generationKwh: Number(vals.generationKwh),
    demandKwh: Number(vals.demandKwh),
    reserveKwh: Number(vals.reserveKwh),
  }
  const hasInvalid = Object.values(vals).some((v) => v.trim() === '' || !Number.isFinite(Number(v)) || Number(v) < 0)
  const preview = hasInvalid ? null : round2(Math.max(0, nums.generationKwh - nums.demandKwh - nums.reserveKwh))

  return (
    <Card>
      <h2 className="text-xl">Simulation inputs</h2>
      <p className="mt-1 text-sm text-ink-muted">Adjust the typical-day figures. Surplus and free quantity recalculate on save.</p>
      <form
        className="mt-5 grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setOk(false)
          try {
            updateSellerSim(accountId, nums)
            setError(null)
            setOk(true)
          } catch (err) {
            setError(err instanceof SimulationError ? err.message : 'Could not update inputs.')
          }
        }}
      >
        {error && <Notice tone="danger" title="Inputs not saved">{error}</Notice>}
        {ok && <Notice tone="success" title="Simulation updated">Surplus has been recalculated.</Notice>}
        <Field label="Generation (kWh)" inputMode="decimal" suffix="kWh" value={vals.generationKwh} onChange={(e) => setVals({ ...vals, generationKwh: e.target.value })} error={vals.generationKwh !== '' && (!Number.isFinite(nums.generationKwh) || nums.generationKwh < 0) ? 'Enter 0 or more.' : undefined} />
        <Field label="Household demand (kWh)" inputMode="decimal" suffix="kWh" value={vals.demandKwh} onChange={(e) => setVals({ ...vals, demandKwh: e.target.value })} error={vals.demandKwh !== '' && (!Number.isFinite(nums.demandKwh) || nums.demandKwh < 0) ? 'Enter 0 or more.' : undefined} />
        <Field label="Required reserve (kWh)" inputMode="decimal" suffix="kWh" value={vals.reserveKwh} onChange={(e) => setVals({ ...vals, reserveKwh: e.target.value })} error={vals.reserveKwh !== '' && (!Number.isFinite(nums.reserveKwh) || nums.reserveKwh < 0) ? 'Enter 0 or more.' : undefined} />
        <p className="text-sm">Preview surplus: <span className="font-semibold tabular-nums">{preview === null ? '—' : formatKwh(preview)}</span></p>
        <Button type="submit" disabled={hasInvalid}>Save simulation inputs</Button>
      </form>
    </Card>
  )
}
