import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';
import { getBlockchainClient } from '../blockchain/blockchainClient';

/**
 * Yellow SDK Client Wrapper
 * Manages WebSocket connection to Yellow Network ClearNode
 * Handles state channel sessions for off-chain transactions
 */
export class YellowClient {
  constructor(options = {}) {
    this.ws = null;
    this.messageSigner = null;
    this.userAddress = null;
    this.sessionId = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.isTestWallet = false;
    this.testBalance = { usdc: 0 }; // Track test wallet balance
    this.blockchainClient = null; // Blockchain client for logging
    
    // Use sandbox for testing, production for live
    this.endpoint = options.endpoint || 'wss://clearnet-sandbox.yellow.com/ws';
    this.onMessage = options.onMessage || null;
    this.onError = options.onError || null;
    this.onConnect = options.onConnect || null;
    
    // Initialize blockchain client for logging (non-blocking)
    try {
      this.blockchainClient = getBlockchainClient();
      // Try to connect but don't block if it fails
      this.blockchainClient.connect().catch((err) => {
        // Silently fail if blockchain connection isn't available
        console.warn('Blockchain connection not available, continuing without it:', err.message);
      });
    } catch (error) {
      console.warn('Failed to initialize blockchain client:', error);
      // Continue without blockchain client - it's optional for logging
    }
  }

  /**
   * Get cached test wallet from localStorage
   */
  getCachedTestWallet() {
    try {
      const cached = localStorage.getItem('laxo_test_wallet')
      if (cached) {
        const walletData = JSON.parse(cached)
        return {
          address: walletData.address,
          balance: walletData.balance || { usdc: 0 }
        }
      }
    } catch (error) {
      console.warn('Failed to load cached wallet:', error)
    }
    return null
  }

  /**
   * Save test wallet to localStorage cache
   */
  saveTestWalletToCache() {
    try {
      const walletData = {
        address: this.userAddress,
        balance: this.testBalance,
        timestamp: Date.now()
      }
      localStorage.setItem('laxo_test_wallet', JSON.stringify(walletData))
    } catch (error) {
      console.warn('Failed to save wallet to cache:', error)
    }
  }

  /**
   * Clear test wallet from cache
   */
  clearTestWalletCache() {
    try {
      localStorage.removeItem('laxo_test_wallet')
      console.log('✅ Test wallet cache cleared')
    } catch (error) {
      console.warn('Failed to clear wallet cache:', error)
    }
  }

  /**
   * Create a test wallet for development/testing
   * Uses cached wallet if available, otherwise creates new one
   */
  async setupTestWallet() {
    // Try to load from cache first
    const cached = this.getCachedTestWallet()
    
    if (cached) {
      console.log('✅ Loaded cached test wallet:', cached.address)
      this.userAddress = cached.address
      this.testBalance = cached.balance || { usdc: 0 }
    } else {
      // Generate a new deterministic test address
      // In a real implementation, you might use a library like ethers.js to generate proper addresses
      const testAddress = `0x${Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;

      this.userAddress = testAddress
      this.testBalance = { usdc: 0 } // Initialize with zero balance
      
      // Save to cache
      this.saveTestWalletToCache()
      console.log('✅ New test wallet created:', this.userAddress)
    }

    this.isTestWallet = true

    // Create mock message signer function for test wallet
    this.messageSigner = async (message) => {
      // Return a mock signature (64 hex characters)
      return `0x${Array.from({ length: 128 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
    };

    return {
      userAddress: this.userAddress,
      messageSigner: this.messageSigner
    };
  }

  /**
   * Initialize wallet connection and message signer
   */
  async setupWallet() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask or compatible wallet required');
    }

    // Request wallet connection
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    this.userAddress = accounts[0];

    // Create message signer function
    this.messageSigner = async (message) => {
      return await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.userAddress]
      });
    };

    return {
      userAddress: this.userAddress,
      messageSigner: this.messageSigner
    };
  }

  /**
   * Connect to Yellow Network ClearNode
   */
  async connect() {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Log blockchain connection attempt
    if (this.blockchainClient) {
      this.blockchainClient.log('info', 'Connecting to Yellow Network', {
        endpoint: this.endpoint,
        userAddress: this.userAddress
      });
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.endpoint);

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('✅ Connected to Yellow Network');
          
          // Log blockchain event
          if (this.blockchainClient) {
            this.blockchainClient.log('info', 'Connected to Yellow Network', {
              endpoint: this.endpoint,
              userAddress: this.userAddress,
              sessionId: this.sessionId
            });
          }
          
          if (this.onConnect) this.onConnect();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = parseRPCResponse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.onError) this.onError(error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('Disconnected from Yellow Network');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages from Yellow Network
   */
  handleMessage(message) {
    console.log('📨 Received:', message);

    // Handle session creation
    if (message.type === 'session_created' || message.sessionId) {
      this.sessionId = message.sessionId || message.id;
      this.emit('sessionCreated', { sessionId: this.sessionId });
    }

    // Handle payment/transaction updates
    if (message.type === 'payment' || message.type === 'transaction') {
      this.emit('payment', message);
    }

    // Handle session messages
    if (message.type === 'session_message') {
      this.emit('sessionMessage', message);
    }

    // Handle errors
    if (message.type === 'error') {
      this.emit('error', message);
    }

    // Call custom message handler
    if (this.onMessage) {
      this.onMessage(message);
    }
  }

  /**
   * Create an application session for prediction markets
   * @param {string} partnerAddress - Address of the market/partner (can be contract address)
   * @param {Object} allocations - Initial token allocations
   */
  async createSession(partnerAddress, allocations = []) {
    if (!this.messageSigner) {
      await this.setupWallet();
    }

    if (!this.isConnected) {
      await this.connect();
    }

    const appDefinition = {
      protocol: 'prediction-market-v1',
      participants: [this.userAddress, partnerAddress],
      weights: [50, 50], // Equal participation
      quorum: 100, // Both participants must agree
      challenge: 0,
      nonce: Date.now()
    };

    // Default allocation if none provided
    const defaultAllocations = allocations.length > 0 ? allocations : [
      { participant: this.userAddress, asset: 'usdc', amount: '0' },
      { participant: partnerAddress, asset: 'usdc', amount: '0' }
    ];

    try {
      const sessionMessage = await createAppSessionMessage(
        this.messageSigner,
        [{ definition: appDefinition, allocations: defaultAllocations }]
      );

      this.ws.send(sessionMessage);
      console.log('✅ Session created');

      return { appDefinition, allocations: defaultAllocations };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Send an off-chain payment/transaction
   */
  async sendPayment(amount, recipient, metadata = {}) {
    if (!this.messageSigner) {
      throw new Error('Wallet not initialized');
    }

    if (!this.isConnected) {
      await this.connect();
    }

    const paymentData = {
      type: 'payment',
      amount: amount.toString(),
      recipient,
      timestamp: Date.now(),
      ...metadata
    };

    const signature = await this.messageSigner(JSON.stringify(paymentData));
    
    const signedPayment = {
      ...paymentData,
      signature,
      sender: this.userAddress
    };

    this.ws.send(JSON.stringify(signedPayment));
    console.log('💸 Payment sent instantly');

    return signedPayment;
  }

  /**
   * Send a custom message through the session
   */
  async sendMessage(messageType, data) {
    if (!this.isConnected) {
      await this.connect();
    }

    const message = {
      type: messageType,
      data,
      timestamp: Date.now(),
      sender: this.userAddress
    };

    if (this.messageSigner) {
      const signature = await this.messageSigner(JSON.stringify(message));
      message.signature = signature;
    }

    this.ws.send(JSON.stringify(message));
    return message;
  }

  /**
   * Event listener system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Disconnect from Yellow Network
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.sessionId = null;
  }

  /**
   * Add test funds to test wallet (for development/testing only)
   * @param {string} amount - Amount in smallest unit (e.g., '1000000' for 1 USDC with 6 decimals)
   * @param {string} asset - Asset type (default: 'usdc')
   */
  addTestFunds(amount, asset = 'usdc') {
    if (!this.isTestWallet) {
      throw new Error('Can only add test funds to test wallets');
    }

    const amountNum = BigInt(amount);
    const currentBalance = BigInt(this.testBalance[asset] || 0);
    this.testBalance[asset] = (currentBalance + amountNum).toString();

    // Save updated balance to cache
    this.saveTestWalletToCache();

    console.log(`💰 Added ${amount} ${asset} to test wallet. New balance:`, this.testBalance);
    
    // Log blockchain event
    if (this.blockchainClient) {
      this.blockchainClient.log('transaction', `Test funds added: ${amount} ${asset}`, {
        amount,
        asset,
        previousBalance: currentBalance.toString(),
        newBalance: this.testBalance[asset],
        userAddress: this.userAddress
      });
    }
    
    // Emit balance update event
    this.emit('balance_update', {
      asset,
      balance: this.testBalance[asset],
      total: this.testBalance
    });

    return this.testBalance;
  }

  /**
   * Get test wallet balance
   */
  getTestBalance() {
    if (!this.isTestWallet) {
      return null;
    }
    return { ...this.testBalance };
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      userAddress: this.userAddress,
      endpoint: this.endpoint,
      isTestWallet: this.isTestWallet,
      balance: this.isTestWallet ? this.getTestBalance() : null
    };
  }
}

// Export singleton instance helper
let yellowClientInstance = null;

export function getYellowClient(options) {
  if (!yellowClientInstance) {
    yellowClientInstance = new YellowClient(options);
  }
  return yellowClientInstance;
}

export default YellowClient;
