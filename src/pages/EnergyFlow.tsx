import { useMemo, useState } from 'react'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { ArrowRight, AlertTriangle, BatteryMedium } from 'lucide-react'
import { BESS, DEFAULT_SIM, simulateDay, hourLabel, type SimParams } from '../services/energy-simulation-service'
import { Card, Notice, SectionHeading, StatTile, SimulationDisclaimer, Field } from '../components/ui'
import { formatKwh } from '../lib/format'

const STAGES = ['Solar PV', 'Controller / MPPT', 'BESS', 'Energy Management', 'Households']

export default function EnergyFlow() {
  const [params, setParams] = useState<SimParams>(DEFAULT_SIM)
  const [hour, setHour] = useState(12)
  const day = useMemo(() => simulateDay(params), [params])
  const current = day[hour]
  const totals = useMemo(
    () =>
      day.reduce(
        (t, p) => ({
          solar: t.solar + p.solarKw,
          demand: t.demand + p.demandKw,
          surplus: t.surplus + p.surplusKw,
          unmet: t.unmet + p.unmetKw,
        }),
        { solar: 0, demand: 0, surplus: 0, unmet: 0 },
      ),
    [day],
  )
  const warnings = day.filter((p) => p.warning)
  const modeLabel = { charging: 'Charging', discharging: 'Discharging', idle: 'Idle', reserve_hold: 'Holding reserve' }[current.mode]
  const state = current.netKw > 0 ? 'Surplus state' : current.netKw < 0 ? 'Deficit state' : 'Balanced'

  const set = (k: keyof SimParams) => (e: React.ChangeEvent<HTMLInputElement>) => setParams((p) => ({ ...p, [k]: Number(e.target.value) }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <SectionHeading eyebrow="Energy flow simulation" title="How a village day balances" description="A deterministic model of one village over 24 hours. Controls below change the inputs. Nothing here sends commands to real equipment." />

      {/* Flow diagram */}
      <ol aria-label="Energy flow path" className="mt-8 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-paper p-4 text-sm">
        {STAGES.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className="rounded-md border border-line bg-ivory px-3 py-2 font-medium text-forest-deep">{s}</span>
            {i < STAGES.length - 1 && <ArrowRight size={16} className="text-ink-muted" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <h2 className="text-xl">24-hour operation</h2>
          <p className="mt-1 text-sm text-ink-muted">Solar, demand and battery state of charge (SoC) across the day.</p>
          <div className="mt-4 h-80 w-full" role="img" aria-label="Chart of solar generation, village demand and battery state of charge over 24 hours">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={day} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#d9d1bd" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={hourLabel} tick={{ fontSize: 11, fill: '#5a625d' }} interval={3} />
                <YAxis yAxisId="kw" tick={{ fontSize: 11, fill: '#5a625d' }} unit=" kW" width={56} />
                <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: '#5a625d' }} unit="%" width={44} />
                <Tooltip labelFormatter={(h) => hourLabel(Number(h))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="kw" type="monotone" dataKey="solarKw" name="Solar (kW)" stroke="#d99a2b" fill="#f6e6bf" />
                <Line yAxisId="kw" type="monotone" dataKey="demandKw" name="Demand (kW)" stroke="#4d6378" strokeWidth={2} dot={false} />
                <Line yAxisId="soc" type="monotone" dataKey="socPct" name="Battery SoC (%)" stroke="#2f8f5b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label htmlFor="hour" className="text-sm font-medium">Inspect hour</label>
            <input id="hour" type="range" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="flex-1 accent-forest" />
            <span className="w-14 text-right font-mono text-sm">{hourLabel(hour)}</span>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-xl">Simulation controls</h2>
          <Field label="Peak PV capacity (kW)" type="number" min={5} max={80} step={1} value={params.pvPeakKw} onChange={set('pvPeakKw')} />
          <Field label="Cloud cover (%)" type="number" min={0} max={100} step={5} value={params.cloudCover} onChange={set('cloudCover')} />
          <Field label="Base village demand (kW)" type="number" min={0} max={60} step={1} value={params.baseDemandKw} onChange={set('baseDemandKw')} />
          <Field label="Starting battery SoC (%)" type="number" min={0} max={100} step={5} value={params.startSocPct} onChange={set('startSocPct')} />
          <button type="button" className="min-h-11 rounded-md border border-line text-sm hover:border-forest-soft" onClick={() => setParams(DEFAULT_SIM)}>Reset to defaults</button>
        </Card>
      </div>

      <section aria-labelledby="state" className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 id="state" className="text-xl">Current state at {hourLabel(hour)}</h2>
          <p className="mt-1 text-sm font-semibold text-forest-deep">{state}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-ink-muted">Solar</dt><dd className="font-semibold tabular-nums">{current.solarKw.toFixed(1)} kW</dd></div>
            <div><dt className="text-ink-muted">Demand</dt><dd className="font-semibold tabular-nums">{current.demandKw.toFixed(1)} kW</dd></div>
            <div><dt className="text-ink-muted">Battery</dt><dd className="font-semibold">{modeLabel}</dd></div>
            <div><dt className="text-ink-muted">Battery SoC</dt><dd className="font-semibold tabular-nums">{current.socPct.toFixed(0)}%</dd></div>
            <div><dt className="text-ink-muted">Surplus offered</dt><dd className="font-semibold tabular-nums">{current.surplusKw.toFixed(1)} kW</dd></div>
            <div><dt className="text-ink-muted">Unmet demand</dt><dd className="font-semibold tabular-nums">{current.unmetKw.toFixed(1)} kW</dd></div>
          </dl>
          {current.warning && <div className="mt-4"><Notice tone="warning" title="Deficit warning">{current.warning}</Notice></div>}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="flex items-center gap-2 text-xl"><BatteryMedium size={20} aria-hidden /> Battery dashboard</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink-muted">Capacity</dt><dd className="font-semibold">{formatKwh(BESS.capacityKwh, 0)}</dd></div>
              <div><dt className="text-ink-muted">Reserve target</dt><dd className="font-semibold">{BESS.reservePct}% ({formatKwh((BESS.capacityKwh * BESS.reservePct) / 100, 0)})</dd></div>
              <div><dt className="text-ink-muted">Max charge / discharge</dt><dd className="font-semibold">{BESS.maxChargeKw} kW</dd></div>
              <div><dt className="text-ink-muted">Minimum SoC</dt><dd className="font-semibold">{BESS.minSocPct}%</dd></div>
            </dl>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-ivory-deep" role="img" aria-label={`Battery at ${current.socPct.toFixed(0)} percent`}>
              <div className="h-full bg-emerald transition-[width] duration-500" style={{ width: `${current.socPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">Reserve line at {BESS.reservePct}%. Discharge stops at the reserve unless essential loads need it.</p>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Solar energy (day)" value={formatKwh(totals.solar, 0)} accent="amber" />
            <StatTile label="Demand (day)" value={formatKwh(totals.demand, 0)} accent="slate" />
            <StatTile label="Surplus (day)" value={formatKwh(totals.surplus, 1)} accent="emerald" />
            <StatTile label="Unmet (day)" value={formatKwh(totals.unmet, 1)} accent="forest" />
          </div>
        </div>
      </section>

      <section aria-labelledby="alerts" className="mt-8">
        <h2 id="alerts" className="text-xl">Alerts</h2>
        <div className="mt-4 space-y-3">
          {warnings.length === 0 ? (
            <Notice tone="success" title="No alerts">Solar and battery cover demand for the whole simulated day.</Notice>
          ) : (
            <>
              <Notice tone="warning" title={`${warnings.length} hour(s) need attention`}>
                <span className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />Shift flexible irrigation pumping to {hourLabel(11)}–{hourLabel(15)} when solar output is highest.</span>
              </Notice>
              <ul className="list-inside list-disc text-sm text-ink-muted">
                {warnings.slice(0, 6).map((w) => <li key={w.hour}>{hourLabel(w.hour)}: {w.warning}</li>)}
              </ul>
            </>
          )}
        </div>
      </section>

      <div className="mt-10 max-w-2xl"><SimulationDisclaimer>Simulation logic only. Battery and controller behaviour is modelled in software. The demo does not send commands to any electrical equipment. Surplus here feeds the seller's illustrative estimate.</SimulationDisclaimer></div>
    </div>
  )
}
