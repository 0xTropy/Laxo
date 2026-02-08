'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getYellowClient } from '../../../lib/yellow/yellowClient'
import { createMarketSession } from '../../../lib/yellow/yellowSession'
import ErrorModal from '../../../components/ErrorModal'
import { useWallet } from '../../../contexts/WalletContext'
import PriceChart from '../../../components/PriceChart'
import CreateMarketModal from '../../../components/CreateMarketModal'
import { subscribeToPrice, getCurrentPrice } from '../../../lib/oracle/priceFeed'

// Currency definitions - showing price of currency vs USD
const CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: 'EUR', flag: '🇪🇺' },
  { code: 'JPY', name: 'Japanese Yen', symbol: 'JPY', flag: '🇯🇵' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'BRL', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MXN', flag: '🇲🇽' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CAD', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AUD', flag: '🇦🇺' },
  { code: 'KRW', name: 'South Korean Won', symbol: 'KRW', flag: '🇰🇷' },
  { code: 'PHP', name: 'Philippine Peso', symbol: 'PHP', flag: '🇵🇭' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'ZAR', flag: '🇿🇦' },
]

export default function ForexPerps() {
  const wallet = useWallet()
  const [yellowClient, setYellowClient] = useState(null)
  const [sessions, setSessions] = useState(new Map())
  const [positions, setPositions] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPrices, setCurrentPrices] = useState(new Map())
  const [createMarketModal, setCreateMarketModal] = useState({ open: false, currency: null })
  const [markets, setMarkets] = useState(new Map()) // Track created markets
  const [selectedCurrency, setSelectedCurrency] = useState(null) // For viewing all markets of a currency
  const [quoteCurrency, setQuoteCurrency] = useState('USD') // Quote currency for price display (default: USD)
  const [isRehydrating, setIsRehydrating] = useState(false) // Track rehydration state
  
  // Use wallet context state
  const { isConnected, userAddress, balance } = wallet

  // Get Yellow client instance (shared across hub via layout)
  useEffect(() => {
    const client = getYellowClient()
    setYellowClient(client)
  }, [])

  // Clear prices and rehydrate when quote currency changes
  useEffect(() => {
    setIsRehydrating(true)
    // Clear all current prices to force rehydration
    setCurrentPrices(new Map())
    
    // Clear price cache for old pairs (optional - helps ensure fresh data)
    // Note: This is handled by the priceFeed service's cache expiration
    
    // Rehydrate all currency prices with new quote currency
    const unsubscribes = CURRENCIES.map(currency => {
      // Skip if currency is the same as quote currency (e.g., USD/USD)
      if (currency.code === quoteCurrency) {
        return () => {} // No-op unsubscribe
      }
      
      // Convert to pair format for API (EUR -> EUR/USD, EUR/EUR, etc.)
      const oraclePair = `${currency.code}/${quoteCurrency}`
      
      // Force immediate fetch for this pair to rehydrate
      getCurrentPrice(oraclePair)
        .then(({ price, timestamp }) => {
          setCurrentPrices(prev => {
            const newMap = new Map(prev.set(currency.code, price))
            // Check if all currencies have been loaded
            const loadedCount = Array.from(newMap.keys()).length
            const expectedCount = CURRENCIES.filter(c => c.code !== quoteCurrency).length
            if (loadedCount >= expectedCount) {
              setIsRehydrating(false)
            }
            return newMap
          })
        })
        .catch(err => {
          console.error(`Error fetching price for ${oraclePair}:`, err)
          setIsRehydrating(false)
        })
      
      // Subscribe to ongoing updates
      return subscribeToPrice(oraclePair, (price, timestamp) => {
        setCurrentPrices(prev => new Map(prev.set(currency.code, price)))
        setIsRehydrating(false) // Mark as done when first update arrives
      })
    })

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [quoteCurrency])

  // Update balance from Yellow Network
  const updateBalance = async (client, connected) => {
    if (!client || !connected) return

    try {
      const status = client.getStatus()
      // For test wallets, use the test balance
      if (status.isTestWallet && status.balance) {
        wallet.setBalance(status.balance)
      } else {
        // In a real implementation, you'd fetch balance from Yellow Network
        wallet.setBalance({ usdc: 0 })
      }
    } catch (err) {
      console.error('Balance update error:', err)
    }
  }


  // Take a position in a market
  async function takePosition(currency, positionType, amount = '1000000', market = null) {
    if (!yellowClient || !isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get current price for reference
      const { getCurrentPrice } = await import('../../../lib/oracle/priceFeed')
      const oraclePair = `${currency.code}/${quoteCurrency}`
      const { price: currentPrice } = await getCurrentPrice(oraclePair)

      // Use market address if provided, otherwise generate mock
      const marketAddress = market?.id 
        ? `0x${market.id.replace(/[^a-f0-9]/gi, '').padStart(40, '0').slice(0, 40)}`
        : `0x${Math.random().toString(16).substr(2, 40)}`

      // Create or get session for this market
      const sessionKey = market?.id || currency.pair
      let session = sessions.get(sessionKey)
      if (!session) {
        session = createMarketSession(marketAddress, { client: yellowClient })
        await session.initialize()
        setSessions(new Map(sessions.set(sessionKey, session)))
      }

      // Convert amount to smallest unit (6 decimals for USDC)
      // Amount should be in USDC (e.g., 10 = 10 USDC)
      // Convert to smallest unit: 10 USDC = 10000000 (10 * 10^6)
      const amountNum = typeof amount === 'string' ? parseFloat(amount) : parseFloat(amount)
      const amountInSmallestUnit = Math.floor(amountNum * 1000000).toString()

      // Take position off-chain (instant, no gas)
      const position = await session.takePosition(positionType, amountInSmallestUnit)

      // Update balance after taking position
      await updateBalance(yellowClient, isConnected)

      // Track position with market info
      const positionKey = `${market?.id || currency.code}-${positionType}-${Date.now()}`
      setPositions(new Map(positions.set(positionKey, {
        ...position,
        currency: currency.code,
        currencyPair: `${currency.code}/USD`,
        positionType,
        amount: amountInSmallestUnit,
        status: 'active',
        offChain: true,
        marketId: market?.id,
        targetPrice: market?.targetPrice,
        currentPrice: currentPrice,
        resolutionTime: market?.resolutionTime,
        createdAt: Date.now()
      })))

      console.log('✅ Position taken:', {
        currency: currency.code,
        positionType,
        amount: amountInSmallestUnit,
        amountUSDC: (amountInSmallestUnit / 1000000).toFixed(2),
        currentPrice,
        targetPrice: market?.targetPrice,
        marketId: market?.id
      })
    } catch (err) {
      console.error('Position error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to take position'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Create a new market
  async function handleCreateMarket({ currency, targetPrice, resolutionTime, targetPriceFormatted }) {
    // In production, this would deploy a contract via MarketFactory
    // For now, we'll create a market object and track it
    const marketId = `${currency.code}-${Date.now()}`
    const market = {
      id: marketId,
      currencyCode: currency.code,
      currencyPair: `${currency.code}/USD`, // For display
      targetPrice,
      targetPriceFormatted,
      resolutionTime,
      createdAt: Date.now(),
      currency
    }
    
    setMarkets(prev => new Map(prev.set(marketId, market)))
    console.log('✅ Market created:', market)
    
    // You can now bet on this market
    return market
  }


  return (
    <div className="min-h-screen bg-laxo-bg">
      {/* Error Modal - only for page-specific errors */}
      {error && (
        <ErrorModal 
          error={error} 
          onClose={() => setError(null)} 
        />
      )}

      {/* Create Market Modal */}
      <CreateMarketModal
        isOpen={createMarketModal.open}
        onClose={() => setCreateMarketModal({ open: false, currency: null })}
        currency={createMarketModal.currency}
        quoteCurrency={quoteCurrency}
        onCreateMarket={handleCreateMarket}
      />
      
      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl mb-2">
                Forex Perps
              </h1>
              <p className="text-lg text-gray-400">
                Prediction markets powered by Yellow Network
              </p>
            </div>
            
            {/* Quote Currency Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 whitespace-nowrap">Prices relative to:</label>
              {isRehydrating && (
                <div className="flex items-center gap-2 text-xs text-cyan-400">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-400"></div>
                  <span>Updating...</span>
                </div>
              )}
              <select
                value={quoteCurrency}
                onChange={(e) => setQuoteCurrency(e.target.value)}
                disabled={isRehydrating}
                className="rounded-lg bg-laxo-card border border-laxo-border px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:border-laxo-accent transition cursor-pointer min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="JPY">JPY (Japanese Yen)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="BRL">BRL (Brazilian Real)</option>
                <option value="MXN">MXN (Mexican Peso)</option>
                <option value="CAD">CAD (Canadian Dollar)</option>
                <option value="AUD">AUD (Australian Dollar)</option>
                <option value="CHF">CHF (Swiss Franc)</option>
                <option value="CNY">CNY (Chinese Yuan)</option>
                <option value="KRW">KRW (South Korean Won)</option>
                <option value="PHP">PHP (Philippine Peso)</option>
                <option value="ZAR">ZAR (South African Rand)</option>
              </select>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-lg px-4 py-3 text-sm text-cyan-300">
            <strong>⚡ Instant Off-Chain Transactions:</strong> Take positions instantly with zero gas fees using Yellow Network state channels. Settlements are finalized on-chain via smart contracts.
          </div>
        </div>

        {/* Currency Cards - Show price of each currency */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {CURRENCIES.map((currency) => {
            const currencyMarkets = Array.from(markets.values()).filter(
              m => m.currency.code === currency.code
            )
            const currencyPositions = Array.from(positions.values()).filter(
              p => p.currency === currency.code
            )
            const currentPrice = currentPrices.get(currency.code)
            const marketCount = currencyMarkets.length

            return (
              <div
                key={currency.code}
                className="rounded-2xl border border-laxo-border bg-laxo-card p-6 transition hover:border-laxo-accent/50"
              >
                {/* Currency Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currency.flag}</span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">
                        {currency.name}
                      </h3>
                      <p className="text-xs text-gray-500">{currency.symbol}</p>
                    </div>
                  </div>
                  {marketCount > 0 && (
                    <button
                      onClick={() => setSelectedCurrency(currency.code)}
                      className="text-xs px-2 py-1 rounded bg-laxo-accent/20 text-laxo-accent font-semibold hover:bg-laxo-accent/30 transition"
                    >
                      {marketCount} {marketCount === 1 ? 'market' : 'markets'}
                    </button>
                  )}
                </div>

                {/* Live Price Display */}
                <div className="mb-4">
                  {currency.code === quoteCurrency ? (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Base Currency</div>
                      <div className="text-3xl font-bold text-white mb-2">1.0000</div>
                      <div className="text-xs text-gray-400">
                        {currency.symbol} = {currency.symbol}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-gray-500 mb-1">Price ({quoteCurrency})</div>
                      <div className="text-3xl font-bold text-white mb-2">
                        {currentPrice ? currentPrice.toFixed(4) : '--'}
                      </div>
                      {currentPrice && (
                        <div className="text-xs text-gray-400">
                          1 {currency.symbol} = {currentPrice.toFixed(4)} {quoteCurrency}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Price Chart */}
                <div className="mb-4">
                  {currency.code !== quoteCurrency ? (
                    <PriceChart pair={`${currency.code}/${quoteCurrency}`} height={150} />
                  ) : (
                    <div className="h-[150px] flex items-center justify-center text-gray-500 text-sm">
                      Cannot display chart for {currency.code}/{quoteCurrency}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => setCreateMarketModal({ open: true, currency })}
                    disabled={loading}
                    className="w-full rounded-lg bg-laxo-accent/20 border border-laxo-accent/50 px-4 py-2 text-sm font-semibold text-laxo-accent transition hover:bg-laxo-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ➕ Create Market
                  </button>
                  
                  {marketCount > 0 && (
                    <button
                      onClick={() => setSelectedCurrency(currency.code)}
                      className="w-full rounded-lg border border-laxo-border bg-laxo-bg px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card disabled:opacity-50"
                    >
                      View All Markets ({marketCount})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Markets View for Selected Currency */}
        {selectedCurrency && (
          <div className="mt-8 rounded-2xl border border-laxo-border bg-laxo-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-white">
                Markets - {CURRENCIES.find(c => c.code === selectedCurrency)?.name} ({quoteCurrency})
              </h2>
              <button
                onClick={() => setSelectedCurrency(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-laxo-bg hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {Array.from(markets.values())
              .filter(m => m.currency.code === selectedCurrency)
              .length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No markets created yet for {CURRENCIES.find(c => c.code === selectedCurrency)?.name}</p>
                <button
                  onClick={() => {
                    const currency = CURRENCIES.find(c => c.code === selectedCurrency)
                    setCreateMarketModal({ open: true, currency })
                  }}
                  className="mt-4 rounded-lg bg-laxo-accent px-4 py-2 text-sm font-semibold text-laxo-bg transition hover:bg-cyan-400"
                >
                  Create First Market
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(markets.values())
                  .filter(m => m.currency.code === selectedCurrency)
                  .map((market) => {
                    const currentPriceForMarket = currentPrices.get(selectedCurrency)
                    const isWinning = currentPriceForMarket 
                      ? (currentPriceForMarket >= market.targetPrice)
                      : null
                    
                    return (
                      <div key={market.id} className="p-4 bg-laxo-bg rounded-lg border border-laxo-border">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-white">
                                Target: {market.targetPriceFormatted}
                              </span>
                              {isWinning !== null && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  isWinning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {isWinning ? '📈 Long winning' : '📉 Short winning'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Current: {currentPriceForMarket ? `${currentPriceForMarket.toFixed(4)} ${quoteCurrency}` : '--'}</div>
                              <div>Resolves: {new Date(market.resolutionTime * 1000).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => takePosition(market.currency, 'long', 1, market)}
                            disabled={!isConnected || loading}
                            className="flex-1 rounded-lg bg-green-500/20 border border-green-500/50 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/30 disabled:opacity-50"
                          >
                            📈 Long (1 USDC)
                          </button>
                          <button
                            onClick={() => takePosition(market.currency, 'short', 1, market)}
                            disabled={!isConnected || loading}
                            className="flex-1 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            📉 Short (1 USDC)
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* Positions Summary */}
        {positions.size > 0 && (
          <div className="mt-8 rounded-2xl border border-laxo-border bg-laxo-card p-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">
              Your Active Positions
            </h2>
            <div className="space-y-3">
              {Array.from(positions.values()).map((position, idx) => {
                const currency = CURRENCIES.find(c => c.code === position.currency)
                const currentPriceForCurrency = currentPrices.get(position.currency)
                const targetPrice = position.targetPrice ? parseFloat(position.targetPrice) : null
                const isWinning = targetPrice && currentPriceForCurrency
                  ? (position.positionType === 'long' 
                      ? (currentPriceForCurrency >= targetPrice)
                      : (currentPriceForCurrency < targetPrice))
                  : null
                
                return (
                  <div
                    key={idx}
                    className="p-4 bg-laxo-bg rounded-lg border border-laxo-border hover:border-laxo-accent/50 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{currency?.flag || '💱'}</span>
                          <span className="text-sm font-semibold text-white">
                            {currency?.name || position.currency}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            position.positionType === 'long'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {position.positionType === 'long' ? '📈 Long' : '📉 Short'}
                          </span>
                          {position.offChain && (
                            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                              ⚡ Off-chain
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          Amount: {(position.amount / 1000000).toFixed(2)} USDC
                        </div>
                      </div>
                      <div className="text-right">
                        {isWinning !== null && (
                          <div className={`text-xs font-semibold mb-1 ${
                            isWinning ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isWinning ? '✓ Winning' : '✗ Losing'}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">{position.status}</div>
                      </div>
                    </div>
                    
                    {/* Market Details */}
                    {position.marketId && targetPrice && (
                      <div className="pt-3 mt-3 border-t border-laxo-border">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Target Price:</span>
                            <span className="text-white ml-2 font-semibold">{targetPrice.toFixed(4)} {quoteCurrency}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Current:</span>
                            <span className="text-white ml-2 font-semibold">
                              {currentPriceForCurrency ? `${currentPriceForCurrency.toFixed(4)} ${quoteCurrency}` : '--'}
                            </span>
                          </div>
                          {position.resolutionTime && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Resolves:</span>
                              <span className="text-white ml-2">
                                {new Date(position.resolutionTime * 1000).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
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
