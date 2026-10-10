/**
 * DEMO authentication. Role-aware: sessions carry a role and every guarded page checks it.
 * Credentials are verified against PBKDF2 hashes stored in the browser. This is NOT production auth.
 * Production: use an identity provider (OIDC / Auth0 / Cognito) and enforce roles on the API.
 */
import { commit, getState } from '../stores/app-store'
import type { Account, Role, Session } from '../types'
import { hashPassword, randomSaltHex, verifyPassword } from '../lib/crypto'
import { householdLabel, round2 } from '../lib/format'
import { isEmail, validatePassword } from './validation'
import { SESSION_LOCAL_KEY, SESSION_TAB_KEY } from './storage'

export class AuthError extends Error {}

const sessionStore = {
  read(): Session | null {
    const raw = window.sessionStorage.getItem(SESSION_TAB_KEY) ?? window.localStorage.getItem(SESSION_LOCAL_KEY)
    if (!raw) return null
    try {
      const s = JSON.parse(raw) as Session
      return getState().accounts.some((a) => a.id === s.accountId) ? s : null
    } catch {
      return null
    }
  },
  write(s: Session) {
    const raw = JSON.stringify(s)
    if (s.remember) {
      window.localStorage.setItem(SESSION_LOCAL_KEY, raw)
      window.sessionStorage.removeItem(SESSION_TAB_KEY)
    } else {
      window.sessionStorage.setItem(SESSION_TAB_KEY, raw)
      window.localStorage.removeItem(SESSION_LOCAL_KEY)
    }
  },
  clear() {
    window.sessionStorage.removeItem(SESSION_TAB_KEY)
    window.localStorage.removeItem(SESSION_LOCAL_KEY)
  },
}

export const getSession = () => sessionStore.read()

export function getAccount(accountId: string): Account | undefined {
  return getState().accounts.find((a) => a.id === accountId)
}

export async function login(params: {
  role: Role
  identifier: string
  password: string
  remember: boolean
}): Promise<Account> {
  const id = params.identifier.trim().toLowerCase()
  if (!id || !params.password) throw new AuthError('Enter your email or username and password.')
  // Find by email or username, restricted to the requested role so the wrong portal never signs in.
  const acc = getState().accounts.find((a) => a.role === params.role && (a.email === id || a.username === id))
  // Always run one verification to keep timing similar whether or not the account exists.
  const ok = acc
    ? await verifyPassword(params.password, acc.passwordSalt, acc.passwordHash)
    : await verifyPassword(params.password, '00', '00')
  if (!acc || !ok) throw new AuthError(`Those details don't match a ${params.role} account. Check and try again.`)
  sessionStore.write({ accountId: acc.id, role: acc.role, startedAt: new Date().toISOString(), remember: params.remember })
  return acc
}

export function logout() {
  sessionStore.clear()
}

export interface RegisterInput {
  role: Role
  name: string
  email: string
  username: string
  village: string
  password: string
  confirm: string
  solarCapacityKw?: number | string
  generationKwh?: number | string
  demandKwh?: number | string
  reserveKwh?: number | string
}

export type RegisterErrors = Partial<Record<keyof RegisterInput | 'form', string>>

export function validateRegistration(input: RegisterInput): RegisterErrors {
  const e: RegisterErrors = {}
  if (input.name.trim().length < 2) e.name = 'Enter your full name.'
  if (!isEmail(input.email)) e.email = 'Enter a valid email address.'
  if (!/^[a-z0-9_]{3,20}$/i.test(input.username.trim())) e.username = 'Use 3–20 letters, numbers or underscores.'
  if (input.village.trim().length < 2) e.village = 'Enter your village or cluster.'
  const pw = validatePassword(input.password)
  if (pw) e.password = pw
  if (input.confirm !== input.password) e.confirm = 'Passwords do not match.'
  if (input.role === 'seller') {
    const cap = Number(input.solarCapacityKw)
    if (!Number.isFinite(cap) || cap < 1 || cap > 50) e.solarCapacityKw = 'Solar capacity must be between 1 and 50 kW.'
    const gen = Number(input.generationKwh), dem = Number(input.demandKwh), res = Number(input.reserveKwh)
    if (!Number.isFinite(gen) || gen < 0) e.generationKwh = 'Enter typical daily generation in kWh (0 or more).'
    if (!Number.isFinite(dem) || dem < 0) e.demandKwh = 'Enter typical household demand in kWh.'
    if (!Number.isFinite(res) || res < 0) e.reserveKwh = 'Enter a required reserve in kWh.'
  }
  return e
}

export async function register(input: RegisterInput): Promise<Account> {
  const errors = validateRegistration(input)
  if (Object.keys(errors).length) throw new AuthError(Object.values(errors)[0]!)
  const username = input.username.trim().toLowerCase()
  const email = input.email.trim().toLowerCase()

  const salt = randomSaltHex()
  const hash = await hashPassword(input.password, salt)
  const now = new Date().toISOString()

  const account = commit((draft) => {
    const taken = draft.accounts.some((a) => a.email === email || a.username === username)
    if (taken) throw new AuthError('An account with that email or username already exists.')
    const acc: Account = {
      id: `acc_${username}_${Math.random().toString(36).slice(2, 6)}`,
      role: input.role,
      name: input.name.trim(),
      username,
      email,
      village: input.village.trim(),
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: now,
      balancePaise: input.role === 'buyer' ? 50000 : 0, // demo starter credits for buyers
      isSample: false,
    }
    if (input.role === 'seller') {
      const gen = round2(Number(input.generationKwh)), dem = round2(Number(input.demandKwh)), res = round2(Number(input.reserveKwh))
      acc.solarCapacityKw = Number(input.solarCapacityKw)
      acc.sim = { generationKwh: gen, demandKwh: dem, reserveKwh: res }
    }
    draft.accounts.push(acc)
    return { next: draft, result: acc }
  })
  return account
}

export const householdName = (a: Account) => householdLabel(a.name)

/** Demo-only password change. Verifies the current password first. */
export async function changePassword(accountId: string, current: string, next: string): Promise<void> {
  const acc = getState().accounts.find((a) => a.id === accountId)
  if (!acc) throw new AuthError('Account not found.')
  if (!(await verifyPassword(current, acc.passwordSalt, acc.passwordHash))) {
    throw new AuthError('Current password is incorrect.')
  }
  const pwError = validatePassword(next)
  if (pwError) throw new AuthError(pwError)
  const salt = randomSaltHex()
  const hash = await hashPassword(next, salt)
  commit((draft) => {
    const a = draft.accounts.find((x) => x.id === accountId)!
    a.passwordSalt = salt
    a.passwordHash = hash
    return { next: draft, result: undefined }
  })
}

/** Profile edit for the signed-in account. Role and email are not editable here. */
export function updateProfile(accountId: string, patch: { name: string; village: string }): Account {
  if (patch.name.trim().length < 2) throw new AuthError('Enter your full name.')
  if (patch.village.trim().length < 2) throw new AuthError('Enter your village or cluster.')
  return commit((draft) => {
    const a = draft.accounts.find((x) => x.id === accountId)
    if (!a) throw new AuthError('Account not found.')
    a.name = patch.name.trim()
    a.village = patch.village.trim()
    return { next: draft, result: a }
  })
}
