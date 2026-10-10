import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sun, BatteryCharging, Users } from 'lucide-react'
import { buttonClass, Card } from '../components/ui'
import { SimulationDisclaimer } from '../components/ui'

const PILLARS = [
  { icon: Sun, title: 'Local generation', body: 'Rooftop and community arrays feed the mesh where they stand.' },
  { icon: BatteryCharging, title: 'Shared storage', body: 'Batteries smooth the midday surplus into the evening peak.' },
  { icon: Users, title: 'Cooperative settlement', body: 'Neighbours trade kWh directly, with every transaction on a ledger.' },
]

export default function Landing() {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-forest-deep text-ivory">
        <img src="/hero-village.jpg" alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover opacity-35" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber">A peer-to-peer solar mesh</p>
            <h1 className="text-4xl leading-tight text-ivory sm:text-5xl lg:text-6xl">Power that stays in the neighbourhood.</h1>
            <p className="mt-5 max-w-xl text-lg text-ivory/80">
              NeighborWatt lets households sell their spare solar and lets neighbours buy it, with storage, forecasting and a shared ledger holding it together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/buyer/register" className={buttonClass('light', 'lg')}>
                Join as a buyer <ArrowRight size={18} aria-hidden />
              </Link>
              <Link to="/seller/register" className={buttonClass('secondary', 'lg', 'border-ivory/30 bg-transparent text-ivory hover:bg-white/10')}>
                Sell my surplus
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-3">
        {PILLARS.map((p, i) => (
          <motion.div key={p.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
            <Card className="h-full">
              <p.icon className="text-emerald" size={26} aria-hidden />
              <h2 className="mt-4 text-xl">{p.title}</h2>
              <p className="mt-2 text-ink-muted">{p.body}</p>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <SimulationDisclaimer />
      </section>
    </div>
  )
}
