import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Arc Testnet configuration
// Chain ID: 5042002, uses USDC as native gas token
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})

// Create wagmi config for ENS resolution and Arc support
// Supports mainnet (for real ENS), Sepolia (for testing), and Arc (for Circle integration)
export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, arcTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
  },
})

// Default chain for ENS (mainnet has ENS, Sepolia doesn't)
export const ensChain = mainnet

// Arc network for Circle integration
export const arcChain = arcTestnet
