import type { AppState, Account, Offer } from '../types'
import { hashPassword, randomSaltHex } from '../lib/crypto'
import { householdLabel } from '../lib/format'
const STATE_VERSION = 1

/** Sample demo password for every seeded account. Shown on the login pages. */
export const DEMO_PASSWORD = 'NeighborWatt#2026'

interface SeedAccount {
  role: Account['role']
  name: string
  username: string
  email: string
  village: string
  balancePaise: number
  solarCapacityKw?: number
  sim?: Account['sim']
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    role: 'buyer',
    name: 'Sunita Devi',
    username: 'sunita',
    email: 'buyer@neighborwatt.demo',
    village: 'Ramnagar Cluster',
    balancePaise: 50000,
  },
  {
    role: 'seller',
    name: 'Meera Hegde',
    username: 'meera',
    email: 'seller@neighborwatt.demo',
    village: 'Ramnagar Cluster',
    balancePaise: 0,
    solarCapacityKw: 5.2,
    sim: { generationKwh: 12.4, demandKwh: 6.2, reserveKwh: 2.8 },
  },
  {
    role: 'seller',
    name: 'Arun Kumar',
    username: 'arun',
    email: 'arun@neighborwatt.demo',
    village: 'Ramnagar Cluster',
    balancePaise: 0,
    solarCapacityKw: 4.0,
    sim: { generationKwh: 9.0, demandKwh: 4.2, reserveKwh: 3.0 },
  },
  {
    role: 'seller',
    name: 'Lalita Sharma',
    username: 'lalita',
    email: 'lalita@neighborwatt.demo',
    village: 'Hosur Pump Hamlet',
    balancePaise: 0,
    solarCapacityKw: 5.0,
    sim: { generationKwh: 10.6, demandKwh: 5.0, reserveKwh: 3.0 },
  },
]

const SAMPLE_OFFERS: { sellerEmail: string; remainingKwh: number; pricePaise: number; description: string }[] = [
  { sellerEmail: 'seller@neighborwatt.demo', remainingKwh: 3.4, pricePaise: 580, description: 'Afternoon rooftop surplus' },
  { sellerEmail: 'arun@neighborwatt.demo', remainingKwh: 1.8, pricePaise: 610, description: 'Short window, pick up after 2 pm' },
  { sellerEmail: 'lalita@neighborwatt.demo', remainingKwh: 2.6, pricePaise: 600, description: 'Steady midday output' },
]

/** Builds the seeded demo dataset. Passwords are hashed with PBKDF2 — no plaintext is stored. */
export async function createSeedState(): Promise<AppState> {
  const now = new Date().toISOString()
  const accounts: Account[] = []
  for (const s of SEED_ACCOUNTS) {
    const salt = randomSaltHex()
    accounts.push({
      id: `acc_${s.username}`,
      role: s.role,
      name: s.name,
      username: s.username,
      email: s.email,
      village: s.village,
      passwordSalt: salt,
      passwordHash: await hashPassword(DEMO_PASSWORD, salt),
      createdAt: now,
      balancePaise: s.balancePaise,
      solarCapacityKw: s.solarCapacityKw,
      sim: s.sim,
      isSample: true,
    })
  }

  const offers: Offer[] = SAMPLE_OFFERS.map((o, i) => {
    const seller = accounts.find((a) => a.email === o.sellerEmail)!
    return {
      id: `off_sample_${i + 1}`,
      sellerId: seller.id,
      sellerLabel: householdLabel(seller.name),
      soldKwh: 0,
      remainingKwh: o.remainingKwh,
      pricePaise: o.pricePaise,
      originalKwh: o.remainingKwh,
      description: o.description,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      validUntil: null,
    }
  })

  return { version: STATE_VERSION, accounts, offers, transactions: [], incidents: [], processedKeys: [] }
}

export const SAMPLE_CREDENTIALS = {
  buyer: { email: 'buyer@neighborwatt.demo', password: DEMO_PASSWORD },
  seller: { email: 'seller@neighborwatt.demo', password: DEMO_PASSWORD },
  otherSellers: ['arun@neighborwatt.demo', 'lalita@neighborwatt.demo'],
}
