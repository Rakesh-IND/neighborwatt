/** Money is stored in paise (1/100 of a demo rupee). Display is ₹ with "demo" labelling in the UI. */
export const paiseToRupees = (paise: number) => paise / 100

export function formatCredits(paise: number): string {
  const sign = paise < 0 ? '-' : ''
  const abs = Math.abs(paise) / 100
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatKwh(kwh: number, digits = 2): string {
  return `${kwh.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })} kWh`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Round to 2 dp to keep kWh values free of float noise. */
export const round2 = (n: number) => Math.round(n * 100) / 100

/** Total cost in paise = kWh × paise per kWh, rounded to the nearest paise. */
export const totalPaiseFor = (kwh: number, pricePaise: number) => Math.round(kwh * pricePaise)

/** "Meera Hegde" -> "Meera H." */
export function householdLabel(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}
