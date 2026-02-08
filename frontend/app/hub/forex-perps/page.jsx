'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getYellowClient } from '../../../lib/yellow/yellowClient'
import { createMarketSession } from '../../../lib/yellow/yellowSession'

const CURRENCIES = [
  { code: 'USDC', name: 'US Dollar', pair: 'USDC/EURC', flag: '🇺🇸', targetPrice: '1.0' },
  { code: 'EURC', name: 'Euro', pair: 'USDC/EURC', flag: '🇪🇺', targetPrice: '1.0' },
  { code: 'JPYC', name: 'Japanese Yen', pair: 'USDC/JPYC', flag: '🇯🇵', targetPrice: '150.0' },
  { code: 'BRLA', name: 'Brazilian Real', pair: 'USDC/BRLA', flag: '🇧🇷', targetPrice: '5.0' },
  { code: 'MXNB', name: 'Mexican Peso', pair: 'USDC/MXNB', flag: '🇲🇽', targetPrice: '20.0' },
  { code: 'QCAD', name: 'Canadian Dollar', pair: 'USDC/QCAD', flag: '🇨🇦', targetPrice: '1.4' },
  { code: 'AUDF', name: 'Australian Dollar', pair: 'USDC/AUDF', flag: '🇦🇺', targetPrice: '1.5' },
  { code: 'KRW1', name: 'South Korean Won', pair: 'USDC/KRW1', flag: '🇰🇷', targetPrice: '13.0' },
  { code: 'PHPC', name: 'Philippine Peso', pair: 'USDC/PHPC', flag: '🇵🇭', targetPrice: '56.0' },
  { code: 'ZARU', name: 'South African Rand', pair: 'USDC/ZARU', flag: '🇿🇦', targetPrice: '18.0' },
]

export default function ForexPerps() {
  const [yellowClient, setYellowClient] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [userAddress, setUserAddress] = useState(null)
  const [balance, setBalance] = useState(null)
  const [sessions, setSessions] = useState(new Map())
  const [positions, setPositions] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('testnet')

  // Initialize Yellow SDK
  useEffect(() => {
    async function initYellow() {
      try {
        const client = getYellowClient({
          endpoint: 'wss://clearnet-sandbox.yellow.com/ws',
          onMessage: (message) => {
            console.log('Yellow message:', message)
            if (message.type === 'payment' || message.type === 'balance_update') {
              updateBalance()
            }
          },
          onError: (err) => {
            console.error('Yellow error:', err)
            setError(err.message)
          },
          onConnect: () => {
            setIsConnected(true)
          }
        })

        setYellowClient(client)
      } catch (err) {
        console.error('Error initializing Yellow:', err)
        setError(err.message)
      }
    }

    initYellow()
  }, [])

  // Connect wallet and Yellow Network
  async function connectWallet() {
    if (!yellowClient) return

    try {
      setLoading(true)
      setError(null)

      // Setup wallet
      const { userAddress } = await yellowClient.setupWallet()
      setUserAddress(userAddress)

      // Connect to Yellow Network
      await yellowClient.connect()
      setIsConnected(true)

      // Update balance
      await updateBalance()
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message || 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  // Update balance from Yellow Network
  async function updateBalance() {
    if (!yellowClient || !isConnected) return

    try {
      const status = yellowClient.getStatus()
      // In a real implementation, you'd fetch balance from Yellow Network
      // For now, we'll use a placeholder
      setBalance({ usdc: 0 })
    } catch (err) {
      console.error('Balance update error:', err)
    }
  }

  // Take a position in a market
  async function takePosition(currency, positionType) {
    if (!yellowClient || !isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Mock market address (in production, get from deployed contracts)
      const marketAddress = `0x${Math.random().toString(16).substr(2, 40)}`

      // Create or get session for this market
      let session = sessions.get(currency.pair)
      if (!session) {
        session = createMarketSession(marketAddress, { client: yellowClient })
        await session.initialize()
        setSessions(new Map(sessions.set(currency.pair, session)))
      }

      // Take position off-chain (instant, no gas)
      const amount = '1000000' // 1 USDC (6 decimals)
      const position = await session.takePosition(positionType, amount)

      // Track position
      const positionKey = `${currency.pair}-${positionType}-${Date.now()}`
      setPositions(new Map(positions.set(positionKey, {
        ...position,
        currency: currency.code,
        pair: currency.pair,
        positionType,
        amount,
        status: 'active',
        offChain: true
      })))

      console.log('✅ Position taken off-chain:', position)
    } catch (err) {
      console.error('Position error:', err)
      setError(err.message || 'Failed to take position')
    } finally {
      setLoading(false)
    }
  }

  // Deposit funds into state channel
  async function depositFunds() {
    if (!yellowClient || !isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      // In production, this would open a deposit modal
      // For now, we'll simulate
      const session = createMarketSession('0x0000000000000000000000000000000000000000', {
        client: yellowClient
      })
      await session.initialize()
      await session.deposit('1000000', 'usdc') // 1 USDC
      await updateBalance()
    } catch (err) {
      console.error('Deposit error:', err)
      setError(err.message || 'Failed to deposit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-laxo-bg">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="absolute top-0 right-0">
            {/* Network Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-laxo-border bg-laxo-card px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent"
              >
                <span>{selectedNetwork === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
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
                        setSelectedNetwork('testnet')
                        setNetworkDropdownOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-laxo-bg transition flex items-center justify-between"
                    >
                      <span>Testnet</span>
                      {selectedNetwork === 'testnet' && (
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
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl mb-4">
            Forex Perps
          </h1>
          <p className="text-lg text-gray-400 mb-6">
            Prediction markets powered by Yellow Network
          </p>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="rounded-full bg-laxo-accent px-6 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Wallet & Yellow Network'}
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">
                    Connected to Yellow Network
                  </span>
                </div>
                {userAddress && (
                  <span className="text-sm text-gray-500 font-mono">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                )}
                <button
                  onClick={depositFunds}
                  disabled={loading}
                  className="rounded-full border border-laxo-border bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent"
                >
                  Deposit
                </button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-2 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-lg px-4 py-3 text-sm text-cyan-300">
            <strong>⚡ Instant Off-Chain Transactions:</strong> Take positions instantly with zero gas fees using Yellow Network state channels. Settlements are finalized on-chain via smart contracts.
          </div>
        </div>

        {/* Markets Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {CURRENCIES.map((currency) => {
            const marketPositions = Array.from(positions.values()).filter(
              p => p.pair === currency.pair
            )
            const hasPosition = marketPositions.length > 0

            return (
              <div
                key={currency.code}
                className="rounded-2xl border border-laxo-border bg-laxo-card p-6 transition hover:border-laxo-accent/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currency.flag}</span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">
                        {currency.pair}
                      </h3>
                      <p className="text-xs text-gray-500">{currency.name}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-1">Target Price</div>
                  <div className="text-2xl font-bold text-white">{currency.targetPrice}</div>
                </div>

                {hasPosition && (
                  <div className="mb-4 p-3 bg-laxo-bg rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Your Position</div>
                    {marketPositions.map((pos, idx) => (
                      <div key={idx} className="text-sm text-white">
                        {pos.positionType === 'long' ? '📈 Long' : '📉 Short'} - {pos.amount / 1000000} USDC
                        {pos.offChain && (
                          <span className="ml-2 text-xs text-cyan-400">⚡ Off-chain</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => takePosition(currency, 'long')}
                    disabled={!isConnected || loading}
                    className="flex-1 rounded-lg bg-green-500/20 border border-green-500/50 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📈 Long
                  </button>
                  <button
                    onClick={() => takePosition(currency, 'short')}
                    disabled={!isConnected || loading}
                    className="flex-1 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📉 Short
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Positions Summary */}
        {positions.size > 0 && (
          <div className="mt-8 rounded-2xl border border-laxo-border bg-laxo-card p-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">
              Your Positions
            </h2>
            <div className="space-y-3">
              {Array.from(positions.values()).map((position, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-laxo-bg rounded-lg"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {position.pair} - {position.positionType === 'long' ? 'Long' : 'Short'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Amount: {position.amount / 1000000} USDC
                    </div>
                  </div>
                  <div className="text-right">
                    {position.offChain && (
                      <div className="text-xs text-cyan-400 mb-1">⚡ Off-chain</div>
                    )}
                    <div className="text-xs text-gray-500">{position.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            href="/hub"
            className="inline-block rounded-full border border-laxo-border bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card"
          >
            Back to Hub
          </Link>
        </div>
      </div>
    </div>
  )
}
