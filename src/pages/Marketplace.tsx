import { MarketplaceBrowser } from '../components/marketplace/MarketplaceBrowser'
import { SectionHeading, SimulationDisclaimer } from '../components/ui'

export default function Marketplace() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Shared P2P marketplace"
        title="Energy offers from your neighbours"
        description="Offers are published by sellers and bought by buyers in the same store. Every purchase updates both sides at once."
      />
      <div className="mt-8">
        <MarketplaceBrowser />
      </div>
      <div className="mt-10 max-w-2xl">
        <SimulationDisclaimer />
      </div>
    </div>
  )
}
