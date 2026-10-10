import { useMemo, useState } from 'react'
import { useAppState } from '../../stores/app-store'
import { useAuth } from '../../auth/AuthContext'
import { publishOffer, updateOffer, cancelOffer, validateOffer, OfferError } from '../../services/offer-service'
import { availableToList } from '../../services/surplus'
import { formatCredits, formatKwh, round2 } from '../../lib/format'
import { Button, Card, Field, Notice, SectionHeading, Badge, EmptyState, Modal, SimulationDisclaimer } from '../../components/ui'
import type { Offer } from '../../types'

export default function SellerOffers() {
  const { account } = useAuth()
  const state = useAppState()
  const [flash, setFlash] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [editing, setEditing] = useState<Offer | null>(null)
  const [cancelling, setCancelling] = useState<Offer | null>(null)
  if (!account || !account.sim) return null

  const free = availableToList(account, state.offers)
  const mine = state.offers.filter((o) => o.sellerId === account.id)
  const active = mine.filter((o) => o.status === 'active')
  const closed = mine.filter((o) => o.status !== 'active')

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading eyebrow="Offers" title="Publish surplus energy" description="Offers can only use the surplus that is still free after your existing commitments." />

      {flash && <Notice tone={flash.tone} title={flash.tone === 'success' ? 'Saved' : 'Not saved'}>{flash.text}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CreateOffer sellerId={account.id} free={free} onResult={setFlash} />
        <Card className="flex flex-col gap-3 self-start">
          <h2 className="text-lg">Your surplus</h2>
          <p className="text-3xl font-display text-forest-deep tabular-nums">{formatKwh(free)}</p>
          <p className="text-sm text-ink-muted">free to list now, after {formatKwh(round2(active.reduce((s, o) => s + o.remainingKwh, 0)))} already on active offers.</p>
          <SimulationDisclaimer>Illustrative surplus. Not verified physical availability.</SimulationDisclaimer>
        </Card>
      </div>

      <section aria-labelledby="active-offers" className="flex flex-col gap-4">
        <h2 id="active-offers" className="text-xl">Active offers</h2>
        {active.length === 0 ? (
          <EmptyState title="No active offers">Publish an offer above to make energy available to buyers.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-paper">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Your active energy offers</caption>
              <thead className="border-b border-line bg-ivory-deep/50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Description</th>
                  <th scope="col" className="px-4 py-3 text-right">Original</th>
                  <th scope="col" className="px-4 py-3 text-right">Remaining</th>
                  <th scope="col" className="px-4 py-3 text-right">Sold</th>
                  <th scope="col" className="px-4 py-3 text-right">Price / kWh</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {active.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">{o.description || <span className="text-ink-muted">No description</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKwh(o.originalKwh)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatKwh(o.remainingKwh)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKwh(o.soldKwh)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCredits(o.pricePaise)}</td>
                    <td className="px-4 py-3"><Badge tone="success">Active</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(o)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => setCancelling(o)}>Cancel</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <section aria-labelledby="closed-offers" className="flex flex-col gap-4">
          <h2 id="closed-offers" className="text-xl">Closed offers</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {closed.map((o) => (
              <li key={o.id}>
                <Card className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatKwh(o.originalKwh)} listed</span>
                    <Badge tone={o.status === 'sold_out' ? 'info' : 'neutral'}>{o.status === 'sold_out' ? 'Sold out' : 'Cancelled'}</Badge>
                  </div>
                  <p className="mt-1 text-ink-muted">Sold {formatKwh(o.soldKwh)} at {formatCredits(o.pricePaise)}/kWh. Historical record is kept.</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && <EditDialog offer={editing} sellerId={account.id} onClose={() => setEditing(null)} onResult={(f) => { setFlash(f); setEditing(null) }} />}
      {cancelling && (
        <Modal open onClose={() => setCancelling(null)} title="Cancel this offer?">
          <p className="text-sm text-ink-muted">
            The remaining {formatKwh(cancelling.remainingKwh)} is released back to your free surplus. Sales already completed ({formatKwh(cancelling.soldKwh)}) stay in your ledger.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelling(null)}>Keep offer</Button>
            <Button variant="danger" onClick={() => {
              try {
                cancelOffer(account.id, cancelling.id)
                setFlash({ tone: 'success', text: 'Offer cancelled. Remaining energy returned to your free surplus.' })
              } catch (e) {
                setFlash({ tone: 'danger', text: e instanceof Error ? e.message : 'Could not cancel.' })
              }
              setCancelling(null)
            }}>Cancel offer</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CreateOffer({ sellerId, free, onResult }: { sellerId: string; free: number; onResult: (f: { tone: 'success' | 'danger'; text: string }) => void }) {
  const [kwh, setKwh] = useState('')
  const [price, setPrice] = useState('')
  const [desc, setDesc] = useState('')
  const [hours, setHours] = useState('')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)

  const errors = useMemo(() => {
    if (!kwh && !price) return {}
    return validateOffer({ sellerId, kwh, priceRupees: price, description: desc }, free) as Record<string, string>
  }, [kwh, price, desc, free, sellerId])
  const hasErrors = Object.keys(errors).length > 0 || !kwh || !price

  const publish = () => {
    setBusy(true)
    try {
      const o = publishOffer({ sellerId, kwh, priceRupees: price, description: desc, validHours: hours ? Number(hours) : null })
      onResult({ tone: 'success', text: `Published ${formatKwh(o.remainingKwh)} at ${formatCredits(o.pricePaise)}/kWh. It is now visible in the marketplace.` })
      setKwh(''); setPrice(''); setDesc(''); setHours(''); setPreview(false)
    } catch (e) {
      onResult({ tone: 'danger', text: e instanceof OfferError ? e.message : 'Publish failed. Nothing was listed.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card as="section" aria-labelledby="create-offer-title">
      <h2 id="create-offer-title" className="text-xl">Create an offer</h2>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => { e.preventDefault(); if (!hasErrors) setPreview(true) }}>
        <Field label="Energy quantity" inputMode="decimal" suffix="kWh" value={kwh} onChange={(e) => setKwh(e.target.value)} error={errors.kwh} hint={`Up to ${formatKwh(free)} free`} />
        <Field label="Price per kWh" inputMode="decimal" suffix="₹" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} hint="Demo credits per kWh" />
        <Field label="Short description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} error={errors.description} className="sm:col-span-2" maxLength={160} />
        <div className="sm:col-span-2">
          <label htmlFor="validity" className="text-sm font-medium">Offer validity</label>
          <select id="validity" value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-md border border-line bg-paper px-3">
            <option value="">Until cancelled</option>
            <option value="6">6 hours</option>
            <option value="24">24 hours</option>
            <option value="72">3 days</option>
          </select>
        </div>
        <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 pt-2">
          <Button type="submit" variant="secondary" disabled={hasErrors}>Preview offer</Button>
        </div>
      </form>

      {preview && !hasErrors && (
        <div className="mt-5 rounded-md border border-emerald/40 bg-emerald-soft/50 p-4 text-sm">
          <p className="font-semibold">Preview</p>
          <p className="mt-1">Offering <strong>{formatKwh(round2(Number(kwh)))}</strong> at <strong>{formatCredits(Math.round(Number(price) * 100))}/kWh</strong>. Buyers would pay up to {formatCredits(Math.round(Number(kwh) * Number(price) * 100))} for the full quantity.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPreview(false)}>Edit</Button>
            <Button onClick={publish} disabled={busy} aria-busy={busy}>{busy ? 'Publishing…' : 'Publish offer'}</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function EditDialog({ offer, sellerId, onClose, onResult }: { offer: Offer; sellerId: string; onClose: () => void; onResult: (f: { tone: 'success' | 'danger'; text: string }) => void }) {
  const state = useAppState()
  const account = state.accounts.find((a) => a.id === sellerId)!
  const ceiling = round2(availableToList(account, state.offers, offer.id) + offer.remainingKwh)
  const [remaining, setRemaining] = useState(String(offer.remainingKwh))
  const [price, setPrice] = useState(String(offer.pricePaise / 100))
  const remNum = Number(remaining)
  const remErr = remaining.trim() === '' || !Number.isFinite(remNum) ? 'Enter a quantity.' : remNum < 0 ? 'Cannot be negative.' : remNum > ceiling ? `Only ${ceiling.toFixed(2)} kWh of surplus can go to this offer.` : null
  const priceErr = !Number.isFinite(Number(price)) || Number(price) <= 0 || Number(price) > 100 ? 'Enter a price between ₹0.01 and ₹100.' : null
  return (
    <Modal open onClose={onClose} title="Edit offer">
      <p className="mb-4 text-sm text-ink-muted">Sold energy ({formatKwh(offer.soldKwh)}) is part of your history and is not changed. Setting remaining to 0 cancels the offer.</p>
      <form className="grid gap-4" noValidate onSubmit={(e) => {
        e.preventDefault()
        if (remErr || priceErr) return
        try {
          updateOffer(sellerId, offer.id, { remainingKwh: remNum, pricePaise: Math.round(Number(price) * 100) })
          onResult({ tone: 'success', text: 'Offer updated.' })
        } catch (err) {
          onResult({ tone: 'danger', text: err instanceof Error ? err.message : 'Could not update the offer.' })
        }
      }}>
        <Field label="Remaining quantity" inputMode="decimal" suffix="kWh" value={remaining} onChange={(e) => setRemaining(e.target.value)} error={remErr ?? undefined} hint={`Max ${ceiling.toFixed(2)} kWh`} />
        <Field label="Price per kWh" inputMode="decimal" suffix="₹" value={price} onChange={(e) => setPrice(e.target.value)} error={priceErr ?? undefined} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={!!remErr || !!priceErr}>Save changes</Button>
        </div>
      </form>
    </Modal>
  )
}
