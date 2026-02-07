import Link from 'next/link'

function TrendingIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function PieChartIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  )
}

function WalletIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M2 9h20" />
      <path d="M16 9v6" />
    </svg>
  )
}

const hubButtons = [
  {
    title: 'Forex Perps',
    icon: TrendingIcon,
    description: 'Prediction markets powered by Yellow',
    href: '/hub/forex-perps',
    gradient: 'from-cyan-400 to-teal-400',
  },
  {
    title: 'Forex Portfolios',
    icon: PieChartIcon,
    description: 'Diversify USDC holdings with ENS + ARC',
    href: '/hub/forex-portfolios',
    gradient: 'from-blue-400 to-cyan-400',
  },
  {
    title: 'Wallet',
    icon: WalletIcon,
    description: 'View positions and stablecoins',
    href: '/hub/wallet',
    gradient: 'from-teal-400 to-emerald-400',
  },
]

export default function Hub() {
  return (
    <div className="min-h-screen bg-laxo-bg">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
            Hub
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Choose your destination
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {hubButtons.map((button) => (
            <Link
              key={button.href}
              href={button.href}
              className="group relative rounded-2xl border border-laxo-border bg-laxo-card p-8 transition-all hover:border-laxo-accent hover:shadow-lg hover:shadow-laxo-accent/20 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <button.icon className="w-12 h-12 text-gray-400 group-hover:text-white transition-colors" />
                </div>
                <h2 className={`font-display text-2xl font-bold bg-gradient-to-r ${button.gradient} bg-clip-text text-transparent mb-3`}>
                  {button.title}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {button.description}
                </p>
              </div>
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${button.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
