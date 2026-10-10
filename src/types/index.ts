export type Role = 'buyer' | 'seller'

/** Seller household simulation inputs, all in kWh for the current simulated settlement window. */
export interface SellerSim {
  generationKwh: number
  demandKwh: number
  reserveKwh: number
}

export interface Account {
  id: string
  role: Role
  name: string
  username: string
  email: string
  village: string
  passwordSalt: string
  passwordHash: string
  createdAt: string
  /** Demo credits held, stored in paise (integer) to avoid float drift. */
  balancePaise: number
  /** Seller only */
  solarCapacityKw?: number
  sim?: SellerSim
  /** Seeded sample data flag, shown in the UI. */
  isSample: boolean
}

export type OfferStatus = 'active' | 'sold_out' | 'cancelled'

export interface Offer {
  id: string
  sellerId: string
  sellerLabel: string
  soldKwh: number
  remainingKwh: number
  pricePaise: number
  /** Quantity listed when the offer was published. Immutable after publication. */
  originalKwh: number
  description: string
  status: OfferStatus
  createdAt: string
  updatedAt: string
  validUntil: string | null
}

export interface Transaction {
  id: string
  offerId: string
  buyerId: string
  sellerId: string
  buyerLabel: string
  sellerLabel: string
  kwh: number
  pricePaise: number
  totalPaise: number
  status: 'completed'
  channel: 'web' | 'ussd'
  createdAt: string
  checksum: string
}

export interface Incident {
  id: string
  village: string
  category: 'outage' | 'voltage' | 'battery'
  note: string
  reportedBy: string
  createdAt: string
  status: 'open'
}

export interface AppState {
  version: number
  accounts: Account[]
  offers: Offer[]
  transactions: Transaction[]
  incidents: Incident[]
  processedKeys: string[]
}

export interface Session {
  accountId: string
  role: Role
  startedAt: string
  remember: boolean
}
