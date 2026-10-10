import { useMemo, useState } from 'react'
import type { Transaction } from '../../types'
import { formatCredits, formatDateTime, formatKwh } from '../../lib/format'
import { ledgerChecksum } from '../../lib/checksum'
import { Badge, SelectField, Field } from '../ui'

type SortKey = 'date' | 'amount' | 'kwh'

/** Ledger table with date/amount/energy sorting and a checksum-verification action per row. */
export function TransactionTable({
  rows,
  viewer,
}: {
  rows: Transaction[]
  viewer: 'buyer' | 'seller'
}) {
  const [sort, setSort] = useState<SortKey>('date')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter((t) => {
      const other = viewer === 'buyer' ? t.sellerLabel : t.buyerLabel
      if (q && !(t.id.toLowerCase().includes(q) || other.toLowerCase().includes(q))) return false
      if (from && t.createdAt < new Date(from).toISOString()) return false
      if (to && t.createdAt > new Date(new Date(to).getTime() + 86_400_000).toISOString()) return false
      return true
    })
    list.sort((a, b) => {
      if (sort === 'amount') return b.totalPaise - a.totalPaise
      if (sort === 'kwh') return b.kwh - a.kwh
      return b.createdAt.localeCompare(a.createdAt)
    })
    return list
  }, [rows, query, from, to, sort, viewer])

  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search ID or counterparty" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="NW-…" />
        <Field label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <SelectField label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="date">Newest first</option>
          <option value="amount">Amount (high to low)</option>
          <option value="kwh">Energy (high to low)</option>
        </SelectField>
      </div>
      <p className="text-sm text-ink-muted" aria-live="polite">Showing {shown.length} of {rows.length} transactions</p>
      <div className="overflow-x-auto rounded-lg border border-line bg-paper">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Transaction history for {viewer}</caption>
          <thead className="border-b border-line bg-ivory-deep/50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Transaction ID</th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">{viewer === 'buyer' ? 'Seller' : 'Buyer'}</th>
              <th scope="col" className="px-4 py-3 text-right">Energy</th>
              <th scope="col" className="px-4 py-3 text-right">Price / kWh</th>
              <th scope="col" className="px-4 py-3 text-right">{viewer === 'buyer' ? 'Total paid' : 'Credits earned'}</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((t) => {
              const valid = ledgerChecksum({ id: t.id, buyerId: t.buyerId, sellerId: t.sellerId, offerId: t.offerId, kwh: t.kwh, pricePaise: t.pricePaise, totalPaise: t.totalPaise, createdAt: t.createdAt }) === t.checksum
              return (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-mono text-xs">{t.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-3">{viewer === 'buyer' ? t.sellerLabel : t.buyerLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatKwh(t.kwh)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCredits(t.pricePaise)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCredits(t.totalPaise)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="success">Completed</Badge>
                      <Badge tone={valid ? 'info' : 'danger'}>{valid ? 'Verified' : 'Checksum mismatch'}</Badge>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="text-sm text-ink-muted">No transactions match these filters.</p>}
    </div>
  )
}
