import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import type { SellerSim } from '../../types'
import { estimateSurplus } from '../../services/surplus'
import { round2 } from '../../lib/format'

/** Bar breakdown of generation into demand, reserve and surplus. */
export function SurplusBars({ sim }: { sim: SellerSim }) {
  const surplus = estimateSurplus(sim)
  const data = [
    { name: 'Generation', kwh: sim.generationKwh, fill: '#d99a2b' },
    { name: 'Demand', kwh: sim.demandKwh, fill: '#4d6378' },
    { name: 'Reserve', kwh: sim.reserveKwh, fill: '#8a9a8f' },
    { name: 'Surplus', kwh: surplus, fill: '#2f8f5b' },
  ]
  return (
    <div className="h-56 w-full" role="img" aria-label={`Generation ${sim.generationKwh} kWh, demand ${sim.demandKwh} kWh, reserve ${sim.reserveKwh} kWh, surplus ${surplus} kWh`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#d9d1bd" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5a625d' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#5a625d' }} axisLine={false} tickLine={false} width={44} />
          <Tooltip formatter={(v) => `${round2(Number(v))} kWh`} />
          <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
