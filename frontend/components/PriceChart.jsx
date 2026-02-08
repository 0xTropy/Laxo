'use client'

import { useEffect, useState } from 'react'
import { subscribeToPrice, getPriceHistory } from '../lib/oracle/priceFeed'

export default function PriceChart({ pair, height = 180 }) {
  const [currentPrice, setCurrentPrice] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [priceChange, setPriceChange] = useState(0)
  const [priceChangePercent, setPriceChangePercent] = useState(0)

  useEffect(() => {
    // Reset state when pair changes (for rehydration)
    setIsLoading(true)
    setCurrentPrice(null)
    setPriceHistory([])
    setPriceChange(0)
    setPriceChangePercent(0)
    
    // Pair is already in format like "EUR/USD" or "JPY/USD"
    const oraclePair = pair.includes('/') ? pair : `${pair}/USD`
    
    // Fetch historical data first to populate chart
    const loadHistoricalData = async () => {
      try {
        const { fetchHistoricalPrices } = await import('../lib/oracle/priceFeed')
        // Force refresh to clear old data and fetch fresh
        await fetchHistoricalPrices(oraclePair, 1, true) // Last 24 hours, force refresh
        
        const history = getPriceHistory(oraclePair, 50)
        setPriceHistory(history)
        
        if (history.length > 0) {
          setCurrentPrice(history[history.length - 1].price)
          setIsLoading(false)
          
          // Calculate price change
          if (history.length > 1) {
            const firstPrice = history[0].price
            const lastPrice = history[history.length - 1].price
            const change = lastPrice - firstPrice
            const changePercent = (change / firstPrice) * 100
            setPriceChange(change)
            setPriceChangePercent(changePercent)
          }
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading historical data:', error)
        setIsLoading(false)
        // Continue with empty history
      }
    }
    
    loadHistoricalData()
    
    // Subscribe to price updates
    const unsubscribe = subscribeToPrice(oraclePair, (price, timestamp) => {
      setCurrentPrice(price)
      setIsLoading(false)
      
      // Update history
      const newHistory = getPriceHistory(oraclePair, 50)
      setPriceHistory(newHistory)
      
      // Calculate price change
      if (newHistory.length > 1) {
        const firstPrice = newHistory[0].price
        const lastPrice = newHistory[newHistory.length - 1].price
        const change = lastPrice - firstPrice
        const changePercent = (change / firstPrice) * 100
        setPriceChange(change)
        setPriceChangePercent(changePercent)
      }
    })

    return unsubscribe
  }, [pair])

  if (isLoading && priceHistory.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-laxo-accent mx-auto mb-2"></div>
          <div className="text-xs">Loading real-time data...</div>
        </div>
      </div>
    )
  }

  if (priceHistory.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-gray-500">
        <div className="text-xs">No price data available</div>
      </div>
    )
  }

  // Calculate min/max for scaling with proper padding
  const prices = priceHistory.map(p => p.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || maxPrice * 0.01 // At least 1% range
  const padding = priceRange * 0.15 // 15% padding

  // Professional chart dimensions
  const chartHeight = height - 60
  const chartWidth = 300
  const margin = { top: 10, right: 10, bottom: 30, left: 0 }

  // Generate smooth curve points using bezier-like interpolation
  const getChartPoints = () => {
    if (priceHistory.length < 2) return []
    
    const points = priceHistory.map((point, index) => {
      const x = margin.left + (index / (priceHistory.length - 1)) * (chartWidth - margin.left - margin.right)
      const normalizedPrice = (point.price - minPrice + padding) / (priceRange + padding * 2)
      const y = margin.top + chartHeight - (normalizedPrice * chartHeight)
      return { x, y, price: point.price, timestamp: point.timestamp }
    })
    
    return points
  }

  const chartPoints = getChartPoints()
  
  // Generate path for smooth line
  const generatePath = () => {
    if (chartPoints.length < 2) return ''
    
    let path = `M ${chartPoints[0].x} ${chartPoints[0].y}`
    
    for (let i = 1; i < chartPoints.length; i++) {
      const prev = chartPoints[i - 1]
      const curr = chartPoints[i]
      const next = chartPoints[i + 1] || curr
      
      // Smooth curve using quadratic bezier
      const cp1x = prev.x + (curr.x - prev.x) / 2
      const cp1y = prev.y
      const cp2x = curr.x - (next.x - curr.x) / 2
      const cp2y = curr.y
      
      path += ` Q ${cp1x} ${cp1y} ${(curr.x + cp1x) / 2} ${(curr.y + cp1y) / 2}`
      if (i < chartPoints.length - 1) {
        path += ` T ${curr.x} ${curr.y}`
      } else {
        path += ` L ${curr.x} ${curr.y}`
      }
    }
    
    return path
  }

  const path = generatePath()
  const isPositive = priceChange >= 0

  return (
    <div className="w-full">
      {/* Price Header */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-xs text-gray-500">Live Price</div>
          {priceChange !== 0 && (
            <div className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(priceChangePercent).toFixed(2)}%
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-xl font-bold text-white">
            {currentPrice ? currentPrice.toFixed(4) : '--'}
          </div>
          {priceChange !== 0 && (
            <div className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Professional Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height={height}
          className="overflow-visible"
          viewBox={`0 0 ${chartWidth} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background gradient */}
          <defs>
            <linearGradient id={`gradient-${pair}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = margin.top + chartHeight * ratio
            const price = maxPrice - (priceRange * ratio)
            return (
              <g key={ratio}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={chartWidth - margin.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={chartWidth - margin.right + 5}
                  y={y + 4}
                  fill="rgba(255, 255, 255, 0.4)"
                  fontSize="10"
                  textAnchor="start"
                >
                  {price.toFixed(4)}
                </text>
              </g>
            )
          })}
          
          {/* Area under curve */}
          {path && chartPoints.length > 0 && (
            <path
              d={`${path} L ${chartPoints[chartPoints.length - 1].x} ${margin.top + chartHeight} L ${chartPoints[0].x} ${margin.top + chartHeight} Z`}
              fill={`url(#gradient-${pair})`}
            />
          )}
          
          {/* Price line */}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="rgb(6, 182, 212)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Current price indicator */}
          {currentPrice && chartPoints.length > 0 && (
            <>
              <circle
                cx={chartPoints[chartPoints.length - 1].x}
                cy={chartPoints[chartPoints.length - 1].y}
                r="5"
                fill="rgb(6, 182, 212)"
                stroke="rgb(10, 14, 23)"
                strokeWidth="2"
              />
              <circle
                cx={chartPoints[chartPoints.length - 1].x}
                cy={chartPoints[chartPoints.length - 1].y}
                r="8"
                fill="rgb(6, 182, 212)"
                opacity="0.2"
              />
            </>
          )}
          
          {/* Time labels */}
          {chartPoints.length > 0 && (
            <>
              <text
                x={chartPoints[0].x}
                y={height - 10}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="9"
                textAnchor="middle"
              >
                {new Date(chartPoints[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
              <text
                x={chartPoints[chartPoints.length - 1].x}
                y={height - 10}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="9"
                textAnchor="middle"
              >
                Now
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
