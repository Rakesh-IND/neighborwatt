import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import type { Role } from '../../types'
import { useAuth } from '../../auth/AuthContext'
import { Logo } from './SiteLayout'
import { cn } from '../../lib/cn'

const NAV: Record<Role, { to: string; label: string }[]> = {
  buyer: [
    { to: '/buyer/dashboard', label: 'Dashboard' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/buyer/wallet', label: 'Wallet' },
    { to: '/buyer/transactions', label: 'Transactions' },
    { to: '/forecast', label: 'Forecast' },
    { to: '/settings', label: 'Settings' },
  ],
  seller: [
    { to: '/seller/dashboard', label: 'Dashboard' },
    { to: '/seller/offers', label: 'Offers' },
    { to: '/seller/transactions', label: 'Transactions' },
    { to: '/energy-flow', label: 'Energy Flow' },
    { to: '/forecast', label: 'Forecast' },
    { to: '/settings', label: 'Settings' },
  ],
}

const ROLE_TITLE: Record<Role, string> = { buyer: 'Buyer Portal', seller: 'Seller Portal' }

/** Shell for signed-in pages: role-specific navigation, a mobile drawer and a sign-out action. */
export function PortalLayout({ role }: { role: Role }) {
  const { account, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  useEffect(() => setDrawer(false), [location.pathname])
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  const links = NAV[role]
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn('block rounded-md px-3 py-2.5 text-sm transition-colors', isActive ? 'bg-forest text-ivory' : 'text-charcoal/80 hover:bg-ivory-deep hover:text-forest-deep')

  return (
    <div className="min-h-dvh bg-ivory lg:flex">
      <a href="#portal-main" className="sr-only-focusable fixed left-3 top-3 z-[60] rounded bg-forest px-3 py-2 text-ivory">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-paper lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="border-b border-line p-5">
          <Logo />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald">{ROLE_TITLE[role]}</p>
        </div>
        <nav aria-label={`${role} navigation`} className="flex flex-1 flex-col gap-1 p-3">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-sm font-medium">{account?.name}</p>
          <p className="truncate text-xs text-ink-muted">{account?.village}</p>
          <button
            type="button"
            onClick={() => {
              signOut()
              navigate('/', { replace: true })
            }}
            className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-md border border-line px-3 text-sm hover:border-danger hover:text-danger"
          >
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ivory/95 px-4 backdrop-blur-sm lg:hidden">
          <Logo className="text-lg" />
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md border border-line"
            aria-label={drawer ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawer}
            aria-controls="portal-drawer"
            onClick={() => setDrawer((d) => !d)}
          >
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        {drawer && (
          <div id="portal-drawer" role="dialog" aria-label={`${role} navigation`} className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-ivory p-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => {
                signOut()
                navigate('/', { replace: true })
              }}
              className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line text-sm"
            >
              <LogOut size={16} aria-hidden /> Sign out
            </button>
          </div>
        )}
        <main id="portal-main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
