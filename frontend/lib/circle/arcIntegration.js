/**
 * Arc Integration Module
 * Combines Circle Gateway and Circle Wallets for Arc network operations
 * Enables chain-abstracted USDC operations across multiple chains
 */

import { getCircleGatewayClient } from './gateway'
import { getCircleWalletsClient } from './wallets'

/**
 * Arc Integration Client
 * Provides unified interface for Arc network operations
 */
export class ArcIntegrationClient {
  constructor(options = {}) {
    // Pass API key from environment if not provided
    const config = {
      ...options,
      apiKey: options.apiKey || (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_CIRCLE_API_KEY : undefined),
    }
    this.gateway = getCircleGatewayClient(config)
    this.wallets = getCircleWalletsClient(config)
    this.userId = options.userId || null
  }

  /**
   * Initialize Arc integration for a user
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(userId) {
    try {
      // Initialize Circle Wallets user
      const userData = await this.wallets.initializeUser(userId)
      this.userId = userId

      // Get Gateway info to verify connectivity
      const gatewayInfo = await this.gateway.getGatewayInfo()

      return {
        success: true,
        userId,
        userData,
        gatewayInfo,
      }
    } catch (error) {
      console.error('Error initializing Arc integration:', error)
      throw error
    }
  }

  /**
   * Create a wallet on Arc network
   * @returns {Promise<Object>} Wallet information
   */
  async createArcWallet() {
    if (!this.userId) {
      throw new Error('User must be initialized before creating wallet')
    }

    try {
      const wallet = await this.wallets.createWallet({
        blockchain: 'ARC',
      })

      return wallet
    } catch (error) {
      console.error('Error creating Arc wallet:', error)
      throw error
    }
  }

  /**
   * Get unified USDC balance across all chains via Gateway
   * @param {string[]} addresses - Addresses to check across chains
   * @returns {Promise<Object>} Unified balance information
   */
  async getUnifiedBalance(addresses) {
    try {
      const balances = await this.gateway.getTokenBalances(addresses)
      return balances
    } catch (error) {
      console.error('Error fetching unified balance:', error)
      throw error
    }
  }

  /**
   * Transfer USDC to Arc from another chain
   * @param {Object} params - Transfer parameters
   * @param {string} params.sourceChain - Source chain (e.g., 'ethereum', 'base')
   * @param {string} params.amount - Amount in smallest unit (6 decimals)
   * @param {string} params.recipient - Recipient address on Arc
   * @param {string} params.sender - Sender address on source chain
   * @returns {Promise<Object>} Transfer result
   */
  async transferToArc(params) {
    try {
      const sourceDomain = this.gateway.supportedDomains[params.sourceChain] || 0
      const arcDomain = this.gateway.supportedDomains.arc || 6

      const result = await this.gateway.transferUSDC({
        sourceDomain,
        destinationDomain: arcDomain,
        amount: params.amount,
        recipient: params.recipient,
        sender: params.sender,
      })

      return result
    } catch (error) {
      console.error('Error transferring to Arc:', error)
      throw error
    }
  }

  /**
   * Transfer USDC from Arc to another chain
   * @param {Object} params - Transfer parameters
   * @param {string} params.destinationChain - Destination chain (e.g., 'ethereum', 'base')
   * @param {string} params.amount - Amount in smallest unit (6 decimals)
   * @param {string} params.recipient - Recipient address on destination chain
   * @param {string} params.sender - Sender address on Arc
   * @returns {Promise<Object>} Transfer result
   */
  async transferFromArc(params) {
    try {
      const arcDomain = this.gateway.supportedDomains.arc || 6
      const destinationDomain = this.gateway.supportedDomains[params.destinationChain] || 0

      const result = await this.gateway.transferUSDC({
        sourceDomain: arcDomain,
        destinationDomain,
        amount: params.amount,
        recipient: params.recipient,
        sender: params.sender,
      })

      return result
    } catch (error) {
      console.error('Error transferring from Arc:', error)
      throw error
    }
  }

  /**
   * Get Arc wallet balance
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Wallet balance
   */
  async getArcWalletBalance(walletId) {
    try {
      const balances = await this.wallets.getWalletBalances(walletId)
      return balances
    } catch (error) {
      console.error('Error fetching Arc wallet balance:', error)
      throw error
    }
  }

  /**
   * Send USDC on Arc network
   * @param {Object} params - Transaction parameters
   * @param {string} params.walletId - Wallet ID
   * @param {string} params.destinationAddress - Recipient address
   * @param {string} params.amount - Amount in smallest unit (6 decimals)
   * @param {string} params.tokenId - Token ID (USDC, EURC, etc.)
   * @returns {Promise<Object>} Transaction result
   */
  async sendUSDCOnArc(params) {
    try {
      const transaction = await this.wallets.createTransaction({
        ...params,
        blockchain: 'ARC',
      })

      return transaction
    } catch (error) {
      console.error('Error sending USDC on Arc:', error)
      throw error
    }
  }
}

// Export singleton instance
let arcIntegrationInstance = null

export function getArcIntegrationClient(options) {
  if (!arcIntegrationInstance) {
    arcIntegrationInstance = new ArcIntegrationClient(options)
  }
  return arcIntegrationInstance
}

export default ArcIntegrationClient
