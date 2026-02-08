'use client'

import { useState } from 'react'
import { requestUSDC, formatAddress, copyToClipboard } from '../lib/faucet'

export default function WalletModal({ 
  isOpen, 
  onClose, 
  isConnected, 
  userAddress, 
  balance, 
  loading,
  onConnect,
  onAddFunds,
  onDeposit,
  onDisconnect,
  onForgetWallet
}) {
  const [faucetLoading, setFaucetLoading] = useState(false)
  const [faucetMessage, setFaucetMessage] = useState(null)
  const [copied, setCopied] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [amountError, setAmountError] = useState(null)

  if (!isOpen) return null

  const handleCopyAddress = async () => {
    if (userAddress) {
      const success = await copyToClipboard(userAddress)
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const handleFaucet = async () => {
    if (!userAddress) return
    
    setFaucetLoading(true)
    setFaucetMessage(null)
    
    try {
      const result = await requestUSDC(userAddress)
      if (result.success) {
        if (result.manual) {
          // Open faucet URL in new tab
          window.open(result.faucetUrl, '_blank')
          setFaucetMessage({
            type: 'info',
            text: result.message,
            faucetUrl: result.faucetUrl
          })
        } else {
          // If faucet API worked, add funds to test wallet
          if (result.amount && onAddFunds) {
            await onAddFunds(result.amount)
            setFaucetMessage({
              type: 'success',
              text: `Successfully received ${(parseInt(result.amount) / 1000000).toFixed(2)} USDC!`
            })
          }
        }
      } else {
        setFaucetMessage({
          type: 'error',
          text: result.message
        })
      }
    } catch (error) {
      setFaucetMessage({
        type: 'error',
        text: `Faucet error: ${error.message}`
      })
    } finally {
      setFaucetLoading(false)
    }
  }

  const handleAddCustomAmount = () => {
    setAmountError(null)
    
    // Validate input
    const amount = parseFloat(customAmount)
    if (isNaN(amount) || amount <= 0) {
      setAmountError('Please enter a valid amount greater than 0')
      return
    }

    if (amount > 1000000) {
      setAmountError('Amount too large (max 1,000,000 USDC)')
      return
    }

    // Convert USDC to smallest unit (6 decimals)
    // e.g., 100 USDC = 100000000 (100 * 10^6)
    const amountInSmallestUnit = Math.floor(amount * 1000000).toString()
    
    if (onAddFunds) {
      onAddFunds(amountInSmallestUnit)
      setCustomAmount('') // Clear input after adding
    }
  }

  const handleQuickAdd = (amount) => {
    setCustomAmount('')
    setAmountError(null)
    if (onAddFunds) {
      onAddFunds((amount * 1000000).toString())
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
      <div className="fixed top-4 right-4 z-50 p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-laxo-border bg-laxo-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-gray-400 transition hover:bg-laxo-bg hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              Test Wallet
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 rounded bg-laxo-accent/20 text-laxo-accent font-semibold">
                Eth Sepolia
              </span>
              <span className="text-xs text-gray-500">Testnet</span>
            </div>
            <p className="text-sm text-gray-400">
              Manage your testnet wallet and funds
            </p>
          </div>

          {!isConnected ? (
            /* Not Connected State */
            <div className="space-y-4">
              <div className="rounded-lg border border-laxo-border bg-laxo-bg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-sm text-gray-400">Not Connected</span>
                </div>
                {userAddress && (
                  <div className="mt-3 pt-3 border-t border-laxo-border">
                    <div className="text-xs text-gray-500 mb-1">Cached Wallet</div>
                    <div className="text-sm font-mono text-gray-300 break-all">
                      {formatAddress(userAddress)}
                    </div>
                    {balance && (
                      <div className="text-xs text-gray-500 mt-2">
                        Balance: {(balance.usdc / 1000000).toFixed(2)} USDC
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {userAddress ? 'Reconnect to use your cached wallet' : 'Connect to create a test wallet and start trading'}
                </p>
              </div>
              
              <button
                onClick={onConnect}
                disabled={loading}
                className="w-full rounded-lg bg-laxo-accent px-4 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : userAddress ? 'Reconnect Wallet' : 'Connect Wallet & Yellow Network'}
              </button>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="rounded-lg border border-laxo-border bg-laxo-bg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-white">Connected</span>
                  </div>
                </div>
                
                {userAddress && (
                  <div className="mt-3 pt-3 border-t border-laxo-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-500">Wallet Address</div>
                      <button
                        onClick={handleCopyAddress}
                        className="text-xs text-laxo-accent hover:text-cyan-400 transition"
                      >
                        {copied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-sm font-mono text-gray-300 break-all">
                      {formatAddress(userAddress)}
                    </div>
                  </div>
                )}
              </div>

              {/* Balance */}
              {balance && (
                <div className="rounded-lg border border-laxo-border bg-laxo-bg p-4">
                  <div className="text-xs text-gray-500 mb-1">Balance</div>
                  <div className="text-2xl font-bold text-white">
                    {(balance.usdc / 1000000).toFixed(2)} USDC
                  </div>
                </div>
              )}

              {/* Faucet Message */}
              {faucetMessage && (
                <div className={`rounded-lg border p-3 ${
                  faucetMessage.type === 'success' 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : faucetMessage.type === 'error'
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-laxo-accent/50 bg-laxo-accent/10'
                }`}>
                  <p className={`text-sm ${
                    faucetMessage.type === 'success'
                      ? 'text-green-400'
                      : faucetMessage.type === 'error'
                      ? 'text-red-400'
                      : 'text-laxo-accent'
                  }`}>
                    {faucetMessage.text}
                  </p>
                  {faucetMessage.faucetUrl && (
                    <a
                      href={faucetMessage.faucetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-laxo-accent hover:text-cyan-400 underline mt-1 inline-block"
                    >
                      Open Faucet →
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {/* Faucet Button */}
                <button
                  onClick={handleFaucet}
                  disabled={loading || faucetLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-laxo-accent to-cyan-500 px-4 py-3 text-base font-semibold text-laxo-bg transition hover:from-cyan-400 hover:to-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {faucetLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Requesting...
                    </>
                  ) : (
                    <>
                      <span>🚰</span>
                      Get USDC from Faucet
                    </>
                  )}
                </button>

                {/* Custom Amount Input */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000000"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value)
                        setAmountError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomAmount()
                        }
                      }}
                      placeholder="Enter amount"
                      className="flex-1 rounded-lg border border-laxo-border bg-laxo-bg px-4 py-3 text-base text-white placeholder-gray-500 focus:border-laxo-accent focus:outline-none focus:ring-2 focus:ring-laxo-accent/20 disabled:opacity-50"
                      disabled={loading}
                    />
                    <button
                      onClick={handleAddCustomAmount}
                      disabled={loading || !customAmount}
                      className="rounded-lg bg-laxo-accent px-6 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  {amountError && (
                    <p className="text-xs text-red-400">{amountError}</p>
                  )}
                  
                  {/* Quick Add Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickAdd(10)}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-laxo-border bg-laxo-bg px-3 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +10
                    </button>
                    <button
                      onClick={() => handleQuickAdd(50)}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-laxo-border bg-laxo-bg px-3 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +50
                    </button>
                    <button
                      onClick={() => handleQuickAdd(100)}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-laxo-border bg-laxo-bg px-3 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +100
                    </button>
                    <button
                      onClick={() => handleQuickAdd(1000)}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-laxo-border bg-laxo-bg px-3 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +1K
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={onDisconnect}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-gray-500/50 bg-transparent px-4 py-3 text-base font-semibold text-gray-400 transition hover:border-gray-500 hover:bg-gray-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Disconnect
                  </button>
                  {onForgetWallet && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to forget this wallet? This will clear it from cache and you\'ll need to create a new one.')) {
                          onForgetWallet()
                        }
                      }}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-red-500/50 bg-transparent px-4 py-3 text-base font-semibold text-red-400 transition hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Forget wallet and clear cache"
                    >
                      Forget Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
