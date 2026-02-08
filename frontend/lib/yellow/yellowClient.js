import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';

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
    
    // Use sandbox for testing, production for live
    this.endpoint = options.endpoint || 'wss://clearnet-sandbox.yellow.com/ws';
    this.onMessage = options.onMessage || null;
    this.onError = options.onError || null;
    this.onConnect = options.onConnect || null;
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

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.endpoint);

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('✅ Connected to Yellow Network');
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
   * Get current connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      userAddress: this.userAddress,
      endpoint: this.endpoint
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
