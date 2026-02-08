'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { subscribeToPrice, getPriceHistory } from '../lib/oracle/priceFeed'

export default function PriceChart({ pair, height = 150 }) {
  const [currentPrice, setCurrentPrice] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [priceChange, setPriceChange] = useState(0)
  const [priceChangePercent, setPriceChangePercent] = useState(0)
  const [priceHistory, setPriceHistory] = useState([]) // Simple array of recent prices
  
  // Use refs to avoid recreating history array on every render
  const historyRef = useRef([])
  const previousPriceRef = useRef(null)

  useEffect(() => {
    // Reset state when pair changes
    setIsLoading(true)
    setCurrentPrice(null)
    setPriceHistory([])
    setPriceChange(0)
    setPriceChangePercent(0)
    historyRef.current = []
    previousPriceRef.current = null
    
    // Pair is already in format like "EUR/USD" or "JPY/USD"
    const oraclePair = pair.includes('/') ? pair : `${pair}/USD`
    
    // Load initial history from priceFeed if available
    const initialHistory = getPriceHistory(oraclePair, 20)
    if (initialHistory.length > 0) {
      const prices = initialHistory.map(h => h.price)
      historyRef.current = prices
      setPriceHistory(prices)
      if (prices.length > 0) {
        previousPriceRef.current = prices[prices.length - 1]
        setCurrentPrice(prices[prices.length - 1])
        setIsLoading(false)
      }
    }
    
    // Subscribe to price updates (now deduplicated)
    const unsubscribe = subscribeToPrice(oraclePair, (price, timestamp) => {
      if (previousPriceRef.current !== null) {
        // Calculate change from previous price
        const change = price - previousPriceRef.current
        const changePercent = previousPriceRef.current > 0 ? (change / previousPriceRef.current) * 100 : 0
        setPriceChange(change)
        setPriceChangePercent(changePercent)
      }
      
      // Add to history (keep last 20 prices)
      historyRef.current.push(price)
      if (historyRef.current.length > 20) {
        historyRef.current.shift()
      }
      
      // Only update state if array reference changes (batch updates)
      setPriceHistory([...historyRef.current])
      
      previousPriceRef.current = price
      setCurrentPrice(price)
      setIsLoading(false)
    })

    return unsubscribe
  }, [pair])

  if (isLoading) {
    return (
      <div className="h-[150px] flex items-center justify-center text-gray-500">
        <div className="text-xs">Loading...</div>
      </div>
    )
  }

  if (!currentPrice) {
    return (
      <div className="h-[150px] flex items-center justify-center text-gray-500">
        <div className="text-xs">No price data</div>
      </div>
    )
  }

  const isPositive = priceChange >= 0

  // Use price history for chart, or create a simple range if no history
  const chartData = priceHistory.length > 0 ? priceHistory : [currentPrice, currentPrice]
  const minPrice = Math.min(...chartData)
  const maxPrice = Math.max(...chartData)
  const priceRange = maxPrice - minPrice || maxPrice * 0.01
  const chartHeight = height - 60
  const chartWidth = 100 // Percentage

  return (
    <div className="w-full">
      {/* Simple price display */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 mb-1">Live Price</div>
        <div className="flex items-baseline gap-2">
          <div className="text-lg font-bold text-white">
            {currentPrice.toFixed(4)}
          </div>
          {priceChange !== 0 && (
            <div className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(priceChangePercent).toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Simple line chart */}
      <div className="relative bg-laxo-bg/30 rounded p-2 border border-laxo-border/20" style={{ height: `${chartHeight}px`, minHeight: '80px' }}>
        <svg width="100%" height={chartHeight} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${pair.replace('/', '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight * ratio
            return (
              <line
                key={ratio}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            )
          })}
          
          {/* Price line and area */}
          {chartData.length > 1 && (() => {
            const points = chartData.map((price, idx) => {
              const xPercent = (idx / (chartData.length - 1)) * 100
              const normalizedPrice = priceRange > 0
                ? (price - minPrice) / priceRange
                : 0.5
              const y = chartHeight - (normalizedPrice * chartHeight)
              return { x: xPercent, y, price }
            })
            
            // Create polyline points string
            const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
            
            // Create area path
            const firstPoint = points[0]
            const lastPoint = points[points.length - 1]
            const areaPath = `M ${firstPoint.x},${chartHeight} L ${polylinePoints} L ${lastPoint.x},${chartHeight} Z`
            
            return (
              <>
                {/* Area under curve */}
                <path
                  d={areaPath}
                  fill={`url(#gradient-${pair.replace('/', '-')})`}
                />
                {/* Price line */}
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="rgb(6, 182, 212)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )
          })()}
          
          {/* Fallback: show horizontal line if only one data point or no movement */}
          {chartData.length === 1 && (
            <line
              x1="0"
              y1={chartHeight / 2}
              x2="100%"
              y2={chartHeight / 2}
              stroke="rgb(6, 182, 212)"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </svg>
        
        {/* Price label on the right (top only) */}
        {chartData.length > 0 && currentPrice && (
          <div className="absolute right-2 top-1 text-xs text-gray-500 pointer-events-none">
            <span className="text-[10px]">{currentPrice.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
