/**
 * Energy simulation — pure, deterministic. NO commands are sent to any physical equipment.
 * Units: power in kW, energy in kWh over a one-hour step.
 */
import { commit, getState } from '../stores/app-store'
import type { Account, Incident, SellerSim } from '../types'
import { round2 } from '../lib/format'
import { committedKwh, estimateSurplus } from './surplus'

export interface SimParams {
  /** Installed village PV peak in kW. */
  pvPeakKw: number
  /** Cloud cover 0–100 (%). 0 = clear sky. */
  cloudCover: number
  /** Village base demand in kW (lights, pumps, shops). */
  baseDemandKw: number
  /** Starting battery state of charge, 0–100 (%). */
  startSocPct: number
}

export interface BessSpec {
  capacityKwh: number
  reservePct: number
  maxChargeKw: number
  maxDischargeKw: number
  minSocPct: number
}

export const BESS: BessSpec = {
  capacityKwh: 60,
  reservePct: 25,
  maxChargeKw: 15,
  maxDischargeKw: 15,
  minSocPct: 10,
}

export const DEFAULT_SIM: SimParams = {
  pvPeakKw: 42,
  cloudCover: 15,
  baseDemandKw: 18,
  startSocPct: 60,
}

export type BessMode = 'charging' | 'discharging' | 'idle' | 'reserve_hold'

export interface HourPoint {
  hour: number
  solarKw: number
  demandKw: number
  netKw: number
  socPct: number
  mode: BessMode
  surplusKw: number
  unmetKw: number
  warning: string | null
}

/** Solar irradiance shape: a smooth daytime bell between 06:00 and 18:00. */
export function solarKwAt(hour: number, p: SimParams): number {
  if (hour < 6 || hour > 18) return 0
  const shape = Math.pow(Math.sin((Math.PI * (hour - 6)) / 12), 1.2)
  const clear = 1 - p.cloudCover / 100 * 0.6
  return round2(p.pvPeakKw * shape * clear)
}

/** Demand: base load plus a morning and an evening (19:00) peak. */
export function demandKwAt(hour: number, p: SimParams): number {
  const morning = 6 * Math.exp(-Math.pow(hour - 7, 2) / 3)
  const evening = 14 * Math.exp(-Math.pow(hour - 19, 2) / 4)
  return round2(p.baseDemandKw + morning + evening)
}

/** Steps through 24 hours and returns the operating state at every hour. */
export function simulateDay(p: SimParams = DEFAULT_SIM, bess: BessSpec = BESS): HourPoint[] {
  const points: HourPoint[] = []
  const reserveKwh = (bess.capacityKwh * bess.reservePct) / 100
  const minKwh = (bess.capacityKwh * bess.minSocPct) / 100
  let soc = (bess.capacityKwh * p.startSocPct) / 100

  for (let hour = 0; hour < 24; hour++) {
    const solar = solarKwAt(hour, p)
    const demand = demandKwAt(hour, p)
    const net = round2(solar - demand)
    let mode: BessMode = 'idle'
    let surplus = 0
    let unmet = 0
    let warning: string | null = null

    if (net > 0) {
      const room = bess.capacityKwh - soc
      const charge = Math.min(net, room, bess.maxChargeKw)
      soc += charge
      surplus = round2(net - charge)
      mode = charge > 0 ? 'charging' : 'idle'
    } else if (net < 0) {
      const deficit = -net
      const available = Math.max(0, soc - reserveKwh)
      const fromBattery = Math.min(deficit, available, bess.maxDischargeKw, Math.max(0, soc - minKwh))
      soc -= fromBattery
      unmet = round2(deficit - fromBattery)
      if (fromBattery > 0) mode = 'discharging'
      if (fromBattery === 0 && soc <= reserveKwh) mode = 'reserve_hold'
      if (unmet > 0.05) {
        warning = 'Demand exceeds solar and usable battery. Shift flexible loads away from this hour.'
      } else if (soc <= reserveKwh + 0.01 && mode !== 'idle') {
        warning = 'Battery reached its planned reserve. Hold discharge for essential loads.'
      }
    }

    points.push({
      hour,
      solarKw: solar,
      demandKw: demand,
      netKw: net,
      socPct: round2((soc / bess.capacityKwh) * 100),
      mode,
      surplusKw: surplus,
      unmetKw: unmet,
      warning,
    })
  }
  return points
}

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

/* ───────── Seller surplus simulation controls ───────── */

export class SimulationError extends Error {}

/** Update a seller's simulated inputs. Rejects any change that would undercut existing commitments. */
export function updateSellerSim(accountId: string, sim: SellerSim): SellerSim {
  for (const [k, v] of Object.entries(sim)) {
    if (!Number.isFinite(v) || v < 0 || v > 200) throw new SimulationError(`${k} must be between 0 and 200 kWh.`)
  }
  return commit((draft) => {
    const acc = draft.accounts.find((a) => a.id === accountId)
    if (!acc || acc.role !== 'seller') throw new SimulationError('Only seller accounts have surplus simulation.')
    const newSurplus = estimateSurplus(sim)
    const committed = committedKwh(draft.offers, accountId)
    if (newSurplus < committed) {
      throw new SimulationError(
        `Surplus would fall to ${newSurplus.toFixed(2)} kWh, below the ${committed.toFixed(2)} kWh already committed to offers. Reduce or cancel offers first.`,
      )
    }
    acc.sim = { ...sim }
    return { next: draft, result: acc.sim }
  })
}

/* ───────── Incidents (USSD outage reporting) ───────── */

export function reportIncident(input: {
  village: string
  category: Incident['category']
  note: string
  reportedBy: string
}): Incident {
  return commit((draft) => {
    const inc: Incident = {
      id: `INC-${Date.now().toString(36).toUpperCase()}`,
      village: input.village,
      category: input.category,
      note: input.note.slice(0, 140),
      reportedBy: input.reportedBy,
      createdAt: new Date().toISOString(),
      status: 'open',
    }
    draft.incidents.unshift(inc)
    return { next: draft, result: inc }
  })
}

export function sellerAccounts(): Account[] {
  return getState().accounts.filter((a) => a.role === 'seller')
}

/** Village aggregate of the seeded sellers' simulated inputs, used on the Energy Flow page. */
export function villageTotals() {
  const sellers = sellerAccounts().filter((s) => s.sim)
  return sellers.reduce(
    (t, s) => ({
      generationKwh: round2(t.generationKwh + s.sim!.generationKwh),
      demandKwh: round2(t.demandKwh + s.sim!.demandKwh),
      reserveKwh: round2(t.reserveKwh + s.sim!.reserveKwh),
      households: t.households + 1,
    }),
    { generationKwh: 0, demandKwh: 0, reserveKwh: 0, households: 0 },
  )
}
