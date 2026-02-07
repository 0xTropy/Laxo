import Link from 'next/link'
import { APP_URL } from '../lib/config'

const CURRENCIES = [
  { code: 'USDC', name: 'US Dollar', issuer: 'Circle', flag: '🇺🇸', desc: 'Native gas & primary settlement' },
  { code: 'EURC', name: 'Euro', issuer: 'Circle', flag: '🇪🇺', desc: 'Euro-backed stablecoin' },
  { code: 'JPYC', name: 'Japanese Yen', issuer: 'JPYC Inc', flag: '🇯🇵', desc: 'Yen-denominated stablecoin' },
  { code: 'BRLA', name: 'Brazilian Real', issuer: 'Avenia', flag: '🇧🇷', desc: 'Real-backed for LatAm' },
  { code: 'MXNB', name: 'Mexican Peso', issuer: 'Bitso', flag: '🇲🇽', desc: 'Peso stablecoin' },
  { code: 'QCAD', name: 'Canadian Dollar', issuer: 'Stablecorp', flag: '🇨🇦', desc: 'CAD onchain' },
  { code: 'AUDF', name: 'Australian Dollar', issuer: 'Forte', flag: '🇦🇺', desc: 'AUD stablecoin' },
  { code: 'KRW1', name: 'South Korean Won', issuer: 'BDACS', flag: '🇰🇷', desc: 'Won-denominated' },
  { code: 'PHPC', name: 'Philippine Peso', issuer: 'Coins.PH', flag: '🇵🇭', desc: 'PHP stablecoin' },
  { code: 'ZARU', name: 'South African Rand', issuer: 'ZAR Universal', flag: '🇿🇦', desc: 'Rand onchain' },
  { code: 'USYC', name: 'Short-duration yield', issuer: 'Circle / Hashnote', flag: '📈', desc: 'Tokenized treasury exposure' },
]

function Hero() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(6,182,212,0.15),transparent)]" />
      <div className="absolute bottom-0 left-1/2 h-px w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-laxo-accent/30 to-transparent" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <p className="mb-4 font-mono text-sm uppercase tracking-widest text-laxo-accent">
          Built on Arc · EthGlobal HackMoney 2026
        </p>
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl">
          Move between{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            any currency
          </span>
          <br />
          on Arc.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
          Laxo uses Arc\'s stablecoin-native L1 and built-in FX engine so you can swap, settle, and send across
          USDC, EURC, JPYC, BRLA, and 7+ more — 24/7, with instant finality.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="#currencies"
            className="rounded-full bg-white px-6 py-3.5 text-base font-semibold text-laxo-bg shadow-lg transition hover:bg-gray-100"
          >
            Explore currencies
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-full border border-laxo-border bg-transparent px-6 py-3.5 text-base font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card"
          >
            How it works
          </Link>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
          {['USDC', 'EURC', 'JPYC', 'BRLA', 'MXNB'].map((c) => (
            <span
              key={c}
              className="rounded-full border border-laxo-border bg-laxo-card/80 px-4 py-2 font-mono text-sm text-gray-300"
            >
              {c}
            </span>
          ))}
          <span className="text-gray-500">+ more</span>
        </div>
      </div>
    </section>
  )
}

function CurrenciesSection() {
  return (
    <section id="currencies" className="border-t border-laxo-border bg-laxo-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Currencies you can move between on Arc
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Arc\'s FX engine and partner stablecoins let you convert and settle across fiat-backed and
            tokenized assets — no volatile gas, no T+2.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CURRENCIES.map((c) => (
            <div
              key={c.code}
              className="group rounded-2xl border border-laxo-border bg-laxo-card p-6 transition hover:border-laxo-accent/50 hover:bg-laxo-card/90"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-hidden>{c.flag}</span>
                <div>
                  <span className="font-display text-lg font-semibold text-white">{c.code}</span>
                  <p className="text-sm text-gray-400">{c.name}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">{c.issuer}</p>
              <p className="mt-1 text-sm text-cyan-400/90">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-laxo-accent/30 bg-laxo-accent/5 p-6 md:p-8">
          <h3 className="font-display text-xl font-semibold text-white">
            Built-in FX engine
          </h3>
          <p className="mt-2 text-gray-400">
            Arc\'s institutional-grade RFQ system gives you price discovery and peer-to-peer onchain settlement
            across these stablecoins — 24/7, with sub-second finality. No prefunding delays, no settlement risk.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {['Stablecoin ↔ Stablecoin', 'Cross-border payouts', 'FX perpetuals', 'Tokenized collateral'].map((item) => (
              <li key={item} className="rounded-full bg-laxo-accent/20 px-3 py-1 text-sm text-cyan-300">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Connect', desc: 'Link your wallet or use Laxo\'s flow. Arc uses USDC for gas — no ETH needed.' },
    { n: '2', title: 'Choose pair', desc: 'Pick source and destination currency (e.g. USDC → EURC or JPYC → BRLA).' },
    { n: '3', title: 'Quote & settle', desc: 'Get a live quote via Arc\'s FX engine and settle onchain in one step.' },
  ]
  return (
    <section id="how-it-works" className="border-t border-laxo-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Laxo sits on top of Arc so you get one clear path between any supported currency.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-laxo-accent/20 font-display text-xl font-bold text-laxo-accent">
                {s.n}
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-gray-400">{s.desc}</p>
              {s.n !== '3' && (
                <div className="absolute left-8 top-12 hidden h-px bg-gradient-to-r from-laxo-border to-transparent md:block" style={{ width: 'calc(100% + 2rem)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const INTEGRATIONS = [
  {
    name: 'Yellow',
    desc: 'Laxo leverages Yellow\'s cross-chain clearing network for liquidity and settlement. Yellow\'s P2P financial exchange and state channels let us move value across chains without bridging assets — so users get multi-currency flows with instant settlement and lower fees.',
  },
  {
    name: 'Arc',
    desc: 'We build on Arc, Circle\'s L1 for stablecoin finance. Laxo uses Arc\'s built-in FX engine and USDC-native gas so users can swap and settle between USDC, EURC, and partner stablecoins (JPYC, BRLA, and more) with predictable fees and sub-second finality.',
  },
  {
    name: 'ENS',
    desc: 'Laxo integrates ENS so users can send and receive by human-readable names instead of raw addresses. Pay or request funds to any .eth name — one identity across chains and currencies.',
  },
]

function Integrations() {
  return (
    <section id="integrations" className="border-t border-laxo-border bg-laxo-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Integrations
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Laxo leverages Yellow, Arc, and ENS. Here\'s how we use each.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="rounded-2xl border border-laxo-border bg-laxo-card p-6 transition hover:border-laxo-accent/50"
            >
              <h3 className="font-display text-lg font-semibold text-white">
                {integration.name}
              </h3>
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                {integration.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section id="get-started" className="border-t border-laxo-border py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
          Ready to move between currencies?
        </h2>
        <p className="mt-4 text-gray-400">
          Laxo is built for EthGlobal HackMoney 2026. Connect and explore.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={APP_URL}
            className="rounded-full bg-laxo-accent px-8 py-4 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <CurrenciesSection />
      <HowItWorks />
      <Integrations />
      <CTA />
    </>
  )
}
