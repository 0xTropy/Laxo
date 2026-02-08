'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import { getYellowClient } from '../../lib/yellow/yellowClient'
import ErrorModal from '../../components/ErrorModal'
import WalletModal from '../../components/WalletModal'
import BlockchainLogs from '../../components/BlockchainLogs'

export default function HubLayout({ children }) {
  const wallet = useWallet()
  const [yellowClient, setYellowClient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Update balance from Yellow Network
  const updateBalance = async (client, connected) => {
    if (!client || !connected) return

    try {
      const status = client.getStatus()
      // For test wallets, use the test balance
      if (status.isTestWallet && status.balance) {
        wallet.setBalance(status.balance)
        // Save updated balance to cache
        if (client.saveTestWalletToCache) {
          client.saveTestWalletToCache()
        }
      } else {
        // In a real implementation, you'd fetch balance from Yellow Network
        wallet.setBalance({ usdc: 0 })
      }
    } catch (err) {
      console.error('Balance update error:', err)
    }
  }

  // Initialize Yellow SDK and auto-load cached wallet if available
  useEffect(() => {
    async function initYellow() {
      try {
        const client = getYellowClient({
          endpoint: 'wss://clearnet-sandbox.yellow.com/ws',
          onMessage: (message) => {
            console.log('Yellow message:', message)
            if (message.type === 'payment' || message.type === 'balance_update') {
              const status = client.getStatus()
              updateBalance(client, status.isConnected)
            }
          },
          onError: (err) => {
            console.error('Yellow error:', err)
            const errorMessage = err?.message || err?.toString() || 'An unknown error occurred'
            setError(errorMessage)
          },
          onConnect: () => {
            wallet.setIsConnected(true)
          }
        })

        // Listen for balance updates from test wallet
        client.on('balance_update', (data) => {
          if (data && data.total) {
            wallet.setBalance(data.total)
          }
        })

        setYellowClient(client)

        // Auto-load cached wallet if available
        const cached = client.getCachedTestWallet()
        if (cached) {
          console.log('🔄 Auto-loading cached wallet...')
          wallet.setUserAddress(cached.address)
          wallet.setBalance(cached.balance)
          // Note: We don't auto-connect to Yellow Network, user needs to click Connect
        }
      } catch (err) {
        console.error('Error initializing Yellow:', err)
        const errorMessage = err?.message || err?.toString() || 'Failed to initialize Yellow SDK'
        setError(errorMessage)
      }
    }

    initYellow()
  }, [])

  // Connect wallet and Yellow Network (creates or loads cached test wallet)
  async function connectWallet() {
    if (!yellowClient) return

    try {
      setLoading(true)
      setError(null)

      // Setup test wallet (loads from cache if available)
      const { userAddress } = await yellowClient.setupTestWallet()
      wallet.setUserAddress(userAddress)

      // Restore balance from cached wallet
      const cached = yellowClient.getCachedTestWallet()
      if (cached && cached.balance) {
        wallet.setBalance(cached.balance)
        // Also update the client's internal balance
        if (yellowClient.isTestWallet) {
          yellowClient.testBalance = cached.balance
        }
      }

      // Connect to Yellow Network
      await yellowClient.connect()
      wallet.setIsConnected(true)

      // Update balance (this will also save to cache)
      await updateBalance(yellowClient, true)
    } catch (err) {
      console.error('Connection error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to connect'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Add test funds to test wallet
  async function addTestFunds(amount = '100000000') {
    if (!yellowClient || !wallet.isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Add funds (amount is in smallest unit, e.g., 100000000 = 100 USDC with 6 decimals)
      yellowClient.addTestFunds(amount, 'usdc')
      
      // Update balance display
      await updateBalance(yellowClient, wallet.isConnected)
    } catch (err) {
      console.error('Add funds error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to add test funds'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Disconnect wallet and Yellow Network (but keep wallet in cache)
  async function disconnectWallet() {
    try {
      setLoading(true)
      setError(null)

      // Save current balance to cache before disconnecting
      if (yellowClient && yellowClient.isTestWallet) {
        // Use current balance from wallet state if available, otherwise from client
        const currentBalance = wallet.balance || yellowClient.testBalance || { usdc: 0 }
        yellowClient.testBalance = currentBalance
        yellowClient.saveTestWalletToCache()
        console.log('💾 Saved wallet balance to cache:', currentBalance)
      }

      // Disconnect from Yellow Network
      if (yellowClient) {
        yellowClient.disconnect()
      }

      // Clear connection state only (wallet address and balance stay visible)
      wallet.setIsConnected(false)
      // Keep userAddress and balance in state so user can see their cached wallet
      // They'll be automatically restored when reconnecting

      console.log('✅ Wallet disconnected (cached wallet preserved)')
    } catch (err) {
      console.error('Disconnect error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to disconnect'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Forget wallet (clear cache and disconnect)
  async function forgetWallet() {
    try {
      setLoading(true)
      setError(null)

      // Disconnect from Yellow Network
      if (yellowClient) {
        yellowClient.disconnect()
        // Clear wallet cache
        yellowClient.clearTestWalletCache()
      }

      // Clear wallet state
      wallet.setIsConnected(false)
      wallet.setUserAddress(null)
      wallet.setBalance(null)

      console.log('✅ Wallet forgotten and cache cleared')
    } catch (err) {
      console.error('Forget wallet error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to forget wallet'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Error Modal */}
      <ErrorModal 
        error={error} 
        onClose={() => setError(null)} 
      />
      
      {/* Wallet Modal */}
      <WalletModal
        isOpen={wallet.walletModalOpen}
        onClose={() => wallet.setWalletModalOpen(false)}
        isConnected={wallet.isConnected}
        userAddress={wallet.userAddress}
        balance={wallet.balance}
        loading={loading}
        onConnect={async () => {
          await connectWallet()
          // Balance will be updated by connectWallet, but refresh it to be sure
          if (yellowClient) {
            const status = yellowClient.getStatus()
            if (status.isConnected) {
              await updateBalance(yellowClient, true)
            }
          }
        }}
        onAddFunds={async (amount) => {
          await addTestFunds(amount)
        }}
        onDisconnect={async () => {
          await disconnectWallet()
        }}
        onForgetWallet={async () => {
          await forgetWallet()
        }}
      />
      
      {/* Blockchain Logs Modal */}
      <BlockchainLogs
        isOpen={wallet.blockchainLogsOpen}
        onClose={() => wallet.setBlockchainLogsOpen(false)}
      />

      {children}
    </>
  )
}
