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
      } else {
        // In a real implementation, you'd fetch balance from Yellow Network
        wallet.setBalance({ usdc: 0 })
      }
    } catch (err) {
      console.error('Balance update error:', err)
    }
  }

  // Initialize Yellow SDK (but don't auto-connect)
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
      } catch (err) {
        console.error('Error initializing Yellow:', err)
        const errorMessage = err?.message || err?.toString() || 'Failed to initialize Yellow SDK'
        setError(errorMessage)
      }
    }

    initYellow()
  }, [])

  // Connect wallet and Yellow Network (creates test wallet)
  async function connectWallet() {
    if (!yellowClient) return

    try {
      setLoading(true)
      setError(null)

      // Setup test wallet
      const { userAddress } = await yellowClient.setupTestWallet()
      wallet.setUserAddress(userAddress)

      // Connect to Yellow Network
      await yellowClient.connect()
      wallet.setIsConnected(true)

      // Update balance
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

  // Disconnect wallet and Yellow Network
  async function disconnectWallet() {
    try {
      setLoading(true)
      setError(null)

      // Disconnect from Yellow Network
      if (yellowClient) {
        yellowClient.disconnect()
      }

      // Clear wallet state
      wallet.setIsConnected(false)
      wallet.setUserAddress(null)
      wallet.setBalance(null)

      console.log('✅ Wallet disconnected')
    } catch (err) {
      console.error('Disconnect error:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to disconnect'
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
