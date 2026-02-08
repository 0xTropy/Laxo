'use client'

import { useState, useEffect } from 'react'
import { getArcIntegrationClient } from '../lib/circle/arcIntegration'
import { useWallet } from '../contexts/WalletContext'

/**
 * Arc Integration Component
 * Shows Circle Gateway/Wallets integration for chain-abstracted USDC operations
 */
export default function ArcIntegration() {
  const wallet = useWallet()
  const { userAddress } = wallet
  const [arcClient, setArcClient] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [arcWallet, setArcWallet] = useState(null)
  const [unifiedBalance, setUnifiedBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (userAddress && !arcClient) {
      const client = getArcIntegrationClient({
        userId: userAddress,
        // API key will be read from environment variable automatically
      })
      setArcClient(client)
    }
  }, [userAddress, arcClient])

  const initializeArc = async () => {
    if (!arcClient || !userAddress) {
      setError('Wallet not connected')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await arcClient.initialize(userAddress)
      setInitialized(true)
      console.log('Arc integration initialized:', result)
    } catch (err) {
      setError(err.message || 'Failed to initialize Arc integration')
      console.error('Arc initialization error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createArcWallet = async () => {
    if (!arcClient) {
      setError('Arc client not initialized')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const wallet = await arcClient.createArcWallet()
      setArcWallet(wallet)
      console.log('Arc wallet created:', wallet)
    } catch (err) {
      setError(err.message || 'Failed to create Arc wallet')
      console.error('Arc wallet creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnifiedBalance = async () => {
    if (!arcClient || !userAddress) {
      setError('Arc client or wallet not available')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const balances = await arcClient.getUnifiedBalance([userAddress])
      setUnifiedBalance(balances)
      console.log('Unified balance:', balances)
    } catch (err) {
      setError(err.message || 'Failed to fetch unified balance')
      console.error('Balance fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-laxo-border bg-laxo-card p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-white mb-2">
          Arc Integration (Circle Gateway & Wallets)
        </h3>
        <p className="text-sm text-gray-400">
          Chain-abstracted USDC operations powered by Circle Gateway and Circle Wallets
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {!initialized && (
          <button
            onClick={initializeArc}
            disabled={loading || !userAddress}
            className="w-full rounded-lg bg-laxo-accent/20 border border-laxo-accent/50 px-4 py-2 text-sm font-semibold text-laxo-accent transition hover:bg-laxo-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Initializing...' : 'Initialize Arc Integration'}
          </button>
        )}

        {initialized && !arcWallet && (
          <button
            onClick={createArcWallet}
            disabled={loading}
            className="w-full rounded-lg bg-laxo-accent/20 border border-laxo-accent/50 px-4 py-2 text-sm font-semibold text-laxo-accent transition hover:bg-laxo-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Arc Wallet'}
          </button>
        )}

        {initialized && (
          <button
            onClick={fetchUnifiedBalance}
            disabled={loading}
            className="w-full rounded-lg border border-laxo-border bg-laxo-bg px-4 py-2 text-sm font-semibold text-white transition hover:border-laxo-accent hover:bg-laxo-card disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Get Unified USDC Balance'}
          </button>
        )}

        {arcWallet && (
          <div className="mt-4 p-4 rounded-lg bg-laxo-bg border border-laxo-border">
            <div className="text-xs text-gray-500 mb-2">Arc Wallet</div>
            <div className="text-sm font-mono text-white break-all">
              {arcWallet.data?.walletId || 'Wallet created'}
            </div>
          </div>
        )}

        {unifiedBalance && (
          <div className="mt-4 p-4 rounded-lg bg-laxo-bg border border-laxo-border">
            <div className="text-xs text-gray-500 mb-2">Unified Balance</div>
            <div className="text-sm text-white">
              {JSON.stringify(unifiedBalance, null, 2)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-laxo-border">
        <div className="text-xs text-gray-500 space-y-1">
          <div>✅ Circle Gateway: Cross-chain USDC transfers</div>
          <div>✅ Circle Wallets: User-controlled wallet management</div>
          <div>✅ Arc Network: USDC-native gas, sub-second finality</div>
        </div>
      </div>
    </div>
  )
}
