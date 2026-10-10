import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Account, Role } from '../types'
import { useAppState } from '../stores/app-store'
import { getSession, logout as doLogout, login as doLogin, getAccount } from '../services/auth-service'
import type { Session } from '../types'

interface AuthValue {
  account: Account | null
  role: Role | null
  session: Session | null
  signIn: (p: { role: Role; identifier: string; password: string; remember: boolean }) => Promise<Account>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Re-read session whenever the store changes so deleted/reset accounts drop their session.
  const state = useAppState()
  const [session, setSession] = useState<Session | null>(() => getSession())

  const account = useMemo(() => {
    if (!session) return null
    return state.accounts.find((a) => a.id === session.accountId) ?? null
  }, [session, state.accounts])

  const signIn = useCallback<AuthValue['signIn']>(async (p) => {
    const acc = await doLogin(p)
    setSession(getSession())
    return acc
  }, [])

  const signOut = useCallback(() => {
    doLogout()
    setSession(null)
  }, [])

  const value: AuthValue = {
    account,
    role: account?.role ?? null,
    session: account ? session : null,
    signIn,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export { getAccount }
