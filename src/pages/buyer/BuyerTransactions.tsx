import { useAppState } from '../../stores/app-store'
import { useAuth } from '../../auth/AuthContext'
import { transactionsFor } from '../../services/transaction-service'
import { TransactionTable } from '../../components/ledger/TransactionTable'
import { EmptyState, SectionHeading } from '../../components/ui'

export default function BuyerTransactions() {
  const { account } = useAuth()
  useAppState()
  if (!account) return null
  const rows = transactionsFor(account.id).filter((t) => t.buyerId === account.id)
  return (
    <div className="flex flex-col gap-6">
      <SectionHeading eyebrow="Ledger" title="Your purchases" description="Every completed purchase, with a checksum you can verify." />
      {rows.length === 0 ? (
        <EmptyState title="No transactions yet" action={<a href="/marketplace" className="text-sm font-medium text-forest-deep underline underline-offset-4">Browse the marketplace</a>}>
          Completed purchases appear here.
        </EmptyState>
      ) : (
        <TransactionTable rows={rows} viewer="buyer" />
      )}
    </div>
  )
}
