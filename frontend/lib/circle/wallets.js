/**
 * Circle Wallets Integration
 * User-controlled wallets for multi-chain USDC management
 * Documentation: https://developers.circle.com/wallets
 */

/**
 * Circle Wallets Client
 * Manages wallet creation, balances, and transactions via Circle Wallets API
 */
export class CircleWalletsClient {
  constructor(options = {}) {
    // Circle Wallets API endpoint
    this.apiUrl = options.apiUrl || 'https://api.circle.com/v1/w3s'
    this.apiKey = options.apiKey || process.env.NEXT_PUBLIC_CIRCLE_API_KEY
    this.entitySecret = options.entitySecret || process.env.NEXT_PUBLIC_CIRCLE_ENTITY_SECRET
    
    // User ID for wallet management
    this.userId = options.userId || null
  }

  /**
   * Initialize user session
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Session information
   */
  async initializeUser(userId) {
    try {
      const response = await fetch(`${this.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          userId: userId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Circle Wallets API error: ${response.statusText}`)
      }

      const data = await response.json()
      this.userId = userId
      return data
    } catch (error) {
      console.error('Error initializing user:', error)
      throw error
    }
  }

  /**
   * Create a new wallet
   * @param {Object} options - Wallet creation options
   * @param {string} options.blockchain - Blockchain (e.g., 'ETH', 'AVAX', 'MATIC', 'ARC')
   * @returns {Promise<Object>} Wallet information
   */
  async createWallet(options = {}) {
    if (!this.userId) {
      throw new Error('User must be initialized before creating wallet')
    }

    try {
      const response = await fetch(`${this.apiUrl}/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          userId: this.userId,
          blockchains: [options.blockchain || 'ETH'],
        }),
      })

      if (!response.ok) {
        throw new Error(`Circle Wallets API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating wallet:', error)
      throw error
    }
  }

  /**
   * Get wallet information
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Wallet information
   */
  async getWallet(walletId) {
    try {
      const response = await fetch(`${this.apiUrl}/wallets/${walletId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Circle Wallets API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching wallet:', error)
      throw error
    }
  }

  /**
   * Get wallet balances
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Wallet balances
   */
  async getWalletBalances(walletId) {
    try {
      const response = await fetch(`${this.apiUrl}/wallets/${walletId}/balances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Circle Wallets API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching wallet balances:', error)
      throw error
    }
  }

  /**
   * Create a transaction (transfer USDC)
   * @param {Object} params - Transaction parameters
   * @param {string} params.walletId - Wallet ID
   * @param {string} params.destinationAddress - Recipient address
   * @param {string} params.amount - Amount in smallest unit (6 decimals for USDC)
   * @param {string} params.tokenId - Token ID (USDC, EURC, etc.)
   * @param {string} params.blockchain - Blockchain network
   * @returns {Promise<Object>} Transaction information
   */
  async createTransaction(params) {
    try {
      const response = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          userId: this.userId,
          walletId: params.walletId,
          destinationAddress: params.destinationAddress,
          amount: params.amount,
          tokenId: params.tokenId || 'USDC',
          blockchain: params.blockchain || 'ETH',
        }),
      })

      if (!response.ok) {
        throw new Error(`Circle Wallets API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating transaction:', error)
      throw error
    }
  }

  /**
   * Get transaction status
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Transaction status
   */
  async getTransactionStatus(transactionId) {
    try {
      const response = await fetch(`${this.apiUrl}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Circle Wallets API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching transaction status:', error)
      throw error
    }
  }
}

// Export singleton instance
let walletsClientInstance = null

export function getCircleWalletsClient(options) {
  if (!walletsClientInstance) {
    walletsClientInstance = new CircleWalletsClient(options)
  }
  return walletsClientInstance
}

export default CircleWalletsClient
