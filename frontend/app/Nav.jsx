'use client'

import { useState } from 'react'
import Link from 'next/link'
import { APP_URL } from '../lib/config'

function LaxoIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="#06b6d4" />
      <path d="M8 16h6l2 8 2-8h6" stroke="#0a0e17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-laxo-border/80 bg-laxo-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="#" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white">
          <LaxoIcon className="h-7 w-7 shrink-0 rounded-lg" />
          Laxo
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#currencies" className="text-sm text-gray-400 transition hover:text-white">Currencies</Link>
          <Link href="#how-it-works" className="text-sm text-gray-400 transition hover:text-white">How it works</Link>
          <Link href="#integrations" className="text-sm text-gray-400 transition hover:text-white">Integrations</Link>
          <Link
            href={APP_URL}
            className="rounded-full bg-laxo-accent px-5 py-2.5 text-sm font-semibold text-laxo-bg transition hover:bg-cyan-400"
          >
            Get started
          </Link>
        </div>
        <button
          type="button"
          className="md:hidden rounded-lg p-2 text-gray-400 hover:bg-laxo-card hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>
      {open && (
        <div className="border-t border-laxo-border bg-laxo-bg px-6 py-4 md:hidden">
          <Link href="#currencies" className="block py-2 text-gray-400 hover:text-white" onClick={() => setOpen(false)}>Currencies</Link>
          <Link href="#how-it-works" className="block py-2 text-gray-400 hover:text-white" onClick={() => setOpen(false)}>How it works</Link>
          <Link href="#integrations" className="block py-2 text-gray-400 hover:text-white" onClick={() => setOpen(false)}>Integrations</Link>
          <Link
            href={APP_URL}
            className="mt-2 inline-block rounded-full bg-laxo-accent px-5 py-2.5 text-sm font-semibold text-laxo-bg"
            onClick={() => setOpen(false)}
          >
            Get started
          </Link>
        </div>
      )}
    </nav>
  )
}
