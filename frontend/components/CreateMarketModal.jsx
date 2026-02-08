'use client'

import { useState, useEffect } from 'react'
import { getCurrentPrice } from '../lib/oracle/priceFeed'

export default function CreateMarketModal({ isOpen, onClose, currency, quoteCurrency = 'USD', onCreateMarket }) {
  const [targetPrice, setTargetPrice] = useState('')
  const [resolutionTime, setResolutionTime] = useState('')
  const [customMinutes, setCustomMinutes] = useState('5')
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)

  // Determine decimal places for display based on price magnitude
  const getDisplayDecimals = (price) => {
    if (!price) return 4
    if (price < 0.01) return 6  // Very small prices (like JPY)
    if (price < 1) return 4     // Small prices (like most forex pairs)
    return 2                     // Larger prices
  }

  // Fetch current price when modal opens or currency/quoteCurrency changes
  useEffect(() => {
    if (!isOpen || !currency) {
      setCurrentPrice(null)
      return
    }

    const fetchPrice = async () => {
      setPriceLoading(true)
      try {
        const pair = `${currency.code}/${quoteCurrency}`
        const { price } = await getCurrentPrice(pair)
        setCurrentPrice(price)
        
        // Pre-populate target price with current price
        // Use the same precision as display to ensure consistency
        if (!targetPrice) {
          const decimals = getDisplayDecimals(price)
          setTargetPrice(price.toFixed(decimals))
        }
      } catch (error) {
        console.error('Error fetching current price:', error)
        setCurrentPrice(null)
      } finally {
        setPriceLoading(false)
      }
    }

    fetchPrice()
  }, [isOpen, currency, quoteCurrency])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTargetPrice('')
      setResolutionTime('')
      setCustomMinutes('5')
      setUseCustomTime(false)
      setCurrentPrice(null)
    }
  }, [isOpen])

  // Calculate percentage difference
  const calculatePercentageDiff = () => {
    if (!targetPrice || !currentPrice) return null
    
    const target = parseFloat(targetPrice)
    if (isNaN(target) || target <= 0) return null
    
    // Use the same precision for comparison as we use for display
    // This ensures the displayed values match the calculation
    const decimals = getDisplayDecimals(currentPrice)
    const roundedTarget = parseFloat(target.toFixed(decimals))
    const roundedCurrent = parseFloat(currentPrice.toFixed(decimals))
    
    // If rounded values are the same, return 0 (no meaningful difference)
    if (roundedTarget === roundedCurrent) return 0
    
    // Calculate percentage difference using the actual entered value vs current price
    // This gives the true prediction difference
    const diff = target - currentPrice
    const percentDiff = (diff / currentPrice) * 100
    
    // Only return if difference is significant (above 0.01% to avoid rounding noise)
    if (Math.abs(percentDiff) < 0.01) return 0
    
    return percentDiff
  }

  const percentageDiff = calculatePercentageDiff()

  if (!isOpen) return null

  const handleCreateMarket = async () => {
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      alert('Please enter a valid target price')
      return
    }

    setLoading(true)
    try {
      // Calculate resolution time
      let resolutionTimestamp
      if (useCustomTime && customMinutes) {
        // Custom minutes from now
        resolutionTimestamp = Math.floor(Date.now() / 1000) + (parseInt(customMinutes) * 60)
      } else if (resolutionTime) {
        // Custom date/time
        resolutionTimestamp = Math.floor(new Date(resolutionTime).getTime() / 1000)
        if (resolutionTimestamp <= Math.floor(Date.now() / 1000)) {
          alert('Resolution time must be in the future')
          setLoading(false)
          return
        }
      } else {
        alert('Please set a resolution time')
        setLoading(false)
        return
      }

      await onCreateMarket({
        currency,
        targetPrice: parseFloat(targetPrice),
        resolutionTime: resolutionTimestamp,
        targetPriceFormatted: targetPrice
      })
      
      // Reset form
      setTargetPrice('')
      setResolutionTime('')
      setCustomMinutes('5')
      setUseCustomTime(false)
      onClose()
    } catch (error) {
      console.error('Error creating market:', error)
      alert('Failed to create market: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Quick time presets
  const timePresets = [
    { label: '1 min', minutes: 1 },
    { label: '5 min', minutes: 5 },
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '24 hours', minutes: 1440 },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-laxo-border bg-laxo-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-gray-400 transition hover:bg-laxo-bg hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              Create Market - {currency?.name || currency?.code}
            </h2>
            <p className="text-sm text-gray-400">
              Set target price and resolution time for your prediction market
            </p>
          </div>

          {/* Target Price */}
          <div className="mb-6">
            <label className="block text-xs text-gray-500 mb-2">
              Target Price ({quoteCurrency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={`Enter target price in ${quoteCurrency}`}
                className="w-full rounded-lg border border-laxo-border bg-laxo-bg px-4 py-3 text-base text-white placeholder-gray-500 focus:border-laxo-accent focus:outline-none focus:ring-2 focus:ring-laxo-accent/20"
              />
            </div>
            <div className="mt-1">
              {priceLoading ? (
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></span>
                  Loading current price...
                </p>
              ) : currentPrice ? (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    1 {currency.symbol} = {currentPrice.toFixed(getDisplayDecimals(currentPrice))} {quoteCurrency}
                  </p>
                  {percentageDiff !== null && percentageDiff !== 0 && (
                    <p className={`text-xs font-semibold ${
                      percentageDiff > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {percentageDiff > 0 ? '↑' : '↓'} {Math.abs(percentageDiff).toFixed(2)}% 
                      {percentageDiff > 0 ? ' above' : ' below'} current price
                    </p>
                  )}
                  {percentageDiff === 0 && (
                    <p className="text-xs text-gray-400">
                      Target matches current price
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  {currency && `1 ${currency.symbol} = ? ${quoteCurrency}`}
                </p>
              )}
            </div>
          </div>

          {/* Resolution Time Options */}
          <div className="mb-6">
            <label className="block text-xs text-gray-500 mb-2">
              Resolution Time
            </label>
            
            {/* Quick Presets */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-2">Quick Presets:</div>
              <div className="grid grid-cols-3 gap-2">
                {timePresets.map((preset) => (
                  <button
                    key={preset.minutes}
                    onClick={() => {
                      setUseCustomTime(true)
                      setCustomMinutes(preset.minutes.toString())
                      setResolutionTime('')
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      useCustomTime && customMinutes === preset.minutes.toString()
                        ? 'bg-laxo-accent text-laxo-bg'
                        : 'bg-laxo-bg border border-laxo-border text-white hover:border-laxo-accent'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Minutes */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-2">Custom Minutes:</div>
              <input
                type="number"
                min="1"
                value={customMinutes}
                onChange={(e) => {
                  setUseCustomTime(true)
                  setCustomMinutes(e.target.value)
                  setResolutionTime('')
                }}
                placeholder="Minutes from now"
                className="w-full rounded-lg border border-laxo-border bg-laxo-bg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-laxo-accent focus:outline-none focus:ring-2 focus:ring-laxo-accent/20"
              />
            </div>

            {/* Custom Date/Time */}
            <div>
              <div className="text-xs text-gray-500 mb-2">Or Custom Date/Time:</div>
              <input
                type="datetime-local"
                value={resolutionTime}
                onChange={(e) => {
                  setResolutionTime(e.target.value)
                  setUseCustomTime(false)
                  setCustomMinutes('')
                }}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-lg border border-laxo-border bg-laxo-bg px-4 py-2 text-sm text-white focus:border-laxo-accent focus:outline-none focus:ring-2 focus:ring-laxo-accent/20"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 p-4 bg-laxo-bg rounded-lg">
            <div className="text-xs text-gray-500 mb-2">Market Summary:</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Currency:</span>
                <span className="text-white font-semibold">{currency?.name || currency?.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Price:</span>
                <span className="text-white font-semibold">{targetPrice || '--'} {quoteCurrency}</span>
              </div>
              {currency && targetPrice && (
                <div className="text-xs text-gray-500 mt-1">
                  1 {currency.symbol} = {targetPrice} {quoteCurrency}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Resolves:</span>
                <span className="text-white font-semibold">
                  {useCustomTime && customMinutes
                    ? `In ${customMinutes} minutes`
                    : resolutionTime
                    ? new Date(resolutionTime).toLocaleString()
                    : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-laxo-border bg-transparent px-4 py-3 text-base font-semibold text-white transition hover:bg-laxo-bg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateMarket}
              disabled={loading || !targetPrice}
              className="flex-1 rounded-lg bg-laxo-accent px-4 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Market'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
