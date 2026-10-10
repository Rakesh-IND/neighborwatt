import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { buttonClass } from '../ui'
import { cn } from '../../lib/cn'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 font-display text-xl text-forest-deep', className)} aria-label="NeighborWatt home">
      <img src="/logo-mark.png" alt="" width={32} height={32} className="size-8 rounded-md" />
      <span>NeighborWatt</span>
    </Link>
  )
}

const PUBLIC_LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/marketplace', label: 'Energy Marketplace' },
  { to: '/impact', label: 'Community Impact' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-md px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-ivory-deep font-semibold text-forest-deep' : 'text-charcoal/80 hover:text-forest-deep',
  )
}

function ProfileMenu() {
  const { account, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  if (!account) return null
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm hover:border-forest-soft"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-forest text-xs font-semibold text-ivory">
          {account.name.charAt(0)}
        </span>
        <span className="hidden text-left md:block">
          <span className="block font-medium leading-tight">{account.name}</span>
          <span className="block text-xs capitalize text-ink-muted">{account.role} account</span>
        </span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-md border border-line bg-paper p-1 shadow-lg">
          <Link role="menuitem" to={`/${account.role}/dashboard`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-ivory">
            <LayoutDashboard size={16} aria-hidden /> Go to dashboard
          </Link>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-ivory">
            Settings
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
          >
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function SiteLayout() {
  const { account } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  useEffect(() => setDrawer(false), [location.pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[60] rounded bg-forest px-3 py-2 text-ivory">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {PUBLIC_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {account ? (
              <ProfileMenu />
            ) : (
              <>
                <Link to="/buyer/login" className="rounded-md px-3 py-2 text-sm hover:text-forest-deep">
                  Buyer Login
                </Link>
                <Link to="/seller/login" className="rounded-md px-3 py-2 text-sm hover:text-forest-deep">
                  Seller Login
                </Link>
              </>
            )}
            <Link to="/marketplace" className={buttonClass('primary', 'sm')}>
              Explore Marketplace
            </Link>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md border border-line lg:hidden"
            aria-label={drawer ? 'Close menu' : 'Open menu'}
            aria-expanded={drawer}
            aria-controls="mobile-drawer"
            onClick={() => setDrawer((d) => !d)}
          >
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {drawer && (
          <div id="mobile-drawer" className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto border-t border-line bg-ivory p-4 lg:hidden">
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {PUBLIC_LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn('rounded-md px-3 py-3 text-base', isActive && 'bg-ivory-deep font-semibold')}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-6 grid gap-2 border-t border-line pt-6">
              {account ? (
                <>
                  <p className="text-sm text-ink-muted">Signed in as {account.name} ({account.role})</p>
                  <Link to={`/${account.role}/dashboard`} className={buttonClass('primary', 'lg')}>
                    Open {account.role} dashboard
                  </Link>
                  <Link to="/settings" className={buttonClass('secondary', 'lg')}>
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/buyer/login" className={buttonClass('secondary', 'lg')}>
                    Buyer Login
                  </Link>
                  <Link to="/seller/login" className={buttonClass('secondary', 'lg')}>
                    Seller Login
                  </Link>
                </>
              )}
              <Link to="/marketplace" className={buttonClass('primary', 'lg')}>
                Explore Marketplace
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-forest-deep text-ivory/85">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-display text-xl text-ivory">NeighborWatt</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ivory/70">Generate locally. Store intelligently. Exchange locally. Manage transparently.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
            <Link to="/how-it-works" className="hover:text-amber">How It Works</Link>
            <Link to="/marketplace" className="hover:text-amber">Marketplace</Link>
            <Link to="/energy-flow" className="hover:text-amber">Energy Flow</Link>
            <Link to="/forecast" className="hover:text-amber">Forecast</Link>
            <Link to="/ussd" className="hover:text-amber">Feature-phone access</Link>
            <Link to="/impact" className="hover:text-amber">Impact</Link>
          </nav>
          <p className="text-xs leading-relaxed text-ivory/60">
            Prototype for an academic innovation project. All accounts, prices, energy values and metrics are simulated demo data. Not an electricity retailer and not a financial service.
          </p>
        </div>
      </footer>
    </div>
  )
}
