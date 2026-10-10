import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Eye, EyeOff, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ───────── Button ───────── */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-forest text-ivory hover:bg-forest-soft',
  secondary: 'bg-paper text-forest-deep border border-line hover:border-forest-soft hover:bg-ivory',
  ghost: 'text-forest-deep hover:bg-ivory-deep',
  danger: 'bg-danger text-white hover:brightness-110',
  light: 'bg-ivory text-forest-deep hover:bg-white',
}
const SIZE: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-200',
    'disabled:cursor-not-allowed disabled:opacity-50 select-none',
    VARIANT[variant],
    SIZE[size],
    extra,
  )

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />
}

/* ───────── Form fields ───────── */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  suffix?: string
  trailing?: ReactNode
}

export function Field({ label, error, hint, suffix, trailing, id, className, ...input }: FieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const describedBy = [error ? `${fieldId}-err` : null, hint && !error ? `${fieldId}-hint` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-charcoal">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full min-h-11 rounded-md border bg-paper px-3 text-base text-charcoal placeholder:text-ink-muted/70',
            'focus:border-forest-soft focus:outline-none',
            error ? 'border-danger' : 'border-line',
            !!suffix && !trailing ? 'pr-14' : undefined,
            trailing ? 'pr-12' : undefined,
          )}
          {...input}
        />
        {suffix && !trailing && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">{suffix}</span>
        )}
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-err`} className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <XCircle size={14} aria-hidden /> {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField(props: Omit<FieldProps, 'type' | 'suffix' | 'trailing'>) {
  const [shown, setShown] = useState(false)
  return (
    <Field
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="flex size-9 items-center justify-center rounded text-ink-muted hover:text-forest-deep"
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  )
}

export function SelectField({ label, id, children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const autoId = useId()
  const fid = id ?? autoId
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={fid} className="text-sm font-medium text-charcoal">
        {label}
      </label>
      <select id={fid} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base text-charcoal focus:border-forest-soft focus:outline-none" {...props}>
        {children}
      </select>
    </div>
  )
}

/* ───────── Surfaces & feedback ───────── */
export function Card({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={cn('rounded-lg border border-line bg-paper p-5 sm:p-6', className)}>{children}</Tag>
}

export function SectionHeading({ eyebrow, title, action, description }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

type Tone = 'info' | 'success' | 'warning' | 'danger'
const TONE: Record<Tone, { cls: string; icon: ReactNode }> = {
  info: { cls: 'border-slate/30 bg-slate-soft text-slate', icon: <Info size={18} aria-hidden /> },
  success: { cls: 'border-emerald/30 bg-emerald-soft text-forest-deep', icon: <CheckCircle2 size={18} aria-hidden /> },
  warning: { cls: 'border-amber/40 bg-amber-soft text-charcoal', icon: <AlertTriangle size={18} aria-hidden /> },
  danger: { cls: 'border-danger/30 bg-danger-soft text-danger', icon: <XCircle size={18} aria-hidden /> },
}

/** Feedback banner. Tone is conveyed by icon and title text, not colour alone. */
export function Notice({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const t = TONE[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-md border p-4 text-sm', t.cls)}>
      <span className="mt-0.5 shrink-0">{t.icon}</span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="mt-0.5 leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; children: ReactNode }) {
  const map = {
    neutral: 'bg-ivory-deep text-charcoal',
    success: 'bg-emerald-soft text-forest-deep',
    warning: 'bg-amber-soft text-charcoal',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-slate-soft text-slate',
  }
  return <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', map[tone])}>{children}</span>
}

export function StatTile({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: 'amber' | 'emerald' | 'slate' | 'forest' }) {
  const bar = { amber: 'bg-amber', emerald: 'bg-emerald', slate: 'bg-slate', forest: 'bg-forest' }[accent ?? 'forest']
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-paper p-5">
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-0.5', bar)} />
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl text-forest-deep tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-paper/60 p-8 text-center">
      <p className="font-display text-lg text-forest-deep">{title}</p>
      {children && <p className="mt-1 text-sm text-ink-muted">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function SimulationDisclaimer({ children }: { children?: ReactNode }) {
  return (
    <p className="rounded-md border border-line bg-ivory-deep/60 p-3 text-xs leading-relaxed text-ink-muted">
      <strong className="font-semibold text-charcoal">Prototype notice.</strong>{' '}
      {children ??
        'This marketplace uses simulated demo credits and represents a prototype energy-accounting workflow. It is not real electricity delivery or financial settlement, and surplus figures are illustrative estimates, not verified physical availability.'}
    </p>
  )
}

/** Modal with Escape-to-close, backdrop close and an accessible title. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-paper p-6 shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <XCircle size={18} aria-hidden />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
