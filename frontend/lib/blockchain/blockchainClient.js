import { createPublicClient, http, formatEther, formatUnits } from 'viem'
import { sepolia } from 'viem/chains'

/**
 * Blockchain Client
 * Connects to Ethereum testnet and logs transactions/events
 */
export class BlockchainClient {
  constructor(options = {}) {
    this.chain = options.chain || sepolia
    this.rpcUrl = options.rpcUrl || `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY || 'demo'}`
    this.client = null
    this.logs = []
    this.listeners = new Map()
    this.isConnected = false
  }

  /**
   * Connect to blockchain
   */
  async connect() {
    try {
      this.client = createPublicClient({
        chain: this.chain,
        transport: http(this.rpcUrl)
      })

      // Test connection by getting latest block
      const blockNumber = await this.client.getBlockNumber()
      this.isConnected = true
      
      this.log('info', `Connected to ${this.chain.name}`, {
        blockNumber: blockNumber.toString(),
        chainId: this.chain.id
      })

      return {
        chainId: this.chain.id,
        blockNumber: blockNumber.toString(),
        chainName: this.chain.name
      }
    } catch (error) {
      this.log('error', 'Failed to connect to blockchain', { error: error.message })
      throw error
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber() {
    if (!this.client) {
      await this.connect()
    }
    return await this.client.getBlockNumber()
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    if (!this.client) {
      await this.connect()
    }
    try {
      const receipt = await this.client.getTransactionReceipt({ hash: txHash })
      this.log('info', 'Transaction receipt received', {
        txHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString()
      })
      return receipt
    } catch (error) {
      this.log('error', 'Failed to get transaction receipt', { txHash, error: error.message })
      throw error
    }
  }

  /**
   * Watch for new blocks
   */
  watchBlocks(onBlock) {
    if (!this.client) {
      throw new Error('Not connected to blockchain')
    }

    return this.client.watchBlocks({
      onBlock: (block) => {
        this.log('info', `New block: ${block.number}`, {
          blockNumber: block.number.toString(),
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          transactions: block.transactions.length
        })
        if (onBlock) onBlock(block)
      },
      onError: (error) => {
        this.log('error', 'Block watch error', { error: error.message })
      }
    })
  }

  /**
   * Watch for contract events
   */
  watchContractEvents(address, abi, eventName, onEvent) {
    if (!this.client) {
      throw new Error('Not connected to blockchain')
    }

    return this.client.watchContractEvent({
      address,
      abi,
      eventName,
      onLogs: (logs) => {
        logs.forEach((log) => {
          this.log('event', `Contract event: ${eventName}`, {
            address,
            eventName,
            blockNumber: log.blockNumber.toString(),
            txHash: log.transactionHash,
            args: log.args
          })
          if (onEvent) onEvent(log)
        })
      },
      onError: (error) => {
        this.log('error', 'Event watch error', { error: error.message })
      }
    })
  }

  /**
   * Log a blockchain event
   */
  log(level, message, data = {}) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level, // 'info', 'error', 'event', 'transaction'
      message,
      data
    }

    this.logs.unshift(logEntry) // Add to beginning
    if (this.logs.length > 100) {
      this.logs.pop() // Keep only last 100 logs
    }

    // Emit log event
    this.emit('log', logEntry)

    // Console log for debugging
    const prefix = `[Blockchain ${level.toUpperCase()}]`
    console.log(prefix, message, data)
  }

  /**
   * Get logs
   */
  getLogs(limit = 50) {
    return this.logs.slice(0, limit)
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = []
    this.emit('logs_cleared', {})
  }

  /**
   * Event listener system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in event listener:', error)
        }
      })
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      chainId: this.chain.id,
      chainName: this.chain.name,
      rpcUrl: this.rpcUrl,
      logCount: this.logs.length
    }
  }
}

// Singleton instance
let blockchainClientInstance = null

export function getBlockchainClient(options) {
  if (!blockchainClientInstance) {
    blockchainClientInstance = new BlockchainClient(options)
  }
  return blockchainClientInstance
}

export default BlockchainClient
