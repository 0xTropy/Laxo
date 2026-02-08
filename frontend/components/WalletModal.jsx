'use client'

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
  onDisconnect
}) {
  if (!isOpen) return null

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
                <p className="text-xs text-gray-500 mt-2">
                  Connect to create a test wallet and start trading
                </p>
              </div>
              
              <button
                onClick={onConnect}
                disabled={loading}
                className="w-full rounded-lg bg-laxo-accent px-4 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : 'Connect Wallet & Yellow Network'}
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
                    <div className="text-xs text-gray-500 mb-1">Wallet Address</div>
                    <div className="text-sm font-mono text-gray-300 break-all">
                      {userAddress}
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

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onAddFunds('100000000')}
                  disabled={loading}
                  className="w-full rounded-lg bg-laxo-accent px-4 py-3 text-base font-semibold text-laxo-bg transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add 100 USDC
                </button>
                
                <button
                  onClick={onDisconnect}
                  disabled={loading}
                  className="w-full rounded-lg border border-red-500/50 bg-transparent px-4 py-3 text-base font-semibold text-red-400 transition hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
