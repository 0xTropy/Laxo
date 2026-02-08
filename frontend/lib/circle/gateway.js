/**
 * Circle Gateway Integration
 * Enables unified USDC balances across multiple blockchains
 * Documentation: https://developers.circle.com/gateway
 */

/**
 * Circle Gateway API Client
 * Handles cross-chain USDC transfers via Circle Gateway
 */
export class CircleGatewayClient {
  constructor(options = {}) {
    // Circle Gateway API endpoint
    this.apiUrl = options.apiUrl || 'https://api.circle.com/v1/gateway'
    this.apiKey = options.apiKey || process.env.NEXT_PUBLIC_CIRCLE_API_KEY
    
    // Supported domains (blockchains)
    this.supportedDomains = {
      ethereum: 0,
      avalanche: 1,
      polygon: 2,
      base: 3,
      arbitrum: 4,
      optimism: 5,
      arc: 6, // Arc network
    }
  }

  /**
   * Get Gateway info (supported domains and tokens)
   * @returns {Promise<Object>} Gateway information
   */
  async getGatewayInfo() {
    try {
      const response = await fetch(`${this.apiUrl}/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Gateway API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching Gateway info:', error)
      throw error
    }
  }

  /**
   * Get token balances for specified addresses across domains
   * @param {string[]} addresses - Array of addresses to check
   * @returns {Promise<Object>} Balance information
   */
  async getTokenBalances(addresses) {
    try {
      const response = await fetch(`${this.apiUrl}/balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          addresses: addresses,
        }),
      })

      if (!response.ok) {
        throw new Error(`Gateway API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching token balances:', error)
      throw error
    }
  }

  /**
   * Estimate fees and expiration for a transfer
   * @param {Object} transferParams - Transfer parameters
   * @param {string} transferParams.sourceDomain - Source blockchain domain
   * @param {string} transferParams.destinationDomain - Destination blockchain domain
   * @param {string} transferParams.amount - Amount to transfer
   * @returns {Promise<Object>} Fee estimate and expiration
   */
  async estimateTransferFees(transferParams) {
    try {
      const response = await fetch(`${this.apiUrl}/transfers/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(transferParams),
      })

      if (!response.ok) {
        throw new Error(`Gateway API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error estimating transfer fees:', error)
      throw error
    }
  }

  /**
   * Create a transfer attestation for cross-chain USDC transfer
   * @param {Object} transferParams - Transfer parameters
   * @param {string} transferParams.sourceDomain - Source blockchain domain
   * @param {string} transferParams.destinationDomain - Destination blockchain domain
   * @param {string} transferParams.amount - Amount in smallest unit (6 decimals for USDC)
   * @param {string} transferParams.recipient - Recipient address on destination chain
   * @param {string} transferParams.sender - Sender address on source chain
   * @returns {Promise<Object>} Transfer attestation
   */
  async createTransferAttestation(transferParams) {
    try {
      const response = await fetch(`${this.apiUrl}/transfers/attestation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          sourceDomain: transferParams.sourceDomain,
          destinationDomain: transferParams.destinationDomain,
          amount: transferParams.amount,
          recipient: transferParams.recipient,
          sender: transferParams.sender,
        }),
      })

      if (!response.ok) {
        throw new Error(`Gateway API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating transfer attestation:', error)
      throw error
    }
  }

  /**
   * Get pending deposits for an address
   * @param {string} address - Address to check
   * @returns {Promise<Object>} Pending deposits
   */
  async getPendingDeposits(address) {
    try {
      const response = await fetch(`${this.apiUrl}/deposits/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          address: address,
        }),
      })

      if (!response.ok) {
        throw new Error(`Gateway API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching pending deposits:', error)
      throw error
    }
  }

  /**
   * Transfer USDC from one chain to another via Gateway
   * This is a simplified wrapper that combines deposit + transfer
   * @param {Object} params - Transfer parameters
   * @returns {Promise<Object>} Transfer result
   */
  async transferUSDC(params) {
    const { sourceDomain, destinationDomain, amount, recipient, sender } = params

    // Step 1: Estimate fees
    const feeEstimate = await this.estimateTransferFees({
      sourceDomain,
      destinationDomain,
      amount,
    })

    // Step 2: Create transfer attestation
    const attestation = await this.createTransferAttestation({
      sourceDomain,
      destinationDomain,
      amount,
      recipient,
      sender,
    })

    return {
      attestation,
      feeEstimate,
      transferId: attestation.transferId || attestation.id,
    }
  }
}

// Export singleton instance
let gatewayClientInstance = null

export function getCircleGatewayClient(options) {
  if (!gatewayClientInstance) {
    gatewayClientInstance = new CircleGatewayClient(options)
  }
  return gatewayClientInstance
}

export default CircleGatewayClient
