import { Link } from 'react-router-dom'
import { buttonClass } from '../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-amber">404</p>
      <h1 className="text-4xl">This page isn't on the grid.</h1>
      <p className="text-ink-muted">The link may be out of date, or the page was moved. Head back to the marketplace or your home page.</p>
      <div className="flex flex-wrap gap-3">
        <Link to="/" className={buttonClass('primary')}>Home</Link>
        <Link to="/marketplace" className={buttonClass('secondary')}>Marketplace</Link>
      </div>
    </div>
  )
}
