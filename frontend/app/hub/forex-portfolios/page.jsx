'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getYellowClient } from '../../../lib/yellow/yellowClient'
import { createMarketSession } from '../../../lib/yellow/yellowSession'
import ErrorModal from '../../../components/ErrorModal'
import { useWallet } from '../../../contexts/WalletContext'
import { subscribeToPrice, getCurrentPrice } from '../../../lib/oracle/priceFeed'
import { generatePieWalletAddress, generatePieENSName, registerENSName, formatENSName } from '../../../lib/ens/pieWallet'

// Currency definitions - matching forex-perps page
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

export default function ForexPortfolios() {
  const wallet = useWallet()
  const [yellowClient, setYellowClient] = useState(null)
  const [sessions, setSessions] = useState(new Map())
  const [pies, setPies] = useState(new Map()) // Map of pieId -> pie data
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPrices, setCurrentPrices] = useState(new Map())
  const [createPieModal, setCreatePieModal] = useState(false)
  const [selectedPie, setSelectedPie] = useState(null)
  
  // Use wallet context state
  const { isConnected, userAddress, balance } = wallet

  // Get Yellow client instance and load pies
  useEffect(() => {
    const client = getYellowClient()
    setYellowClient(client)
    
    // Load persisted pies from localStorage on mount
    try {
      const stored = localStorage.getItem('laxo_pies')
      if (stored) {
        const pieData = JSON.parse(stored)
        const piesMap = new Map()
        
        // Migrate old pies to include ENS names if missing
        Object.entries(pieData).forEach(([pieId, pie]) => {
          if (!pie.walletAddress) {
            // Generate wallet and ENS for old pies
            const storedUserAddress = pie.userAddress || userAddress
            if (storedUserAddress) {
              pie.walletAddress = generatePieWalletAddress(storedUserAddress, pieId)
              pie.ensName = generatePieENSName(storedUserAddress, pieId, pie.name)
              pie.userAddress = storedUserAddress
            }
          }
          piesMap.set(pieId, pie)
        })
        
        setPies(piesMap)
      }
    } catch (err) {
      console.error('Error loading pies:', err)
    }
  }, [userAddress])

  // Subscribe to price updates for all currencies (using centralized subscription manager)
  useEffect(() => {
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
      }
      updateTimeout = null
    }
    
    const unsubscribes = CURRENCIES.map(currency => {
      const oraclePair = `${currency.code}/USD`
      
      // Subscribe to ongoing updates (deduplicated via centralized manager)
      return subscribeToPrice(oraclePair, (price) => {
        // Batch updates instead of immediate state update
        pendingUpdates.set(currency.code, price)
        if (!updateTimeout) {
          updateTimeout = setTimeout(batchUpdatePrices, 100) // Batch updates every 100ms
        }
      })
    })

    return () => {
      unsubscribes.forEach(unsub => unsub())
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
    }
  }, [])

  // Update balance from Yellow Network
  const updateBalance = async (client, connected) => {
    if (!client || !connected) return

    try {
      const status = client.getStatus()
      if (status.isTestWallet && status.balance) {
        wallet.setBalance(status.balance)
      } else {
        wallet.setBalance({ usdc: 0 })
      }
    } catch (err) {
      console.error('Balance update error:', err)
    }
  }

  // Create a new currency pie
  const createPie = useCallback(async (pieData) => {
    if (!yellowClient || !isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { name, totalAmount, allocations } = pieData
      
      // Validate allocations sum to 100%
      const totalPercent = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0)
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new Error('Allocations must sum to 100%')
      }

      // Convert total amount to smallest unit (6 decimals for USDC)
      const totalAmountNum = parseFloat(totalAmount)
      const totalAmountInSmallestUnit = Math.floor(totalAmountNum * 1000000)

      // Check balance
      const status = yellowClient.getStatus()
      if (status.isTestWallet) {
        const balance = yellowClient.getTestBalance()
        const currentBalance = BigInt(balance?.usdc || 0)
        if (currentBalance < BigInt(totalAmountInSmallestUnit)) {
          const requiredUSDC = (totalAmountInSmallestUnit / 1000000).toFixed(2)
          const availableUSDC = (Number(currentBalance) / 1000000).toFixed(2)
          throw new Error(`Insufficient balance. Required: ${requiredUSDC} USDC, Available: ${availableUSDC} USDC`)
        }
      }

      // Get current prices for entry prices
      const entryPrices = new Map()
      for (const alloc of allocations) {
        const currency = CURRENCIES.find(c => c.code === alloc.currencyCode)
        if (currency) {
          const oraclePair = `${currency.code}/USD`
          const { price } = await getCurrentPrice(oraclePair)
          entryPrices.set(currency.code, price)
        }
      }

      // Calculate allocations in USDC
      const holdings = allocations.map(alloc => {
        const amountUSDC = (totalAmountNum * alloc.percentage) / 100
        const amountInSmallestUnit = Math.floor(amountUSDC * 1000000)
        const entryPrice = entryPrices.get(alloc.currencyCode) || 1
        
        return {
          currencyCode: alloc.currencyCode,
          currency: CURRENCIES.find(c => c.code === alloc.currencyCode),
          percentage: alloc.percentage,
          amountUSDC: amountUSDC,
          amountInSmallestUnit: amountInSmallestUnit.toString(),
          entryPrice: entryPrice,
          entryTimestamp: Date.now()
        }
      })

      // Generate pie wallet address and ENS name
      const pieId = `pie-${Date.now()}`
      const pieWalletAddress = generatePieWalletAddress(userAddress, pieId)
      const pieENSName = generatePieENSName(userAddress, pieId, name)
      
      // Register ENS name (simulated for testnet)
      const ensResult = await registerENSName(pieENSName, pieWalletAddress, userAddress)
      if (!ensResult.success) {
        console.warn('ENS registration warning:', ensResult.message)
      }

      // Create session for this pie using the pie wallet address
      const session = createMarketSession(pieWalletAddress, { client: yellowClient })
      await session.initialize()
      setSessions(prev => new Map(prev.set(pieId, session)))

      // Deduct balance (simulate trading USDC for currencies)
      if (status.isTestWallet) {
        const currentBalance = BigInt(yellowClient.testBalance.usdc || 0)
        const newBalance = currentBalance - BigInt(totalAmountInSmallestUnit)
        yellowClient.testBalance.usdc = newBalance.toString()
        
        yellowClient.emit('balance_update', {
          asset: 'usdc',
          balance: newBalance.toString(),
          total: { ...yellowClient.testBalance }
        })
      }

      // Create pie object with wallet and ENS info
      const pie = {
        id: pieId,
        name: name || `Pie ${pies.size + 1}`,
        createdAt: Date.now(),
        totalAmountUSDC: totalAmountNum,
        totalAmountInSmallestUnit: totalAmountInSmallestUnit.toString(),
        holdings: holdings,
        sessionId: session.sessionId,
        walletAddress: pieWalletAddress,
        ensName: pieENSName,
        userAddress: userAddress
      }

      setPies(prev => {
        const newPies = new Map(prev.set(pieId, pie))
        // Persist to localStorage using the utility
        savePies(newPies)
        return newPies
      })
      await updateBalance(yellowClient, isConnected)

      console.log('✅ Pie created:', pie)
      setCreatePieModal(false)
    } catch (err) {
      console.error('Pie creation error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to create pie'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [yellowClient, isConnected, pies])

  // Liquidate a pie (convert all holdings back to USDC)
  const liquidatePie = useCallback(async (pieId) => {
    if (!yellowClient || !isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const pie = pies.get(pieId)
      if (!pie) {
        throw new Error('Pie not found')
      }

      // Calculate current value of all holdings
      let totalValueUSDC = 0
      const liquidatedHoldings = pie.holdings.map(holding => {
        const currentPrice = currentPrices.get(holding.currencyCode) || holding.entryPrice
        // Value in USDC = amount in currency * current price
        // Since we're tracking in USDC terms, we need to account for price changes
        const valueUSDC = holding.amountUSDC * (currentPrice / holding.entryPrice)
        totalValueUSDC += valueUSDC
        return {
          ...holding,
          currentPrice,
          valueUSDC,
          pnl: valueUSDC - holding.amountUSDC,
          pnlPercent: ((currentPrice / holding.entryPrice) - 1) * 100
        }
      })

      // Convert back to smallest unit
      const totalValueInSmallestUnit = Math.floor(totalValueUSDC * 1000000)

      // Add back to balance
      const status = yellowClient.getStatus()
      if (status.isTestWallet) {
        const currentBalance = BigInt(yellowClient.testBalance.usdc || 0)
        const newBalance = currentBalance + BigInt(totalValueInSmallestUnit)
        yellowClient.testBalance.usdc = newBalance.toString()
        
        yellowClient.emit('balance_update', {
          asset: 'usdc',
          balance: newBalance.toString(),
          total: { ...yellowClient.testBalance }
        })
      }

      // Remove pie
      setPies(prev => {
        const newPies = new Map(prev)
        newPies.delete(pieId)
        // Persist to localStorage using the utility
        savePies(newPies)
        return newPies
      })

      // Close session
      const session = sessions.get(pieId)
      if (session) {
        await session.close()
        setSessions(prev => {
          const newSessions = new Map(prev)
          newSessions.delete(pieId)
          return newSessions
        })
      }

      await updateBalance(yellowClient, isConnected)

      const totalPnl = totalValueUSDC - pie.totalAmountUSDC
      const totalPnlPercent = (totalPnl / pie.totalAmountUSDC) * 100
      
      console.log(`✅ Pie liquidated: ${pie.name}`, {
        originalValue: pie.totalAmountUSDC.toFixed(2),
        currentValue: totalValueUSDC.toFixed(2),
        pnl: totalPnl.toFixed(2),
        pnlPercent: totalPnlPercent.toFixed(2)
      })

      setSelectedPie(null)
    } catch (err) {
      console.error('Liquidation error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to liquidate pie'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [yellowClient, isConnected, pies, currentPrices, sessions])

  // Calculate current value and P&L for a pie
  const calculatePieValue = useCallback((pie) => {
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
  }, [currentPrices])

  return (
    <div className="min-h-screen bg-laxo-bg">
      {/* Error Modal */}
      {error && (
        <ErrorModal 
          error={error} 
          onClose={() => setError(null)} 
        />
      )}

      {/* Create Pie Modal */}
      {createPieModal && (
        <CreatePieModal
          isOpen={createPieModal}
          onClose={() => setCreatePieModal(false)}
          onCreatePie={createPie}
          balance={balance}
        />
      )}

      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl mb-2">
                Forex Portfolios
              </h1>
              <p className="text-lg text-gray-400">
                Diversify USDC holdings across multiple currencies
              </p>
            </div>
            
            <button
              onClick={() => {
                if (!isConnected) {
                  setError('Please connect your wallet first')
                  return
                }
                setCreatePieModal(true)
              }}
              disabled={loading || !isConnected}
              className="rounded-lg bg-laxo-accent px-6 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕ Create Pie
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-lg px-4 py-3 text-sm text-cyan-300">
            <strong>⚡ Instant Off-Chain Transactions:</strong> Create currency pies instantly with zero gas fees using Yellow Network state channels. Each pie gets its own wallet address linked to your account and a convenient ENS name for easy reference. Track price movements and liquidate anytime.
          </div>
        </div>

        {/* Pies List */}
        {pies.size === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-laxo-border bg-laxo-card">
            <div className="text-6xl mb-4">🥧</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Pies Yet</h2>
            <p className="text-gray-400 mb-6">
              Create your first currency pie to diversify your USDC holdings
            </p>
            {!isConnected ? (
              <p className="text-sm text-gray-500">Connect your wallet to get started</p>
            ) : (
              <button
                onClick={() => setCreatePieModal(true)}
                className="rounded-lg bg-laxo-accent px-6 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400"
              >
                Create Your First Pie
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from(pies.values()).map((pie) => {
              const { totalValueUSDC, totalPnl, totalPnlPercent, holdingsWithValue } = calculatePieValue(pie)
              
              return (
                <div
                  key={pie.id}
                  className="rounded-2xl border border-laxo-border bg-laxo-card p-6 transition hover:border-laxo-accent/50 cursor-pointer"
                  onClick={() => setSelectedPie(pie.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-white mb-1">
                        {pie.name}
                      </h3>
                      {pie.ensName && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs text-laxo-accent font-mono">
                            {formatENSName(pie.ensName)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(pie.ensName)
                            }}
                            className="text-xs text-gray-500 hover:text-gray-400 transition"
                            title="Copy ENS name"
                          >
                            📋
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Created {new Date(pie.createdAt).toLocaleDateString()}
                      </p>
                      {pie.walletAddress && (
                        <p className="text-xs text-gray-600 font-mono mt-1">
                          {pie.walletAddress.slice(0, 6)}...{pie.walletAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                    <span className="text-2xl">🥧</span>
                  </div>

                  {/* Total Value */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1">Total Value</div>
                    <div className="text-2xl font-bold text-white mb-1">
                      ${totalValueUSDC.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Initial: ${pie.totalAmountUSDC.toFixed(2)}
                    </div>
                  </div>

                  {/* P&L */}
                  <div className="mb-4">
                    <div className={`text-sm font-semibold ${
                      totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {totalPnl >= 0 ? '↑' : '↓'} {totalPnl >= 0 ? '+' : ''}
                      ${Math.abs(totalPnl).toFixed(2)} ({totalPnlPercent >= 0 ? '+' : ''}
                      {totalPnlPercent.toFixed(2)}%)
                    </div>
                  </div>

                  {/* Holdings Preview */}
                  <div className="mb-4 pt-4 border-t border-laxo-border">
                    <div className="text-xs text-gray-500 mb-2">Holdings</div>
                    <div className="space-y-1">
                      {holdingsWithValue.slice(0, 3).map((holding, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            {holding.currency.flag} {holding.currency.code}
                          </span>
                          <span className={`font-semibold ${
                            holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                      {pie.holdings.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{pie.holdings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPie(pie.id)
                      }}
                      className="flex-1 rounded-lg border border-laxo-border bg-laxo-bg px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        liquidatePie(pie.id)
                      }}
                      disabled={loading}
                      className="flex-1 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Liquidate
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pie Detail Modal */}
        {selectedPie && pies.has(selectedPie) && (
          <PieDetailModal
            pie={pies.get(selectedPie)}
            onClose={() => setSelectedPie(null)}
            onLiquidate={() => liquidatePie(selectedPie)}
            calculateValue={calculatePieValue}
            loading={loading}
          />
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

// Create Pie Modal Component
function CreatePieModal({ isOpen, onClose, onCreatePie, balance }) {
  const [name, setName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [allocations, setAllocations] = useState([])
  const [selectedCurrency, setSelectedCurrency] = useState(null)

  const availableBalance = balance?.usdc ? (balance.usdc / 1000000).toFixed(2) : '0.00'

  const addAllocation = () => {
    if (!selectedCurrency) return
    
    const exists = allocations.find(a => a.currencyCode === selectedCurrency.code)
    if (exists) return

    setAllocations([...allocations, {
      currencyCode: selectedCurrency.code,
      percentage: 0
    }])
    setSelectedCurrency(null)
  }

  const updateAllocation = (index, percentage) => {
    const newAllocations = [...allocations]
    newAllocations[index].percentage = Math.max(0, Math.min(100, percentage))
    setAllocations(newAllocations)
  }

  const removeAllocation = (index) => {
    setAllocations(allocations.filter((_, i) => i !== index))
  }

  const getTotalPercentage = () => {
    return allocations.reduce((sum, a) => sum + a.percentage, 0)
  }

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Please enter a pie name')
      return
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (allocations.length === 0) {
      alert('Please add at least one currency allocation')
      return
    }
    if (Math.abs(getTotalPercentage() - 100) > 0.01) {
      alert(`Allocations must sum to 100% (currently ${getTotalPercentage().toFixed(2)}%)`)
      return
    }

    onCreatePie({ name, totalAmount, allocations })
    setName('')
    setTotalAmount('')
    setAllocations([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-laxo-card border border-laxo-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Currency Pie</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pie Name */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-white mb-2">Pie Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Diversified Portfolio"
            className="w-full rounded-lg bg-laxo-bg border border-laxo-border px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-laxo-accent"
          />
        </div>

        {/* Total Amount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-white mb-2">
            Total Amount (USDC)
          </label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="100.00"
            step="0.01"
            min="0.01"
            max={availableBalance}
            className="w-full rounded-lg bg-laxo-bg border border-laxo-border px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-laxo-accent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Available: {availableBalance} USDC
          </p>
        </div>

        {/* Allocations */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-white mb-2">
            Currency Allocations
          </label>
          
          {/* Add Currency */}
          <div className="flex gap-2 mb-3">
            <select
              value={selectedCurrency?.code || ''}
              onChange={(e) => {
                const currency = CURRENCIES.find(c => c.code === e.target.value)
                setSelectedCurrency(currency || null)
              }}
              className="flex-1 rounded-lg bg-laxo-bg border border-laxo-border px-4 py-2 text-white focus:outline-none focus:border-laxo-accent"
            >
              <option value="">Select currency...</option>
              {CURRENCIES.filter(c => !allocations.find(a => a.currencyCode === c.code)).map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.flag} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
            <button
              onClick={addAllocation}
              disabled={!selectedCurrency}
              className="rounded-lg bg-laxo-accent px-4 py-2 text-sm font-semibold text-laxo-bg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Allocation List */}
          <div className="space-y-2">
            {allocations.map((alloc, index) => {
              const currency = CURRENCIES.find(c => c.code === alloc.currencyCode)
              return (
                <div key={index} className="flex items-center gap-2 p-3 bg-laxo-bg rounded-lg">
                  <span className="text-xl">{currency?.flag}</span>
                  <span className="flex-1 text-sm text-white">{currency?.name}</span>
                  <input
                    type="number"
                    value={alloc.percentage}
                    onChange={(e) => updateAllocation(index, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-20 rounded bg-laxo-card border border-laxo-border px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-laxo-accent"
                  />
                  <span className="text-sm text-gray-400 w-8">%</span>
                  <button
                    onClick={() => removeAllocation(index)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Total Percentage */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-400">Total:</span>
            <span className={`font-semibold ${
              Math.abs(getTotalPercentage() - 100) < 0.01 ? 'text-green-400' : 'text-red-400'
            }`}>
              {getTotalPercentage().toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-laxo-border bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-laxo-bg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || !totalAmount || allocations.length === 0 || Math.abs(getTotalPercentage() - 100) > 0.01}
            className="flex-1 rounded-lg bg-laxo-accent px-4 py-2 text-sm font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Pie
          </button>
        </div>
      </div>
    </div>
  )
}

// Pie Detail Modal Component
function PieDetailModal({ pie, onClose, onLiquidate, calculateValue, loading }) {
  const { totalValueUSDC, totalPnl, totalPnlPercent, holdingsWithValue } = calculateValue(pie)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-laxo-card border border-laxo-border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{pie.name}</h2>
            {pie.ensName && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-laxo-accent font-mono">
                  {pie.ensName}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pie.ensName)
                    alert('ENS name copied to clipboard!')
                  }}
                  className="text-xs text-gray-400 hover:text-gray-300 transition"
                  title="Copy ENS name"
                >
                  📋
                </button>
              </div>
            )}
            {pie.walletAddress && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Wallet:</span>
                <span className="text-xs text-gray-400 font-mono">
                  {pie.walletAddress}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pie.walletAddress)
                    alert('Wallet address copied to clipboard!')
                  }}
                  className="text-xs text-gray-400 hover:text-gray-300 transition"
                  title="Copy wallet address"
                >
                  📋
                </button>
              </div>
            )}
            <p className="text-sm text-gray-400">
              Created {new Date(pie.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-laxo-bg rounded-lg p-4 border border-laxo-border">
            <div className="text-xs text-gray-500 mb-1">Initial Value</div>
            <div className="text-xl font-bold text-white">
              ${pie.totalAmountUSDC.toFixed(2)}
            </div>
          </div>
          <div className="bg-laxo-bg rounded-lg p-4 border border-laxo-border">
            <div className="text-xs text-gray-500 mb-1">Current Value</div>
            <div className="text-xl font-bold text-white">
              ${totalValueUSDC.toFixed(2)}
            </div>
          </div>
          <div className="bg-laxo-bg rounded-lg p-4 border border-laxo-border">
            <div className="text-xs text-gray-500 mb-1">Total P&L</div>
            <div className={`text-xl font-bold ${
              totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-laxo-bg rounded-lg p-4 border border-laxo-border">
            <div className="text-xs text-gray-500 mb-1">Total P&L %</div>
            <div className={`text-xl font-bold ${
              totalPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-laxo-border">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-400">Currency</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-400">Allocation</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-400">Amount</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-400">Entry Price</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-400">Current Price</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-400">Value</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-400">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdingsWithValue.map((holding, index) => (
                  <tr key={index} className="border-b border-laxo-border/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{holding.currency.flag}</span>
                        <span className="text-sm text-white">{holding.currency.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-gray-400">
                      {holding.percentage.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-white">
                      ${holding.amountUSDC.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-gray-400">
                      {holding.entryPrice.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-white">
                      {holding.currentPrice.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-white">
                      ${holding.valueUSDC.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-sm font-semibold ${
                        holding.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {holding.pnl >= 0 ? '+' : ''}${holding.pnl.toFixed(2)}
                      </span>
                      <div className={`text-xs ${
                        holding.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-laxo-border bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-laxo-bg"
          >
            Close
          </button>
          <button
            onClick={onLiquidate}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
          >
            {loading ? 'Liquidating...' : 'Liquidate All'}
          </button>
        </div>
      </div>
    </div>
  )
}
