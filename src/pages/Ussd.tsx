import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { useAppState } from '../stores/app-store'
import { executePurchase, TransactionError } from '../services/transaction-service'
import { publishOffer, OfferError } from '../services/offer-service'
import { reportIncident } from '../services/energy-simulation-service'
import { availableToList, estimateSurplus } from '../services/surplus'
import type { Account, AppState, Offer } from '../types'
import { formatCredits, formatKwh } from '../lib/format'
import { Card, SectionHeading, SimulationDisclaimer, Button } from '../components/ui'

/**
 * Simulated USSD session. Demo phone = buyer "Sunita Devi" (for purchases) and
 * seller "Meera Hegde" (for sales). Not connected to any telecom gateway.
 */
const BUYER_ID = 'acc_sunita'
const SELLER_ID = 'acc_meera'

type Screen =
  | { k: 'home' }
  | { k: 'balance' }
  | { k: 'buy_pick' }
  | { k: 'buy_qty'; offerId: string }
  | { k: 'buy_confirm'; offerId: string; kwh: number }
  | { k: 'sell_menu' }
  | { k: 'sell_qty' }
  | { k: 'sell_price'; kwh: number }
  | { k: 'outage_pick' }
  | { k: 'outage_done'; id: string }
  | { k: 'message'; text: string; tone?: 'ok' | 'err' }

const MENU = ['Check Balance', 'Buy Energy', 'Sell Surplus', 'Report Outage']

export default function Ussd() {
  const state = useAppState()
  const [screen, setScreen] = useState<Screen>({ k: 'home' })
  const [input, setInput] = useState('')

  const buyer = state.accounts.find((a) => a.id === BUYER_ID)!
  const seller = state.accounts.find((a) => a.id === SELLER_ID)!
  const free = availableToList(seller, state.offers)
  const offers = state.offers.filter((o) => o.status === 'active' && o.remainingKwh > 0)

  const go = (s: Screen) => {
    setInput('')
    setScreen(s)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = input.trim()
    switch (screen.k) {
      case 'home': {
        const n = Number(v)
        if (n === 1) go({ k: 'balance' })
        else if (n === 2) go({ k: 'buy_pick' })
        else if (n === 3) go({ k: 'sell_menu' })
        else if (n === 4) go({ k: 'outage_pick' })
        else go({ k: 'message', text: 'Invalid choice. Enter 1 to 4.', tone: 'err' })
        return
      }
      case 'balance':
        return go({ k: 'home' })
      case 'buy_pick': {
        if (v === '0') return go({ k: 'home' })
        const idx = Number(v) - 1
        const o = offers[idx]
        if (!o) return go({ k: 'message', text: 'Invalid offer. Try again.', tone: 'err' })
        return go({ k: 'buy_qty', offerId: o.id })
      }
      case 'buy_qty': {
        const offer = state.offers.find((o) => o.id === screen.offerId)
        const kwh = Number(v)
        if (!offer || offer.status !== 'active') return go({ k: 'message', text: 'That offer is no longer available.', tone: 'err' })
        if (!Number.isFinite(kwh) || kwh <= 0 || kwh > offer.remainingKwh) {
          return go({ k: 'message', text: `Enter kWh between 0.01 and ${offer.remainingKwh.toFixed(2)}.`, tone: 'err' })
        }
        return go({ k: 'buy_confirm', offerId: offer.id, kwh: Math.round(kwh * 100) / 100 })
      }
      case 'buy_confirm': {
        if (v !== '1') return go({ k: 'home' })
        try {
          const tx = executePurchase({
            buyerId: BUYER_ID,
            offerId: screen.offerId,
            kwh: screen.kwh,
            idempotencyKey: `ussd:${Date.now()}:${Math.random().toString(36).slice(2)}`,
            channel: 'ussd',
          })
          return go({ k: 'message', text: `Bought ${tx.kwh.toFixed(2)} kWh for ${formatCredits(tx.totalPaise)}. Ref ${tx.id}.`, tone: 'ok' })
        } catch (err) {
          return go({ k: 'message', text: err instanceof TransactionError ? err.message : 'Purchase failed. Nothing was charged.', tone: 'err' })
        }
      }
      case 'sell_menu': {
        if (v === '1') return go({ k: 'sell_qty' })
        if (v === '0') return go({ k: 'home' })
        return go({ k: 'message', text: 'Enter 1 to publish or 0 to go back.', tone: 'err' })
      }
      case 'sell_qty': {
        const kwh = Number(v)
        if (!Number.isFinite(kwh) || kwh <= 0 || kwh > free) {
          return go({ k: 'message', text: `Enter kWh between 0.01 and ${free.toFixed(2)} (free surplus).`, tone: 'err' })
        }
        return go({ k: 'sell_price', kwh: Math.round(kwh * 100) / 100 })
      }
      case 'sell_price': {
        try {
          const o = publishOffer({ sellerId: SELLER_ID, kwh: screen.kwh, priceRupees: v, description: 'Published via feature phone' })
          return go({ k: 'message', text: `Offer published: ${formatKwh(o.remainingKwh)} at ${formatCredits(o.pricePaise)}/kWh.`, tone: 'ok' })
        } catch (err) {
          return go({ k: 'message', text: err instanceof OfferError ? err.message : 'Could not publish.', tone: 'err' })
        }
      }
      case 'outage_pick': {
        const cat = ({ '1': 'outage', '2': 'voltage', '3': 'battery' } as const)[v as '1' | '2' | '3']
        if (!cat) return go({ k: 'message', text: 'Enter 1, 2 or 3.', tone: 'err' })
        const inc = reportIncident({ village: buyer.village, category: cat, note: `Reported by ${buyer.name} via USSD`, reportedBy: buyer.id })
        return go({ k: 'outage_done', id: inc.id })
      }
      default:
        return go({ k: 'home' })
    }
  }

  const screenText = renderScreen(screen, { buyer, seller, offers, free, state })
  const needsInput = !['balance', 'message', 'outage_done'].includes(screen.k)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <SectionHeading eyebrow="Feature-phone access" title="Energy services without a smartphone" description="A keypad menu for the same marketplace. Use it to check balance, buy or sell energy, or report an outage." />
      <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-soft px-3 py-2 text-sm font-semibold text-forest-deep"><Smartphone size={16} aria-hidden /> No smartphone required.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="mx-auto w-full max-w-[340px]">
          <div className="rounded-[2.2rem] border-[10px] border-charcoal bg-ivory-deep p-4 shadow-md" role="group" aria-label="Simulated feature phone">
            <div className="rounded-xl bg-[#c9d6bf] p-4 font-mono text-sm leading-relaxed text-charcoal min-h-72" aria-live="polite">
              <p className="mb-2 text-xs text-charcoal/70">*123# · NeighborWatt</p>
              <pre className="whitespace-pre-wrap font-mono">{screenText}</pre>
            </div>
            {needsInput ? (
              <form onSubmit={submit} className="mt-4 flex gap-2">
                <label htmlFor="ussd-input" className="sr-only">Enter your choice</label>
                <input
                  id="ussd-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  className="min-h-11 flex-1 rounded-md border border-charcoal bg-ivory px-3 font-mono text-lg"
                  autoFocus
                />
                <Button type="submit" size="md">Send</Button>
              </form>
            ) : (
              <div className="mt-4">
                <Button className="w-full" onClick={() => go({ k: 'home' })}>{screen.k === 'home' ? 'Menu' : 'OK / Back to menu'}</Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-lg">How the simulation works</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Demo phone: buyer <strong className="text-charcoal">{buyer.name}</strong>, seller <strong className="text-charcoal">{seller.name}</strong>.</li>
              <li>Balance shows the buyer's demo credits and trade count.</li>
              <li>Buying and selling use the same transaction and offer services as the web portals.</li>
              <li>Outage reports create a simulated incident visible to operators.</li>
            </ul>
            <p className="mt-4 text-sm"><span className="font-semibold">Current free surplus (seller):</span> {formatKwh(free)} · estimate {formatKwh(estimateSurplus(seller.sim!))} before commitments.</p>
          </Card>
          <Card>
            <h2 className="text-lg">Recent incidents</h2>
            {state.incidents.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">No outage reports yet. Use option 4 to create one.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {state.incidents.slice(0, 5).map((i) => (
                  <li key={i.id} className="py-2"><span className="font-mono">{i.id}</span> · {i.category} · {i.village} · {i.status}</li>
                ))}
              </ul>
            )}
          </Card>
          <SimulationDisclaimer>This is a prototype. It is not connected to a telecom USSD gateway. Real USSD access is a future integration.</SimulationDisclaimer>
        </div>
      </div>
    </div>
  )
}

function renderScreen(
  s: Screen,
  ctx: { buyer: Account; seller: Account; offers: Offer[]; free: number; state: AppState },
): string {
  const menu = MENU.map((m, i) => `${i + 1}. ${m}`).join('\n')
  switch (s.k) {
    case 'home':
      return `NeighborWatt\n${menu}\n\nEnter choice:`
    case 'balance': {
      const trades = ctx.state.transactions.filter((t) => t.buyerId === 'acc_sunita').length
      return `Balance\n${formatCredits(ctx.buyer.balancePaise)}\nTrades: ${trades}\n\n0. Back`
    }
    case 'buy_pick': {
      const list = ctx.offers.slice(0, 5).map((o, i) => `${i + 1}. ${o.sellerLabel} ${o.remainingKwh.toFixed(1)}kWh @${formatCredits(o.pricePaise)}`)
      return `Buy energy\n${list.join('\n') || 'No offers'}\n\n0. Back\nEnter offer no:`
    }
    case 'buy_qty':
      return 'Enter kWh to buy:'
    case 'buy_confirm': {
      return `Confirm purchase\n${s.kwh.toFixed(2)} kWh\n\n1. Confirm\n0. Cancel`
    }
    case 'sell_menu':
      return `Sell surplus\nFree now: ${ctx.free.toFixed(2)} kWh\n\n1. Publish offer\n0. Back`
    case 'sell_qty':
      return `Publish offer\nEnter kWh to sell (max ${ctx.free.toFixed(2)}):`
    case 'sell_price':
      return `Publish ${s.kwh.toFixed(2)} kWh\nEnter price in ₹ per kWh:`
    case 'outage_pick':
      return 'Report outage\n1. Power outage\n2. Voltage fluctuation\n3. Battery issue\n\nEnter choice:'
    case 'outage_done':
      return `Report logged\nRef ${s.id}\nThank you. The cooperative has been alerted.`
    case 'message':
      return `${s.tone === 'err' ? 'Error' : 'Done'}\n${s.text}`
  }
}
