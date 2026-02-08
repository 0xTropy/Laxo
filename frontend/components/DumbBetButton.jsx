'use client'

import { useState } from 'react'

export default function DumbBetButton({ currency, onPlaceBet, disabled }) {
  const [loading, setLoading] = useState(false)

  const handleDumbBet = async () => {
    setLoading(true)
    try {
      // Default dumb bet: 10 USDC, 5 minutes, Long position
      const resolutionTime = Math.floor(Date.now() / 1000) + 300 // 5 minutes
      await onPlaceBet({
        currency,
        amount: 10,
        timeframe: { label: '5 min', seconds: 300 },
        positionType: 'long',
        resolutionTime
      })
    } catch (error) {
      console.error('Error placing dumb bet:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDumbBet}
      disabled={disabled || loading}
      className="w-full rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:from-purple-500/30 hover:to-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      title="One-click bet: 10 USDC, 5 min, Long"
    >
      {loading ? 'Placing...' : '🎲 Dumb Bet'}
    </button>
  )
}
