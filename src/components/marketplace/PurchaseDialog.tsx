import { useMemo, useState } from 'react'
import { Modal, Field, Notice, Button } from '../ui'
import type { Offer, Transaction } from '../../types'
import { formatCredits, formatKwh, round2 } from '../../lib/format'
import { executePurchase, quotePurchase, TransactionError } from '../../services/transaction-service'
import { validateKwh } from '../../services/validation'

/**
 * Purchase flow: quantity → order summary → confirm. The idempotency key is created once per dialog
 * open, so double-clicking Confirm (or re-submitting after a network blip) cannot charge twice.
 */
export function PurchaseDialog({
  offer,
  buyerId,
  buyerBalancePaise,
  onClose,
  onComplete,
}: {
  offer: Offer
  buyerId: string
  buyerBalancePaise: number
  onClose: () => void
  onComplete: (tx: Transaction) => void
}) {
  const [kwhText, setKwhText] = useState('1')
  const [step, setStep] = useState<'quantity' | 'review'>('quantity')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idemKey] = useState(() => `${buyerId}:${offer.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`)

  const kwhError = validateKwh(kwhText, offer.remainingKwh)
  const kwh = round2(Number(kwhText))
  const quote = useMemo(
    () => (kwhError ? null : quotePurchase(buyerBalancePaise, offer, kwh)),
    [kwhError, buyerBalancePaise, offer, kwh],
  )
  const insufficient = quote ? quote.balanceAfterPaise < 0 : false

  const confirm = () => {
    if (processing) return
    setProcessing(true)
    setError(null)
    try {
      const tx = executePurchase({ buyerId, offerId: offer.id, kwh, idempotencyKey: idemKey, channel: 'web' })
      onComplete(tx)
    } catch (e) {
      setError(e instanceof TransactionError || e instanceof Error ? e.message : 'Purchase failed. Nothing was charged.')
      setProcessing(false)
    }
  }

  return (
    <Modal open onClose={processing ? () => undefined : onClose} title={step === 'quantity' ? 'Buy energy' : 'Review order'}>
      <p className="mb-4 text-sm text-ink-muted">
        From <span className="font-medium text-charcoal">{offer.sellerLabel}</span> · {formatCredits(offer.pricePaise)}/kWh · {formatKwh(offer.remainingKwh)} left
      </p>

      {step === 'quantity' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!kwhError) setStep('review')
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field
            label="Energy to purchase"
            name="kwh"
            inputMode="decimal"
            value={kwhText}
            onChange={(e) => setKwhText(e.target.value)}
            suffix="kWh"
            error={kwhError ?? undefined}
            hint={`Up to ${formatKwh(offer.remainingKwh)} from this offer.`}
            autoFocus
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!!kwhError}>Review order</Button>
          </div>
        </form>
      )}

      {step === 'review' && quote && (
        <div className="flex flex-col gap-4">
          <dl className="divide-y divide-line rounded-md border border-line text-sm">
            <Row label="Energy" value={formatKwh(quote.kwh)} />
            <Row label="Price per kWh" value={formatCredits(offer.pricePaise)} />
            <Row label="Total cost" value={formatCredits(quote.totalPaise)} strong />
            <Row label="Current demo balance" value={formatCredits(buyerBalancePaise)} />
            <Row label="Balance after purchase" value={formatCredits(quote.balanceAfterPaise)} tone={insufficient ? 'danger' : undefined} />
          </dl>
          <p className="text-xs text-ink-muted">Total = {formatKwh(quote.kwh)} × {formatCredits(offer.pricePaise)} per kWh. Settled in simulated demo credits.</p>
          {insufficient && (
            <Notice tone="danger" title="Insufficient demo balance">
              This order costs {formatCredits(quote.totalPaise)} and your balance is {formatCredits(buyerBalancePaise)}. Reduce the quantity.
            </Notice>
          )}
          {error && <Notice tone="danger" title="Order not completed">{error}</Notice>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('quantity')} disabled={processing}>Back</Button>
            <Button variant="ghost" onClick={onClose} disabled={processing}>Cancel</Button>
            <Button onClick={confirm} disabled={processing || insufficient} aria-busy={processing}>
              {processing ? 'Processing…' : 'Confirm purchase'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'danger' }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-display text-lg text-forest-deep' : ''} ${tone === 'danger' ? 'font-semibold text-danger' : ''}`}>{value}</dd>
    </div>
  )
}
