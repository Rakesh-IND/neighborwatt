import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, ShieldCheck, Sprout, Store } from 'lucide-react'
import type { Role } from '../../types'
import { useAuth } from '../../auth/AuthContext'
import { AuthError, register, validateRegistration, type RegisterErrors } from '../../services/auth-service'
import { Button, Card, Field, Notice, PasswordField } from '../../components/ui'
import { SAMPLE_CREDENTIALS, DEMO_PASSWORD } from '../../data/seed'

const COPY: Record<Role, { title: string; sub: string; icon: typeof Store; accent: string }> = {
  buyer: {
    title: 'Buyer sign-in',
    sub: 'Find surplus solar from neighbours, compare offers and settle purchases in demo credits.',
    icon: Store,
    accent: 'text-emerald',
  },
  seller: {
    title: 'Seller sign-in',
    sub: 'Review your simulated surplus, publish energy offers and track every sale you make.',
    icon: Sprout,
    accent: 'text-amber',
  },
}

export default function AuthPage({ role, mode }: { role: Role; mode: 'login' | 'register' }) {
  const { account, signIn } = useAuth()
  const location = useLocation()
  if (account) {
    // Already signed in: send to the dashboard for the signed-in role, never the other portal.
    return <Navigate to={`/${account.role}/dashboard`} replace />
  }
  return mode === 'login' ? (
    <LoginView role={role} from={(location.state as { from?: string } | null)?.from} signIn={signIn} />
  ) : (
    <RegisterView role={role} />
  )
}

function LoginView({ role, from, signIn }: { role: Role; from?: string; signIn: ReturnType<typeof useAuth>['signIn'] }) {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const c = COPY[role]
  const Icon = c.icon

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const next: typeof errors = {}
    if (!identifier.trim()) next.identifier = 'Enter your email or username.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      await signIn({ role, identifier, password, remember })
      setDone(true)
      navigate(from && from.startsWith(`/${role}`) ? from : `/${role}/dashboard`, { replace: true })
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center">
      <section className="max-w-md">
        <Icon className={c.accent} size={28} aria-hidden />
        <h1 className="mt-4 text-4xl">{c.title}</h1>
        <p className="mt-3 text-ink-muted">{c.sub}</p>
        <p className="mt-6 flex items-start gap-2 text-sm text-ink-muted">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald" aria-hidden />
          Demo authentication. Passwords are hashed in this browser, and the session is limited to the {role} portal. Production requires a managed identity provider.
        </p>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-forest-deep underline underline-offset-4">
          <ArrowLeft size={14} aria-hidden /> Return to home
        </Link>
      </section>

      <Card as="section" className="p-6 sm:p-8">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-label={`${role} sign-in form`}>
          {formError && <Notice tone="danger" title="Couldn't sign you in">{formError}</Notice>}
          {done && <Notice tone="success">Signed in. Opening your dashboard…</Notice>}
          <Field
            label="Email or username"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
            autoFocus
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-forest" />
            Remember this device
          </label>
          <Button type="submit" size="lg" disabled={loading} aria-busy={loading}>
            {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden /> Signing in…</> : `Sign in as ${role}`}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 text-sm">
            <span className="text-ink-muted">New to NeighborWatt?</span>
            <Link to={`/${role}/register`} className="font-semibold text-forest-deep underline underline-offset-4">
              Create {role} account
            </Link>
          </div>
          <details className="rounded-md border border-line bg-ivory-deep/50 p-3 text-xs text-ink-muted">
            <summary className="cursor-pointer font-medium text-charcoal">Sample demo credentials</summary>
            <p className="mt-2">
              Email: <code className="font-mono">{SAMPLE_CREDENTIALS[role].email}</code>
              <br />
              Password: <code className="font-mono">{DEMO_PASSWORD}</code>
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => {
                setIdentifier(SAMPLE_CREDENTIALS[role].email)
                setPassword(DEMO_PASSWORD)
              }}
            >
              Fill sample credentials
            </Button>
          </details>
        </form>
      </Card>
    </div>
  )
}

function RegisterView({ role }: { role: Role }) {
  const navigate = useNavigate()
  const c = COPY[role]
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    village: '',
    password: '',
    confirm: '',
    solarCapacityKw: '',
    generationKwh: '',
    demandKwh: '',
    reserveKwh: '',
  })
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    const errs = validateRegistration({ role, ...form })
    setErrors(errs)
    setFormError(null)
    if (Object.keys(errs).length) return
    setLoading(true)
    try {
      await register({ role, ...form })
      navigate('/' + role + '/login', { replace: true, state: { registered: true } })
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald">{role === 'buyer' ? 'Buyer' : 'Seller'} registration</p>
      <h1 className="mt-2 text-4xl">Create your {role} account</h1>
      <p className="mt-3 text-ink-muted">{c.sub}</p>

      <div className="mt-6 flex flex-wrap gap-2 text-sm" role="tablist" aria-label="Choose account type">
        <Link role="tab" aria-selected={role === 'buyer'} to="/buyer/register" className={tabCls(role === 'buyer')}>Buyer</Link>
        <Link role="tab" aria-selected={role === 'seller'} to="/seller/register" className={tabCls(role === 'seller')}>Seller</Link>
      </div>

      <Card as="section" className="mt-6">
        <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2" aria-label={`${role} registration form`}>
          {formError && <div className="sm:col-span-2"><Notice tone="danger" title="Registration failed">{formError}</Notice></div>}
          <Field label="Full name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" className="sm:col-span-2" />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <Field label="Username" value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" hint="3–20 letters, numbers or _" />
          <Field label={role === 'seller' ? 'Village or cluster' : 'Village or cluster'} value={form.village} onChange={set('village')} error={errors.village} className="sm:col-span-2" />
          <PasswordField label="Password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters with letters and numbers." autoComplete="new-password" />
          <PasswordField label="Confirm password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />

          {role === 'seller' && (
            <fieldset className="sm:col-span-2 grid gap-5 rounded-md border border-line p-4 sm:grid-cols-2">
              <legend className="px-1 text-sm font-semibold">Household solar profile (typical day, kWh)</legend>
              <Field label="Installed solar capacity" value={form.solarCapacityKw} onChange={set('solarCapacityKw')} error={errors.solarCapacityKw} inputMode="decimal" suffix="kW" />
              <Field label="Typical generation" value={form.generationKwh} onChange={set('generationKwh')} error={errors.generationKwh} inputMode="decimal" suffix="kWh" />
              <Field label="Household demand" value={form.demandKwh} onChange={set('demandKwh')} error={errors.demandKwh} inputMode="decimal" suffix="kWh" />
              <Field label="Required reserve" value={form.reserveKwh} onChange={set('reserveKwh')} error={errors.reserveKwh} inputMode="decimal" suffix="kWh" hint="Kept back for your own use." />
              <p className="sm:col-span-2 text-xs text-ink-muted">Surplus is estimated as max(0, generation − demand − reserve). It is illustrative and not verified physical availability.</p>
            </fieldset>
          )}

          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <Link to={`/${role}/login`} className="text-sm font-medium text-forest-deep underline underline-offset-4">Already registered? Sign in</Link>
            <Button type="submit" size="lg" disabled={loading} aria-busy={loading}>
              {loading ? 'Creating account…' : `Create ${role} account`}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function tabCls(active: boolean) {
  return `rounded-md border px-4 py-2 ${active ? 'border-forest bg-forest text-ivory' : 'border-line bg-paper hover:border-forest-soft'}`
}
