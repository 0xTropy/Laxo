'use client'

import { useState } from 'react'

const QUICK_AMOUNTS = [10, 50, 100, 500]
const QUICK_TIMEFRAMES = [
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
  { label: '1 hour', seconds: 3600 },
]

export default function QuickBetModal({ isOpen, onClose, currency, onPlaceBet }) {
  const [selectedAmount, setSelectedAmount] = useState(10)
  const [selectedTimeframe, setSelectedTimeframe] = useState(QUICK_TIMEFRAMES[1]) // Default: 5 min
  const [positionType, setPositionType] = useState('long')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handlePlaceBet = async () => {
    setLoading(true)
    try {
      const resolutionTime = Math.floor(Date.now() / 1000) + selectedTimeframe.seconds
      await onPlaceBet({
        currency,
        amount: selectedAmount,
        timeframe: selectedTimeframe,
        positionType,
        resolutionTime
      })
      onClose()
    } catch (error) {
      console.error('Error placing bet:', error)
    } finally {
      setLoading(false)
    }
  }

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
              Quick Bet - {currency.pair}
            </h2>
            <p className="text-sm text-gray-400">
              Select amount and timeframe to place your bet
            </p>
          </div>

          {/* Position Type */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 mb-2">Position</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPositionType('long')}
                className={`flex-1 rounded-lg px-4 py-3 text-base font-semibold transition ${
                  positionType === 'long'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-laxo-bg border border-laxo-border text-gray-400 hover:border-laxo-accent'
                }`}
              >
                📈 Long
              </button>
              <button
                onClick={() => setPositionType('short')}
                className={`flex-1 rounded-lg px-4 py-3 text-base font-semibold transition ${
                  positionType === 'short'
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                    : 'bg-laxo-bg border border-laxo-border text-gray-400 hover:border-laxo-accent'
                }`}
              >
                📉 Short
              </button>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 mb-2">Bet Amount (USDC)</div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selectedAmount === amount
                      ? 'bg-laxo-accent text-laxo-bg'
                      : 'bg-laxo-bg border border-laxo-border text-white hover:border-laxo-accent'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe Selection */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 mb-2">Timeframe</div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_TIMEFRAMES.map((timeframe) => (
                <button
                  key={timeframe.seconds}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selectedTimeframe.seconds === timeframe.seconds
                      ? 'bg-laxo-accent text-laxo-bg'
                      : 'bg-laxo-bg border border-laxo-border text-white hover:border-laxo-accent'
                  }`}
                >
                  {timeframe.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 p-4 bg-laxo-bg rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Bet Amount:</span>
              <span className="text-white font-semibold">{selectedAmount} USDC</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Timeframe:</span>
              <span className="text-white font-semibold">{selectedTimeframe.label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Position:</span>
              <span className={`font-semibold ${positionType === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                {positionType === 'long' ? '📈 Long' : '📉 Short'}
              </span>
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
              onClick={handlePlaceBet}
              disabled={loading}
              className="flex-1 rounded-lg bg-laxo-accent px-4 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Placing...' : 'Place Bet'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
