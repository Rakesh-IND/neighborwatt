import { useLocation, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import type { Role } from '../types'
import { useAuth } from './AuthContext'

/**
 * Route guard. Unauthenticated visitors go to the login page for the portal they requested.
 * A signed-in user of the WRONG role is sent to their own dashboard, never shown the page.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { account } = useAuth()
  const location = useLocation()
  if (!account) {
    return <Navigate to={`/${role}/login`} replace state={{ from: location.pathname }} />
  }
  if (account.role !== role) {
    return <Navigate to={`/${account.role}/dashboard`} replace />
  }
  return <>{children}</>
}
