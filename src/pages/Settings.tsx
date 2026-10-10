import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAppState, resetStore } from '../stores/app-store'
import { updateProfile, changePassword, AuthError } from '../services/auth-service'
import { Card, Field, PasswordField, Button, Notice, SectionHeading, SimulationDisclaimer } from '../components/ui'

export default function Settings() {
  const { account } = useAuth()
  useAppState()
  if (!account) return null
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-12">
      <SectionHeading eyebrow="Account" title="Settings" description={`Signed in as ${account.role}. Your role controls which portal you can open.`} />
      <div className="mt-8 flex flex-col gap-6">
        <ProfileCard key={account.id + account.name + account.village} accountId={account.id} name={account.name} village={account.village} email={account.email} role={account.role} />
        <PasswordCard accountId={account.id} />
        <Card>
          <h2 className="text-lg">Demo data</h2>
          <p className="mt-1 text-sm text-ink-muted">Restore the seeded sample accounts, offers and an empty ledger. This affects this browser only.</p>
          <div className="mt-4">
            <Button variant="danger" onClick={async () => {
              if (window.confirm('Reset all demo data in this browser? Your registrations and transactions will be removed.')) {
                await resetStore()
                window.location.assign('/')
              }
            }}>Reset demo data</Button>
          </div>
        </Card>
        <SimulationDisclaimer />
      </div>
    </div>
  )
}

function ProfileCard({ accountId, name: initName, village: initVillage, email, role }: { accountId: string; name: string; village: string; email: string; role: string }) {
  const [name, setName] = useState(initName)
  const [village, setVillage] = useState(initVillage)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  return (
    <Card>
      <h2 className="text-lg">Profile</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => {
        e.preventDefault()
        setOk(false)
        try {
          updateProfile(accountId, { name, village })
          setErr(null); setOk(true)
        } catch (x) {
          setErr(x instanceof AuthError ? x.message : 'Could not save.')
        }
      }}>
        {err && <div className="sm:col-span-2"><Notice tone="danger">{err}</Notice></div>}
        {ok && <div className="sm:col-span-2"><Notice tone="success">Profile saved.</Notice></div>}
        <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Village or cluster" value={village} onChange={(e) => setVillage(e.target.value)} />
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">{email} · {role} account (email and role are fixed)</p>
          <Button type="submit">Save profile</Button>
        </div>
      </form>
    </Card>
  )
}

function PasswordCard({ accountId }: { accountId: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <Card>
      <h2 className="text-lg">Change password</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" noValidate onSubmit={async (e) => {
        e.preventDefault()
        setOk(false)
        if (next !== confirm) return setErr('New passwords do not match.')
        setBusy(true)
        try {
          await changePassword(accountId, current, next)
          setErr(null); setOk(true); setCurrent(''); setNext(''); setConfirm('')
        } catch (x) {
          setErr(x instanceof AuthError ? x.message : 'Could not change password.')
        } finally {
          setBusy(false)
        }
      }}>
        {err && <div className="sm:col-span-2"><Notice tone="danger">{err}</Notice></div>}
        {ok && <div className="sm:col-span-2"><Notice tone="success">Password updated.</Notice></div>}
        <PasswordField label="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className="sm:col-span-2" />
        <PasswordField label="New password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" hint="At least 8 characters, letters and numbers." />
        <PasswordField label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Updating…' : 'Update password'}</Button>
        </div>
      </form>
    </Card>
  )
}
