export type FieldErrors = Record<string, string>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isEmail = (v: string) => EMAIL.test(v.trim())

/** Validates a kWh quantity (positive, max 2 dp, finite, within a practical cap). */
export function validateKwh(raw: string | number, max: number): string | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (String(raw).trim() === '') return 'Enter an energy quantity in kWh.'
  if (!Number.isFinite(n)) return 'Quantity must be a number.'
  if (n <= 0) return 'Quantity must be greater than zero.'
  if (Math.round(n * 100) !== n * 100) return 'Use at most two decimal places.'
  if (n > max) return `Quantity cannot exceed ${max.toFixed(2)} kWh.`
  return null
}

/** Validates a price in rupees per kWh (positive, max 2 dp, sensible cap). Returns error or null. */
export function validatePriceRupees(raw: string | number): string | null {
  const s = String(raw).trim()
  if (s === '') return 'Enter a price per kWh.'
  const n = Number(s)
  if (!Number.isFinite(n)) return 'Price must be a number.'
  if (n <= 0) return 'Price must be greater than zero.'
  if (n > 100) return 'Price looks too high for a community tariff (max ₹100/kWh).'
  if (Math.round(n * 100) !== n * 100) return 'Use at most two decimal places.'
  return null
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Include both letters and numbers.'
  return null
}
