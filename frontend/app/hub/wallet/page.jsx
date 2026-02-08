'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '../../../contexts/WalletContext'
import { loadPositions, loadPies, getMarketAddresses } from '../../../lib/wallet/persistence'
import { getCurrentPrice, subscribeToPrice } from '../../../lib/oracle/priceFeed'

// Currency definitions - matching forex-perps and forex-portfolios
const CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: 'EUR', flag: '🇪🇺', stablecoin: 'EURC' },
  { code: 'JPY', name: 'Japanese Yen', symbol: 'JPY', flag: '🇯🇵', stablecoin: 'JPYC' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'BRL', flag: '🇧🇷', stablecoin: 'BRLA' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MXN', flag: '🇲🇽', stablecoin: 'MXNB' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CAD', flag: '🇨🇦', stablecoin: 'QCAD' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AUD', flag: '🇦🇺', stablecoin: 'AUDF' },
  { code: 'KRW', name: 'South Korean Won', symbol: 'KRW', flag: '🇰🇷', stablecoin: 'KRW1' },
  { code: 'PHP', name: 'Philippine Peso', symbol: 'PHP', flag: '🇵🇭', stablecoin: 'PHPC' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'ZAR', flag: '🇿🇦', stablecoin: 'ZARU' },
]

export default function Wallet() {
  const wallet = useWallet()
  const { isConnected, userAddress, balance } = wallet
  const [positions, setPositions] = useState(new Map())
  const [pies, setPies] = useState(new Map())
  const [currentPrices, setCurrentPrices] = useState(new Map())
  const [loading, setLoading] = useState(true)

  // Load positions and pies from localStorage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      
      // Load positions and pies
      const loadedPositions = loadPositions()
      const loadedPies = loadPies()
      
      console.log('Loaded positions:', loadedPositions.size)
      console.log('Loaded pies:', loadedPies.size, Array.from(loadedPies.values()))
      
      setPositions(loadedPositions)
      setPies(loadedPies)
      
      // Load current prices for all currencies
      const pricePromises = CURRENCIES.map(async (currency) => {
        try {
          const { price } = await getCurrentPrice(`${currency.code}/USD`)
          return [currency.code, price]
        } catch (err) {
          console.error(`Error fetching price for ${currency.code}:`, err)
          return [currency.code, null]
        }
      })
      
      const prices = await Promise.all(pricePromises)
      setCurrentPrices(new Map(prices))
      
      setLoading(false)
    }
    
    loadData()
  }, [])
  
  // Subscribe to price updates (using centralized subscription manager)
  useEffect(() => {
    const unsubscribes = CURRENCIES.map(currency => {
      const oraclePair = `${currency.code}/USD`
      return subscribeToPrice(oraclePair, (price) => {
        setCurrentPrices(prev => {
          const newMap = new Map(prev)
          newMap.set(currency.code, price)
          return newMap
        })
      })
    })
    
    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [])

  // Calculate pie values
  const calculatePieValue = (pie) => {
    let totalValueUSDC = 0
    let totalPnl = 0
    
    const holdingsWithValue = pie.holdings.map(holding => {
      const currentPrice = currentPrices.get(holding.currencyCode) || holding.entryPrice
      const valueUSDC = holding.amountUSDC * (currentPrice / holding.entryPrice)
      const pnl = valueUSDC - holding.amountUSDC
      const pnlPercent = ((currentPrice / holding.entryPrice) - 1) * 100
      
      totalValueUSDC += valueUSDC
      totalPnl += pnl
      
      return {
        ...holding,
        currentPrice,
        valueUSDC,
        pnl,
        pnlPercent
      }
    })

    return {
      totalValueUSDC,
      totalPnl,
      totalPnlPercent: (totalPnl / pie.totalAmountUSDC) * 100,
      holdingsWithValue
    }
  }

  // Get market addresses from positions
  const marketAddresses = getMarketAddresses()

  // Calculate total locked in portfolios
  const totalLockedInPortfolios = Array.from(pies.values()).reduce((sum, pie) => {
    const { totalValueUSDC } = calculatePieValue(pie)
    return sum + totalValueUSDC
  }, 0)

  // Calculate free balance (total balance minus locked in portfolios)
  const freeBalance = balance?.usdc 
    ? (balance.usdc / 1000000) - totalLockedInPortfolios
    : 0

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return 'Not connected'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-laxo-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-lg">Loading wallet data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-laxo-bg">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl mb-2">
            Wallet
          </h1>
          <p className="text-lg text-gray-400">
            View your current wallet positions and stablecoins
          </p>
        </div>

        {/* Wallet Info */}
        {isConnected && userAddress ? (
          <div className="mb-8 rounded-2xl border border-laxo-border bg-laxo-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white mb-2">
                  Wallet Address
                </h2>
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono text-gray-300 bg-laxo-bg px-3 py-1 rounded">
                    {userAddress}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userAddress)
                    }}
                    className="text-xs text-laxo-accent hover:text-cyan-400 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
              {balance && (
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Total Balance</div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {(balance.usdc / 1000000).toFixed(2)} USDC
                  </div>
                  {pies.size > 0 && (
                    <div className="text-xs text-gray-400">
                      Free: {freeBalance.toFixed(2)} USDC
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-laxo-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">Connected to Yellow Network</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-2xl border border-laxo-border bg-laxo-card p-6 text-center">
            <p className="text-gray-400">Please connect your wallet to view positions</p>
          </div>
        )}

        {/* ARC Positions (Pies) Section - Show prominently first */}
        {pies.size > 0 && (
          <div className="mb-8 rounded-2xl border border-laxo-border bg-laxo-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-white">
                Portfolio Holdings ({pies.size})
              </h2>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Total Portfolio Value</div>
                <div className="text-xl font-bold text-white">
                  ${Array.from(pies.values()).reduce((sum, pie) => {
                    const { totalValueUSDC } = calculatePieValue(pie)
                    return sum + totalValueUSDC
                  }, 0).toFixed(2)} USDC
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {Array.from(pies.values()).map((pie) => {
                const { totalValueUSDC, totalPnl, totalPnlPercent, holdingsWithValue } = calculatePieValue(pie)
                
                return (
                  <div
                    key={pie.id}
                    className="p-5 bg-laxo-bg rounded-lg border border-laxo-border hover:border-laxo-accent/50 transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🥧</span>
                          <span className="text-base font-semibold text-white">
                            {pie.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Created {new Date(pie.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white mb-1">
                          ${totalValueUSDC.toFixed(2)} USDC
                        </div>
                        <div className="text-xs text-gray-400 mb-1">
                          Initial: ${pie.totalAmountUSDC.toFixed(2)} USDC
                        </div>
                        <div className={`text-sm font-semibold ${
                          totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} ({totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    
                    {/* Holdings Breakdown */}
                    <div className="pt-4 mt-4 border-t border-laxo-border">
                      <div className="text-sm font-semibold text-white mb-3">Holdings Breakdown:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {holdingsWithValue.map((holding, idx) => {
                          const currency = CURRENCIES.find(c => c.code === holding.currencyCode)
                          return (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-3 bg-laxo-card rounded-lg border border-laxo-border/50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{currency?.flag}</span>
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    {holding.currencyCode} ({holding.currency?.stablecoin || holding.currencyCode})
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {holding.percentage.toFixed(1)}% allocation
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-white">
                                  ${holding.valueUSDC.toFixed(2)} USDC
                                </div>
                                <div className={`text-xs font-semibold ${
                                  holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    {pie.walletAddress && (
                      <div className="pt-3 mt-3 border-t border-laxo-border">
                        <div className="text-xs text-gray-500">
                          Portfolio Wallet: <code className="text-gray-400">{formatAddress(pie.walletAddress)}</code>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Contracts Section */}
        {marketAddresses.length > 0 && (
          <div className="mb-8 rounded-2xl border border-laxo-border bg-laxo-card p-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">
              Active Contracts ({marketAddresses.length})
            </h2>
            <div className="space-y-2">
              {marketAddresses.map((address, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-laxo-bg rounded-lg border border-laxo-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="text-sm font-semibold text-white">Market Contract</div>
                      <code className="text-xs text-gray-400 font-mono">{formatAddress(address)}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(address)
                    }}
                    className="text-xs text-laxo-accent hover:text-cyan-400 transition"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Positions Section - Hidden per user request */}
        {false && positions.size > 0 && (
          <div className="mb-8 rounded-2xl border border-laxo-border bg-laxo-card p-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">
              Forex Perps Positions ({positions.size})
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
                    
                    {position.marketAddress && (
                      <div className="pt-3 mt-3 border-t border-laxo-border">
                        <div className="text-xs text-gray-500">
                          Contract: <code className="text-gray-400">{formatAddress(position.marketAddress)}</code>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}


        {/* Empty State */}
        {pies.size === 0 && (
          <div className="text-center py-20 rounded-2xl border border-laxo-border bg-laxo-card">
            <div className="text-6xl mb-4">💼</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Portfolio Holdings Yet</h2>
            <p className="text-gray-400 mb-6">
              Create a diversified portfolio to see your holdings here
            </p>
            <Link
              href="/hub/forex-portfolios"
              className="inline-block rounded-lg bg-laxo-accent px-6 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400"
            >
              Create Portfolio
            </Link>
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
