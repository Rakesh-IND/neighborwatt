/**
 * Demand and solar forecast — DETERMINISTIC baseline.
 * This is a transparent rule-based estimate. It is not a trained model and its accuracy has not been measured.
 * Production: replace with a validated forecaster fed by weather data and meter readings.
 */
import { BESS, DEFAULT_SIM, demandKwAt, simulateDay, solarKwAt, type SimParams } from './energy-simulation-service'

export interface ForecastPoint {
  hour: number
  label: string
  solarKw: number
  forecastDemandKw: number
  /** Last-7-days baseline: the same hour, shifted by a fixed weekday pattern. Deterministic. */
  historicalDemandKw: number
}

export interface Recommendation {
  headline: string
  body: string
  reserveKwh: number
  reservePct: number
  peakHour: number
  peakDemandKw: number
  solarWindow: { start: number; end: number }
  flexibleWindow: { start: number; end: number }
  eveningDeficitKwh: number
  reasons: string[]
}

/** Weekday pattern: a fixed multiplicative profile, so the "historical" line is reproducible. */
const WEEKDAY_FACTORS = [0.97, 1.02, 1.0, 1.04, 0.99, 1.06, 1.01]

export function buildForecast(p: SimParams = DEFAULT_SIM, dayIndex = 3): ForecastPoint[] {
  const factor = WEEKDAY_FACTORS[dayIndex % WEEKDAY_FACTORS.length]
  return Array.from({ length: 24 }, (_, hour) => {
    const forecastDemand = demandKwAt(hour, p)
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      solarKw: solarKwAt(hour, p),
      forecastDemandKw: forecastDemand,
      historicalDemandKw: Math.round(forecastDemand * factor * 100) / 100,
    }
  })
}

export function buildRecommendation(p: SimParams = DEFAULT_SIM): Recommendation {
  const series = buildForecast(p)
  const sim = simulateDay(p)
  const peak = series.reduce((a, b) => (b.forecastDemandKw > a.forecastDemandKw ? b : a))
  const solarHours = series.filter((s) => s.solarKw > 0.5)
  const solarStart = solarHours[0]?.hour ?? 6
  const solarEnd = solarHours[solarHours.length - 1]?.hour ?? 18

  // Evening window: 17:00–22:00. Deficit is the unmet energy the battery cannot cover after reserve.
  const eveningDeficit = series
    .filter((s) => s.hour >= 17 && s.hour <= 22)
    .reduce((t, s) => t + Math.max(0, s.forecastDemandKw - s.solarKw), 0)
  const reserveKwh = Math.min(BESS.capacityKwh, Math.round(eveningDeficit * 1.2 * 10) / 10)
  const reservePct = Math.round((reserveKwh / BESS.capacityKwh) * 100)

  const eveningDemandExceeds = sim.some((h) => h.hour >= 18 && h.hour <= 22 && h.netKw < 0)
  const headline = eveningDemandExceeds
    ? 'Evening demand is expected to exceed solar generation.'
    : 'Solar is expected to cover demand through the evening.'
  const body = eveningDemandExceeds
    ? `Maintain a ${reservePct}% battery reserve (${reserveKwh} kWh) before 17:00, and shift flexible irrigation demand toward the solar-production window (${String(solarStart).padStart(2, '0')}:00–${String(solarEnd).padStart(2, '0')}:00).`
    : 'Keep the battery near full and schedule flexible irrigation within the solar window.'

  return {
    headline,
    body,
    reserveKwh,
    reservePct,
    peakHour: peak.hour,
    peakDemandKw: peak.forecastDemandKw,
    solarWindow: { start: solarStart, end: solarEnd },
    flexibleWindow: { start: 11, end: 15 },
    eveningDeficitKwh: Math.round(eveningDeficit * 100) / 100,
    reasons: [
      `Forecast evening peak of ${peak.forecastDemandKw.toFixed(1)} kW at ${peak.label}.`,
      `Solar output is above 0.5 kW between ${String(solarStart).padStart(2, '0')}:00 and ${String(solarEnd).padStart(2, '0')}:00.`,
      `Unmet evening energy (17:00–22:00) before battery support: ${eveningDeficit.toFixed(1)} kWh.`,
      `Reserve target is set at 120% of that deficit, capped at battery capacity (${BESS.capacityKwh} kWh).`,
    ],
  }
}
