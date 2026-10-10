import { Link } from 'react-router-dom'
import { Sun, BatteryCharging, Network, Receipt, Smartphone, ArrowRight } from 'lucide-react'
import { buttonClass, Card, SectionHeading } from '../components/ui'

const STEPS = [
  { icon: Sun, title: 'Generate', body: 'Rooftop and community solar arrays produce power. The controller tracks output and household demand.' },
  { icon: BatteryCharging, title: 'Store', body: 'A battery (BESS) absorbs midday surplus and holds a reserve for the evening peak.' },
  { icon: Network, title: 'Schedule', body: 'The energy-management layer plans charging, discharging and flexible loads from the forecast.' },
  { icon: Receipt, title: 'Exchange', body: 'Sellers publish offers from their free surplus. Buyers purchase in kWh. The ledger records each trade.' },
]

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <SectionHeading eyebrow="How it works" title="From rooftop to neighbour, in four steps" description="A prototype energy-accounting flow. Settlement uses simulated demo credits, not real money or real electricity delivery." />

      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Card className="flex h-full gap-4">
              <s.icon className="mt-1 shrink-0 text-amber" size={24} aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Step {i + 1}</p>
                <h2 className="mt-1 text-xl">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <section aria-labelledby="buyers-sellers" className="mt-14 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 id="buyers-sellers" className="text-2xl">For sellers</h2>
          <p className="mt-2 text-sm text-ink-muted">Enter your typical-day generation, demand and reserve. The app estimates surplus as max(0, generation − demand − reserve), then lets you publish a quantity no larger than what is still free.</p>
          <Link to="/seller/login" className={buttonClass('secondary', 'md', 'mt-5')}>Seller sign-in <ArrowRight size={16} aria-hidden /></Link>
        </Card>
        <Card>
          <h2 className="text-2xl">For buyers</h2>
          <p className="mt-2 text-sm text-ink-muted">Filter offers by quantity, price and seller. Choose kWh, review the order (kWh × price per kWh), then confirm. Your balance and the seller's account update together, or not at all.</p>
          <Link to="/buyer/login" className={buttonClass('secondary', 'md', 'mt-5')}>Buyer sign-in <ArrowRight size={16} aria-hidden /></Link>
        </Card>
      </section>

      <section aria-labelledby="no-phone" className="mt-14 rounded-lg bg-forest-deep p-8 text-ivory">
        <div className="flex flex-wrap items-center gap-6">
          <Smartphone size={36} className="text-amber" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="no-phone" className="text-2xl text-ivory">No smartphone required</h2>
            <p className="mt-2 text-sm text-ivory/80">Check balance, buy or sell energy and report outages from a feature phone through a USSD-style menu. This is a simulation. It is not connected to a telecom gateway.</p>
          </div>
          <Link to="/ussd" className={buttonClass('light')}>Try the menu</Link>
        </div>
      </section>
    </div>
  )
}
