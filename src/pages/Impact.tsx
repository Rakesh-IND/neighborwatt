import { useAppState } from '../stores/app-store'
import { SectionHeading, Card, Badge, StatTile, SimulationDisclaimer } from '../components/ui'
import { formatKwh } from '../lib/format'

/* Illustrative sample metrics. Clearly separated from live counts measured in this prototype. */
const SAMPLE_METRICS = [
  { label: 'Participating households (pilot target)', value: '100' },
  { label: 'P2P energy volume (sample, per month)', value: '1,240 kWh' },
  { label: 'Energy-access hours (sample, per day)', value: '5.5 h' },
  { label: 'Solar utilisation (sample)', value: '78%' },
  { label: 'Battery utilisation (sample)', value: '64%' },
]

const SCORES = [
  { dimension: 'Tech readiness', score: 80 },
  { dimension: 'Cost viability', score: 66 },
  { dimension: 'Scalability', score: 85 },
  { dimension: 'Policy support', score: 83 },
  { dimension: 'Social uptake', score: 72 },
]

const ROADMAP = [
  { stage: 'Cooperative micro-grid pilot', months: 'Months 1–12' },
  { stage: 'P2P energy market', months: 'Months 6–18' },
  { stage: 'AI grid balancing', months: 'Months 12–24' },
  { stage: 'Carbon / impact monetisation', months: 'Months 24–36' },
]

export default function Impact() {
  const state = useAppState()
  const completed = state.transactions.length
  const kwhTraded = state.transactions.reduce((s, t) => s + t.kwh, 0)
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <SectionHeading eyebrow="Community impact" title="What the cooperative could achieve" description="Sample figures are illustrative targets, not measured results. Live counts come from this prototype's own ledger." />

      <section aria-labelledby="live" className="mt-10">
        <h2 id="live" className="text-xl">Measured in this prototype</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatTile label="Completed simulated transactions" value={completed} accent="emerald" hint="Live from the demo ledger" />
          <StatTile label="Energy traded in demo ledger" value={formatKwh(kwhTraded)} accent="amber" hint="Live from the demo ledger" />
        </div>
      </section>

      <section aria-labelledby="sample" className="mt-12">
        <div className="flex items-center gap-2">
          <h2 id="sample" className="text-xl">Sample projections</h2>
          <Badge tone="warning">Sample data</Badge>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SAMPLE_METRICS.map((m) => (
            <li key={m.label}>
              <Card className="h-full p-4">
                <p className="text-xs text-ink-muted">{m.label}</p>
                <p className="mt-2 font-display text-2xl text-forest-deep">{m.value}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="scores" className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 id="scores" className="text-xl">Feasibility scores</h2>
          <p className="mt-1 text-sm text-ink-muted">Green marks scores of 80% or above. Amber marks scores below 80%. Each score also carries its label.</p>
          <table className="mt-4 w-full text-left text-sm">
            <caption className="sr-only">Feasibility scores by dimension</caption>
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="py-2">Dimension</th>
                <th scope="col" className="py-2 text-right">Score</th>
                <th scope="col" className="py-2 pl-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SCORES.map((s) => {
                const good = s.score >= 80
                return (
                  <tr key={s.dimension}>
                    <td className="py-3">{s.dimension}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{s.score}%</td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-ivory-deep" aria-hidden>
                          <div className={`h-full ${good ? 'bg-emerald' : 'bg-amber'}`} style={{ width: `${s.score}%` }} />
                        </div>
                        <Badge tone={good ? 'success' : 'warning'}>{good ? '80%+' : 'Below 80%'}</Badge>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-xl">Proposed roadmap</h2>
          <p className="mt-1 text-sm text-ink-muted">These are proposed plans, not completed deployments or guaranteed outcomes.</p>
          <ol className="mt-4 space-y-3">
            {ROADMAP.map((r, i) => (
              <li key={r.stage}>
                <Card className="flex items-center gap-4 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest font-semibold text-ivory">{i + 1}</span>
                  <div>
                    <p className="font-medium">{r.stage}</p>
                    <p className="text-xs text-ink-muted">{r.months}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-12 max-w-2xl"><SimulationDisclaimer>Sample metrics and scores are project-planning figures. They are not measured outcomes from a deployed system.</SimulationDisclaimer></div>
    </div>
  )
}
