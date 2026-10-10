import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { buildForecast, buildRecommendation } from '../services/forecast-service'
import { Card, Notice, SectionHeading, StatTile, SimulationDisclaimer, Badge } from '../components/ui'
import { BESS, DEFAULT_SIM } from '../services/energy-simulation-service'

export default function Forecast() {
  const series = useMemo(() => buildForecast(DEFAULT_SIM), [])
  const rec = useMemo(() => buildRecommendation(DEFAULT_SIM), [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <SectionHeading
        eyebrow="Demand forecast"
        title="Plan for demand before it arrives"
        description="A transparent, rule-based baseline. It is not a trained model, and its accuracy has not been measured."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Forecast evening peak" value={`${rec.peakDemandKw.toFixed(1)} kW`} hint={`At ${String(rec.peakHour).padStart(2, '0')}:00`} accent="slate" />
        <StatTile label="Recommended reserve" value={`${rec.reservePct}%`} hint={`${rec.reserveKwh} kWh of ${BESS.capacityKwh} kWh`} accent="emerald" />
        <StatTile label="Solar production window" value={`${String(rec.solarWindow.start).padStart(2, '0')}–${String(rec.solarWindow.end).padStart(2, '0')}h`} accent="amber" />
        <StatTile label="Flexible load window" value={`${String(rec.flexibleWindow.start).padStart(2, '0')}–${String(rec.flexibleWindow.end).padStart(2, '0')}h`} hint="Shift irrigation here" accent="forest" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl">Solar vs. village demand</h2>
            <Badge tone="info">Forecast, deterministic</Badge>
          </div>
          <div className="mt-4 h-80 w-full" role="img" aria-label="Forecast solar generation, forecast demand and historical demand for 24 hours">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#d9d1bd" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5a625d' }} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: '#5a625d' }} unit=" kW" width={56} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="solarKw" name="Solar generation (kW)" stroke="#d99a2b" fill="#f6e6bf" />
                <Line type="monotone" dataKey="forecastDemandKw" name="Forecast demand (kW)" stroke="#4d6378" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="historicalDemandKw" name="Baseline demand, prior week (kW)" stroke="#8a9a8f" strokeDasharray="5 4" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-ink-muted">The prior-week line is a fixed weekday-pattern baseline used for comparison, not recorded meter data.</p>
        </Card>

        <div className="flex flex-col gap-6">
          <Card as="section" aria-labelledby="rec-title">
            <h2 id="rec-title" className="text-xl">Recommendation</h2>
            <Notice tone={rec.eveningDeficitKwh > 0 ? 'warning' : 'success'} title={rec.headline}>
              <p>{rec.body}</p>
            </Notice>
          </Card>
          <Card>
            <h2 className="text-lg">Why this recommendation</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {rec.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-8 max-w-2xl space-y-3">
        <Notice tone="info" title="Method and limits">
          Forecasts come from the simulation's clear-sky solar curve and a fixed demand profile. No accuracy figure is claimed. Production forecasting would need validated weather feeds and meter history.
        </Notice>
        <SimulationDisclaimer />
      </div>
    </div>
  )
}
