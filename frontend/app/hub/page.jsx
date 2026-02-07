import Link from 'next/link'

export default function Hub() {
  return (
    <div className="min-h-screen bg-laxo-bg">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
            Hub
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Coming soon...
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-full border border-laxo-border bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
