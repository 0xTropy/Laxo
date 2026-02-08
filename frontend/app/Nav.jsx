'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { APP_URL } from '../lib/config'
import { useWallet } from '../contexts/WalletContext'

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
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false)
  const pathname = usePathname()
  const isHub = pathname?.startsWith('/hub')
  const wallet = useWallet()
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-laxo-border/80 bg-laxo-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white">
          <LaxoIcon className="h-7 w-7 shrink-0 rounded-lg" />
          Laxo
        </Link>
        <div className="hidden items-center gap-4 md:flex">
          {!isHub && (
            <>
              <Link href="#currencies" className="text-sm text-gray-400 transition hover:text-white">Currencies</Link>
              <Link href="#how-it-works" className="text-sm text-gray-400 transition hover:text-white">How it works</Link>
              <Link href="#integrations" className="text-sm text-gray-400 transition hover:text-white">Integrations</Link>
              <Link
                href={APP_URL}
                className="rounded-full bg-laxo-accent px-5 py-2.5 text-sm font-semibold text-laxo-bg transition hover:bg-cyan-400"
              >
                Try our Alpha!
              </Link>
            </>
          )}
          {isHub && (
            <>
              {/* Wallet Button */}
              <button
                onClick={() => wallet.setWalletModalOpen(true)}
                className="rounded-full bg-laxo-accent px-4 py-2 text-sm font-semibold text-laxo-bg transition hover:bg-cyan-400"
              >
                {wallet.isConnected ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Wallet</span>
                    {wallet.balance && (
                      <span className="text-xs opacity-80">
                        {(wallet.balance.usdc / 1000000).toFixed(2)} USDC
                      </span>
                    )}
                  </div>
                ) : (
                  'Connect Wallet'
                )}
              </button>
              
              {/* Blockchain Logs Button */}
              <button
                onClick={() => wallet.setBlockchainLogsOpen(true)}
                className="rounded-full border border-laxo-border bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card"
              >
                📋 Blockchain Logs
              </button>
              
              {/* Network Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-laxo-border bg-laxo-card px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent"
                >
                  <span>{wallet.selectedNetwork === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${networkDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {networkDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setNetworkDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 z-20 w-64 rounded-lg border border-laxo-border bg-laxo-card shadow-lg">
                      <button
                        onClick={() => {
                          wallet.setSelectedNetwork('testnet')
                          setNetworkDropdownOpen(false)
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-laxo-bg transition flex items-center justify-between"
                      >
                        <span>Testnet</span>
                        {wallet.selectedNetwork === 'testnet' && (
                          <svg className="h-4 w-4 text-laxo-accent" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        disabled
                        className="w-full px-4 py-3 text-left text-sm text-gray-500 cursor-not-allowed opacity-50 flex items-center justify-between"
                      >
                        <span className="text-left">Mainnet (for like real wallets and use)</span>
                        <svg className="h-4 w-4 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
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
          {!isHub && (
            <>
              <Link href="#currencies" className="block py-2 text-gray-400 hover:text-white" onClick={() => setOpen(false)}>Currencies</Link>
              <Link href="#how-it-works" className="block py-2 text-gray-400 hover:text-white" onClick={() => setOpen(false)}>How it works</Link>
              <Link href="#integrations" className="block py-2 text-gray-400 hover:text-white" onClick={() => setOpen(false)}>Integrations</Link>
              <Link
                href={APP_URL}
                className="mt-2 inline-block rounded-full bg-laxo-accent px-5 py-2.5 text-sm font-semibold text-laxo-bg"
                onClick={() => setOpen(false)}
              >
                Try it on testnet
              </Link>
            </>
          )}
          {isHub && (
            <div className="space-y-2">
              <button
                onClick={() => {
                  wallet.setWalletModalOpen(true)
                  setOpen(false)
                }}
                className="w-full rounded-lg bg-laxo-accent px-4 py-2 text-sm font-semibold text-laxo-bg"
              >
                {wallet.isConnected ? 'Wallet' : 'Connect Wallet'}
              </button>
              <button
                onClick={() => {
                  wallet.setBlockchainLogsOpen(true)
                  setOpen(false)
                }}
                className="w-full rounded-lg border border-laxo-border bg-transparent px-4 py-2 text-sm font-semibold text-white"
              >
                📋 Blockchain Logs
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
