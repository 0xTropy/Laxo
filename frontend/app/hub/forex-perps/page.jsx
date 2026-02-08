'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import Link from 'next/link'
import { getYellowClient } from '../../../lib/yellow/yellowClient'
import { createMarketSession } from '../../../lib/yellow/yellowSession'
import ErrorModal from '../../../components/ErrorModal'
import { useWallet } from '../../../contexts/WalletContext'
import PriceChart from '../../../components/PriceChart'
import CreateMarketModal from '../../../components/CreateMarketModal'
import { subscribeToPrice, getCurrentPrice } from '../../../lib/oracle/priceFeed'
import { savePositions, loadPositions, savePosition, removePosition } from '../../../lib/wallet/persistence'

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

// Memoized Currency Card component to prevent unnecessary re-renders
const CurrencyCard = memo(({ currency, currentPrice, quoteCurrency, marketCount, isConnected, loading, onSelectCurrency, onCreateMarket }) => {
  return (
    <div className="rounded-2xl border border-laxo-border bg-laxo-card p-6 transition hover:border-laxo-accent/50">
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
            onClick={onSelectCurrency}
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
          onClick={onCreateMarket}
          disabled={loading || !isConnected}
          className="w-full rounded-lg bg-laxo-accent/20 border border-laxo-accent/50 px-4 py-2 text-sm font-semibold text-laxo-accent transition hover:bg-laxo-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!isConnected ? 'Connect wallet to create markets' : ''}
        >
          ➕ Create Market
        </button>
        
        {marketCount > 0 && (
          <button
            onClick={onSelectCurrency}
            className="w-full rounded-lg border border-laxo-border bg-laxo-bg px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card disabled:opacity-50"
          >
            View All Markets ({marketCount})
          </button>
        )}
      </div>
    </div>
  )
})
CurrencyCard.displayName = 'CurrencyCard'

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
  const [resolvedMarkets, setResolvedMarkets] = useState(new Set()) // Track which markets have been resolved
  
  // Use wallet context state
  const { isConnected, userAddress, balance } = wallet

  // Get Yellow client instance (shared across hub via layout)
  useEffect(() => {
    const client = getYellowClient()
    setYellowClient(client)
    
    // Load persisted positions on mount
    const persistedPositions = loadPositions()
    if (persistedPositions.size > 0) {
      setPositions(persistedPositions)
    }
  }, [])

  // Clear prices and rehydrate when quote currency changes
  useEffect(() => {
    setIsRehydrating(true)
    // Clear all current prices to force rehydration
    setCurrentPrices(new Map())
    
    let loadedCount = 0
    const expectedCount = CURRENCIES.filter(c => c.code !== quoteCurrency).length
    
    // Batch price updates to reduce re-renders
    const pendingUpdates = new Map()
    let updateTimeout = null
    
    const batchUpdatePrices = () => {
      if (pendingUpdates.size > 0) {
        setCurrentPrices(prev => {
          const newMap = new Map(prev)
          pendingUpdates.forEach((price, code) => {
            newMap.set(code, price)
          })
          pendingUpdates.clear()
          return newMap
        })
        setIsRehydrating(false)
      }
      updateTimeout = null
    }
    
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
          pendingUpdates.set(currency.code, price)
          loadedCount++
          // Check if all currencies have been loaded
          if (loadedCount >= expectedCount) {
            // Batch update all prices at once
            batchUpdatePrices()
          }
        })
        .catch(err => {
          console.error(`Error fetching price for ${oraclePair}:`, err)
          loadedCount++
          if (loadedCount >= expectedCount) {
            batchUpdatePrices()
          }
        })
      
      // Subscribe to ongoing updates (throttled and batched)
      let lastUpdate = 0
      const UPDATE_THROTTLE = 1000 // Update UI at most once per second
      
      return subscribeToPrice(oraclePair, (price, timestamp) => {
        const now = Date.now()
        if (now - lastUpdate < UPDATE_THROTTLE) {
          return // Skip if too soon
        }
        lastUpdate = now
        
        // Batch updates instead of immediate state update
        pendingUpdates.set(currency.code, price)
        if (!updateTimeout) {
          updateTimeout = setTimeout(batchUpdatePrices, 100) // Batch updates every 100ms
        }
        setIsRehydrating(false) // Mark as done when first update arrives
      })
    })

    return () => {
      unsubscribes.forEach(unsub => unsub())
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
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

  // Check and resolve markets that have reached their resolution time
  useEffect(() => {
    const checkMarketResolutions = async () => {
      const now = Math.floor(Date.now() / 1000)
      
      // Check all markets
      Array.from(markets.values()).forEach(market => {
        // Skip if already resolved
        if (resolvedMarkets.has(market.id)) return
        
        // Check if resolution time has passed
        if (market.resolutionTime <= now) {
          // Mark as resolved (create new Set to avoid mutation)
          setResolvedMarkets(prev => new Set([...prev, market.id]))
          
          // Get current price to determine winner
          const currentPrice = currentPrices.get(market.currencyCode)
          if (currentPrice === undefined) return // Wait for price data
          
          // Resolve positions for this market
          setPositions(prev => {
            const newPositions = new Map(prev)
            const marketPositions = Array.from(prev.entries()).filter(([_, pos]) => 
              pos.marketId === market.id && pos.status === 'active'
            )
            
            // Calculate total pool (all positions in this market)
            const totalPool = marketPositions.reduce((sum, [_, pos]) => sum + Number(pos.amount), 0)
            
            // Separate winners and losers
            const winners = marketPositions.filter(([_, pos]) => {
              const isLong = pos.positionType === 'long'
              return isLong 
                ? (currentPrice >= market.targetPrice)
                : (currentPrice < market.targetPrice)
            })
            const losers = marketPositions.filter(([_, pos]) => {
              const isLong = pos.positionType === 'long'
              return isLong 
                ? (currentPrice < market.targetPrice)
                : (currentPrice >= market.targetPrice)
            })
            
            // Include artificial liquidity in the pool
            const artificialLiquidity = market.artificialLiquidity || { long: 0, short: 0, total: 0 }
            const totalPoolWithLiquidity = totalPool + artificialLiquidity.total
            
            // Calculate payouts: winners split the total pool (including artificial liquidity) proportionally
            marketPositions.forEach(([key, position]) => {
              const isLong = position.positionType === 'long'
              const isWinner = isLong 
                ? (currentPrice >= market.targetPrice)
                : (currentPrice < market.targetPrice)
              
              if (isWinner && winners.length > 0) {
                // Winner gets their bet back + proportional share of losers' bets + artificial liquidity
                const totalWinnerAmount = winners.reduce((sum, [_, p]) => sum + Number(p.amount), 0)
                const totalLoserAmount = losers.reduce((sum, [_, p]) => sum + Number(p.amount), 0)
                const winnerShare = Number(position.amount) / totalWinnerAmount
                
                // Payout = bet back + share of losers + share of artificial liquidity
                const payout = Number(position.amount) + 
                  (totalLoserAmount * winnerShare) + 
                  (artificialLiquidity.total * winnerShare)
                
                newPositions.set(key, {
                  ...position,
                  status: 'resolved',
                  payout: Math.floor(payout),
                  finalPrice: currentPrice,
                  resolvedAt: now
                })
              } else {
                // Loser - mark as resolved with no payout
                newPositions.set(key, {
                  ...position,
                  status: 'resolved',
                  payout: 0,
                  finalPrice: currentPrice,
                  resolvedAt: now
                })
              }
            })
            
            // Calculate total payout for this user's positions in this market
            const userPayout = Array.from(newPositions.values())
              .filter(p => p.marketId === market.id && p.status === 'resolved' && p.payout > 0)
              .reduce((sum, p) => sum + p.payout, 0)
            
            // Persist updated positions
            savePositions(newPositions)
            
            // Add payout to balance if user won
            if (userPayout > 0 && yellowClient) {
              const status = yellowClient.getStatus()
              if (status.isTestWallet) {
                const currentBalance = BigInt(yellowClient.testBalance.usdc || 0)
                const payoutBigInt = BigInt(userPayout)
                yellowClient.testBalance.usdc = (currentBalance + payoutBigInt).toString()
                
                // Update wallet balance display
                updateBalance(yellowClient, isConnected)
                
                // Emit balance update
                yellowClient.emit('balance_update', {
                  asset: 'usdc',
                  balance: yellowClient.testBalance.usdc,
                  total: { ...yellowClient.testBalance }
                })
                
                console.log(`💰 Payout: +${(userPayout / 1000000).toFixed(2)} USDC`)
              }
            }
            
            return newPositions
          })
          
          console.log(`✅ Market ${market.id} resolved at price ${currentPrice}`)
        }
      })
    }
    
    // Check every 5 seconds for markets that need resolution
    const interval = setInterval(checkMarketResolutions, 5000)
    checkMarketResolutions() // Check immediately
    
    return () => clearInterval(interval)
  }, [markets, resolvedMarkets, currentPrices, yellowClient, isConnected])


  // Take a position in a market (memoized to prevent recreation)
  const takePosition = useCallback(async (currency, positionType, amount = '1000000', market = null) => {
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
      const sessionKey = market?.id || currency.code
      let session = sessions.get(sessionKey)
      if (!session) {
        session = createMarketSession(marketAddress, { client: yellowClient })
        await session.initialize()
        setSessions(prev => new Map(prev.set(sessionKey, session)))
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
      const positionData = {
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
        createdAt: Date.now(),
        marketAddress: marketAddress
      }
      
      setPositions(prev => {
        const newPositions = new Map(prev.set(positionKey, positionData))
        // Persist to localStorage
        savePositions(newPositions)
        return newPositions
      })

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
  }, [yellowClient, isConnected, quoteCurrency])

  // Calculate probability using normal distribution approximation
  const calculateProbability = (currentPrice, targetPrice, timeToResolution) => {
    // Use a simple normal distribution model
    // Probability that price >= targetPrice (Long wins)
    
    // Calculate distance from current to target
    const priceDiff = Math.abs(currentPrice - targetPrice)
    const priceDiffPercent = currentPrice > 0 ? (priceDiff / currentPrice) * 100 : 0
    
    // Estimate volatility based on time to resolution
    // More time = more uncertainty (higher volatility)
    // Typical forex daily volatility is ~0.5-1%, so we scale by time
    const daysToResolution = timeToResolution / (24 * 60 * 60)
    const estimatedVolatility = Math.min(0.02, 0.005 * Math.sqrt(daysToResolution)) // Cap at 2%
    
    // Calculate z-score (how many standard deviations away)
    const zScore = (targetPrice - currentPrice) / (currentPrice * estimatedVolatility)
    
    // Use cumulative distribution function approximation
    // P(X >= target) = 1 - Φ(z)
    // Simple approximation: Φ(z) ≈ 0.5 * (1 + erf(z/√2))
    const erfApprox = (x) => {
      // Abramowitz and Stegun approximation
      const a1 =  0.254829592
      const a2 = -0.284496736
      const a3 =  1.421413741
      const a4 = -1.453152027
      const a5 =  1.061405429
      const p  =  0.3275911
      
      const sign = x < 0 ? -1 : 1
      x = Math.abs(x)
      
      const t = 1.0 / (1.0 + p * x)
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
      
      return sign * y
    }
    
    const probabilityLong = 0.5 * (1 - erfApprox(zScore / Math.sqrt(2)))
    
    // Clamp between 0.1 and 0.9 (never 0% or 100% to ensure liquidity on both sides)
    return Math.max(0.1, Math.min(0.9, probabilityLong))
  }

  // Create a new market (memoized)
  const handleCreateMarket = useCallback(async ({ currency, targetPrice, resolutionTime, targetPriceFormatted }) => {
    // Get current price to calculate probability
    const currentPrice = currentPrices.get(currency.code)
    if (!currentPrice) {
      // Try to fetch it
      try {
        const { getCurrentPrice } = await import('../../../lib/oracle/priceFeed')
        const oraclePair = `${currency.code}/${quoteCurrency}`
        const { price } = await getCurrentPrice(oraclePair)
        const probLong = calculateProbability(price, targetPrice, resolutionTime - Math.floor(Date.now() / 1000))
        
        // Create artificial liquidity based on probability
        const totalLiquidity = 10000 // 10 USDC in smallest units (10000 * 1000000 / 1000000 = 10)
        const longLiquidity = Math.floor(totalLiquidity * probLong)
        const shortLiquidity = totalLiquidity - longLiquidity
        
        const marketId = `${currency.code}-${Date.now()}`
        const market = {
          id: marketId,
          currencyCode: currency.code,
          currencyPair: `${currency.code}/USD`,
          targetPrice,
          targetPriceFormatted,
          resolutionTime,
          createdAt: Date.now(),
          currency,
          artificialLiquidity: {
            long: longLiquidity,
            short: shortLiquidity,
            total: totalLiquidity,
            probabilityLong: probLong,
            probabilityShort: 1 - probLong
          }
        }
        
        setMarkets(prev => new Map(prev.set(marketId, market)))
        console.log('✅ Market created with artificial liquidity:', {
          market,
          probLong: (probLong * 100).toFixed(1) + '%',
          longLiquidity: (longLiquidity / 1000000).toFixed(2) + ' USDC',
          shortLiquidity: (shortLiquidity / 1000000).toFixed(2) + ' USDC'
        })
        
        return market
      } catch (error) {
        console.error('Error fetching price for market creation:', error)
        // Create market without liquidity if price fetch fails
        const marketId = `${currency.code}-${Date.now()}`
        const market = {
          id: marketId,
          currencyCode: currency.code,
          currencyPair: `${currency.code}/USD`,
          targetPrice,
          targetPriceFormatted,
          resolutionTime,
          createdAt: Date.now(),
          currency,
          artificialLiquidity: {
            long: 5000, // Default 50/50 split
            short: 5000,
            total: 10000,
            probabilityLong: 0.5,
            probabilityShort: 0.5
          }
        }
        setMarkets(prev => new Map(prev.set(marketId, market)))
        return market
      }
    } else {
      // Calculate probability and create liquidity
      const timeToResolution = resolutionTime - Math.floor(Date.now() / 1000)
      const probLong = calculateProbability(currentPrice, targetPrice, timeToResolution)
      
      const totalLiquidity = 10000 // 10 USDC
      const longLiquidity = Math.floor(totalLiquidity * probLong)
      const shortLiquidity = totalLiquidity - longLiquidity
      
      const marketId = `${currency.code}-${Date.now()}`
      const market = {
        id: marketId,
        currencyCode: currency.code,
        currencyPair: `${currency.code}/USD`,
        targetPrice,
        targetPriceFormatted,
        resolutionTime,
        createdAt: Date.now(),
        currency,
        artificialLiquidity: {
          long: longLiquidity,
          short: shortLiquidity,
          total: totalLiquidity,
          probabilityLong: probLong,
          probabilityShort: 1 - probLong
        }
      }
      
      setMarkets(prev => new Map(prev.set(marketId, market)))
      console.log('✅ Market created with artificial liquidity:', {
        market,
        probLong: (probLong * 100).toFixed(1) + '%',
        longLiquidity: (longLiquidity / 1000000).toFixed(2) + ' USDC',
        shortLiquidity: (shortLiquidity / 1000000).toFixed(2) + ' USDC'
      })
      
      return market
    }
  }, [currentPrices, quoteCurrency])

  // Pre-compute currency data for all currencies (moved outside map to fix React hooks violation)
  const currencyDataMap = useMemo(() => {
    const dataMap = new Map()
    CURRENCIES.forEach(currency => {
      const currencyMarkets = Array.from(markets.values()).filter(
        m => m.currency.code === currency.code
      )
      const currencyPositions = Array.from(positions.values()).filter(
        p => p.currency === currency.code
      )
      dataMap.set(currency.code, {
        markets: currencyMarkets,
        positions: currencyPositions,
        marketCount: currencyMarkets.length
      })
    })
    return dataMap
  }, [markets, positions])

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
            const currencyData = currencyDataMap.get(currency.code) || { marketCount: 0 }
            const currentPrice = currentPrices.get(currency.code)

            return (
              <CurrencyCard
                key={currency.code}
                currency={currency}
                currentPrice={currentPrice}
                quoteCurrency={quoteCurrency}
                marketCount={currencyData.marketCount}
                isConnected={isConnected}
                loading={loading}
                onSelectCurrency={() => setSelectedCurrency(currency.code)}
                onCreateMarket={() => {
                  if (!isConnected) {
                    setError('Please connect your wallet first')
                    return
                  }
                  setCreateMarketModal({ open: true, currency })
                }}
              />
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
                {!isConnected ? (
                  <p className="mt-4 text-sm text-gray-500">Connect your wallet to create markets</p>
                ) : (
                  <button
                    onClick={() => {
                      const currency = CURRENCIES.find(c => c.code === selectedCurrency)
                      setCreateMarketModal({ open: true, currency })
                    }}
                    className="mt-4 rounded-lg bg-laxo-accent px-4 py-2 text-sm font-semibold text-laxo-bg transition hover:bg-cyan-400"
                  >
                    Create First Market
                  </button>
                )}
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
                              {market.artificialLiquidity && (
                                <div className="mt-2 pt-2 border-t border-laxo-border/30">
                                  <div className="text-xs text-gray-500">
                                    Liquidity: Long {((market.artificialLiquidity.long / market.artificialLiquidity.total) * 100).toFixed(0)}% / Short {((market.artificialLiquidity.short / market.artificialLiquidity.total) * 100).toFixed(0)}%
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Prob: {(market.artificialLiquidity.probabilityLong * 100).toFixed(1)}% Long wins
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              if (!isConnected) {
                                setError('Please connect your wallet first')
                                return
                              }
                              takePosition(market.currency, 'long', 1, market)
                            }}
                            disabled={!isConnected || loading}
                            className="flex-1 rounded-lg bg-green-500/20 border border-green-500/50 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isConnected ? 'Connect wallet to take positions' : ''}
                          >
                            📈 Long (1 USDC)
                          </button>
                          <button
                            onClick={() => {
                              if (!isConnected) {
                                setError('Please connect your wallet first')
                                return
                              }
                              takePosition(market.currency, 'short', 1, market)
                            }}
                            disabled={!isConnected || loading}
                            className="flex-1 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isConnected ? 'Connect wallet to take positions' : ''}
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
              Your Positions
              {Array.from(positions.values()).some(p => p.status === 'resolved') && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({Array.from(positions.values()).filter(p => p.status === 'active').length} active, {Array.from(positions.values()).filter(p => p.status === 'resolved').length} resolved)
                </span>
              )}
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
                          {position.status === 'resolved' ? (
                            <>
                              {position.payout > 0 ? (
                                <div className="text-xs font-semibold mb-1 text-green-400">
                                  ✓ Won: +{((position.payout / 1000000).toFixed(2))} USDC
                                </div>
                              ) : (
                                <div className="text-xs font-semibold mb-1 text-red-400">
                                  ✗ Lost
                                </div>
                              )}
                              <div className="text-xs text-gray-500">Resolved</div>
                            </>
                          ) : (
                            <>
                              {isWinning !== null && (
                                <div className={`text-xs font-semibold mb-1 ${
                                  isWinning ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {isWinning ? '✓ Winning' : '✗ Losing'}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">{position.status}</div>
                            </>
                          )}
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
                          {position.status === 'resolved' ? (
                            <>
                              {position.resolutionTime && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Resolved at:</span>
                                  <span className="text-white ml-2">
                                    {new Date(position.resolvedAt * 1000).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {position.finalPrice !== undefined && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Final Price:</span>
                                  <span className="text-white ml-2">
                                    {position.finalPrice.toFixed(4)} {quoteCurrency}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            position.resolutionTime && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Resolves:</span>
                                <span className="text-white ml-2">
                                  {new Date(position.resolutionTime * 1000).toLocaleString()}
                                  {position.resolutionTime * 1000 <= Date.now() && (
                                    <span className="ml-2 text-xs text-yellow-400">(Checking...)</span>
                                  )}
                                </span>
                              </div>
                            )
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
