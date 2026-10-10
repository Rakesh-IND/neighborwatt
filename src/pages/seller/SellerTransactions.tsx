import { useAppState } from '../../stores/app-store'
import { useAuth } from '../../auth/AuthContext'
import { transactionsFor } from '../../services/transaction-service'
import { TransactionTable } from '../../components/ledger/TransactionTable'
import { EmptyState, SectionHeading } from '../../components/ui'

export default function SellerTransactions() {
  const { account } = useAuth()
  useAppState()
  if (!account) return null
  const rows = transactionsFor(account.id).filter((t) => t.sellerId === account.id)
  return (
    <div className="flex flex-col gap-6">
      <SectionHeading eyebrow="Ledger" title="Your sales" description="Every sale is recorded once, with a checksum you can verify against the ledger." />
      {rows.length === 0 ? (
        <EmptyState title="No sales yet">When a buyer purchases one of your offers, the completed sale appears here.</EmptyState>
      ) : (
        <TransactionTable rows={rows} viewer="seller" />
      )}
    </div>
  )
}
