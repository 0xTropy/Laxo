'use client'

import { createContext, useContext, useState } from 'react'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [blockchainLogsOpen, setBlockchainLogsOpen] = useState(false)
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('testnet')
  const [isConnected, setIsConnected] = useState(false)
  const [userAddress, setUserAddress] = useState(null)
  const [balance, setBalance] = useState(null)

  return (
    <WalletContext.Provider
      value={{
        walletModalOpen,
        setWalletModalOpen,
        blockchainLogsOpen,
        setBlockchainLogsOpen,
        networkDropdownOpen,
        setNetworkDropdownOpen,
        selectedNetwork,
        setSelectedNetwork,
        isConnected,
        setIsConnected,
        userAddress,
        setUserAddress,
        balance,
        setBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    return {
      walletModalOpen: false,
      setWalletModalOpen: () => {},
      blockchainLogsOpen: false,
      setBlockchainLogsOpen: () => {},
      networkDropdownOpen: false,
      setNetworkDropdownOpen: () => {},
      selectedNetwork: 'testnet',
      setSelectedNetwork: () => {},
      isConnected: false,
      setIsConnected: () => {},
      userAddress: null,
      setUserAddress: () => {},
      balance: null,
      setBalance: () => {},
    }
  }
  return context
}
