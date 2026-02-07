import Link from 'next/link'

export default function ForexPortfolios() {
  return (
    <div className="min-h-screen bg-laxo-bg">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
            Forex Portfolios
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Diversify USDC holdings with ENS + ARC
          </p>
          <p className="mt-6 text-sm text-gray-500">
            Coming soon... Create "Pies" that diversify across different currencies with ENS or use ARC to trade USDC to other stablecoins.
          </p>
          <Link
            href="/hub"
            className="mt-8 inline-block rounded-full border border-laxo-border bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card"
          >
            Back to Hub
          </Link>
        </div>
      </div>
    </div>
  )
}
