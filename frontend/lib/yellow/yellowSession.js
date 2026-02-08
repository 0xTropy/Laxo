import { getYellowClient } from './yellowClient';

/**
 * Yellow Session Manager
 * Handles session-based spending for prediction market positions
 * Manages off-chain position updates and on-chain settlement
 */
export class YellowSession {
  constructor(marketAddress, options = {}) {
    this.marketAddress = marketAddress;
    this.client = options.client || getYellowClient(options.clientOptions);
    this.sessionId = null;
    this.positions = new Map(); // Track off-chain positions
    this.balance = null;
    this.isActive = false;
  }

  /**
   * Initialize session for a prediction market
   */
  async initialize() {
    try {
      // Setup wallet if needed
      if (!this.client.userAddress) {
        await this.client.setupWallet();
      }

      // Connect to Yellow Network
      if (!this.client.isConnected) {
        await this.client.connect();
      }

      // Create session for this market
      const session = await this.client.createSession(this.marketAddress);
      this.sessionId = session.appDefinition.nonce.toString();
      this.isActive = true;

      // Listen for balance updates
      this.client.on('payment', (message) => {
        this.handlePaymentUpdate(message);
      });

      // Listen for session messages
      this.client.on('sessionMessage', (message) => {
        this.handleSessionMessage(message);
      });

      return {
        sessionId: this.sessionId,
        marketAddress: this.marketAddress
      };
    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    }
  }

  /**
   * Take a position off-chain (instant, no gas)
   * @param {string} positionType - 'long' or 'short'
   * @param {string} amount - Amount in token units (e.g., "1000000" for 1 USDC with 6 decimals)
   */
  async takePosition(positionType, amount) {
    if (!this.isActive) {
      await this.initialize();
    }

    // Check balance before taking position
    const status = this.client.getStatus();
    if (status.isTestWallet) {
      const balance = this.client.getTestBalance();
      const amountNum = BigInt(amount);
      const currentBalance = BigInt(balance?.usdc || 0);
      
      if (currentBalance < amountNum) {
        throw new Error(`Insufficient balance. Required: ${amount}, Available: ${currentBalance.toString()}`);
      }
      
      // Deduct balance for test wallet
      const newBalance = currentBalance - amountNum;
      this.client.testBalance.usdc = newBalance.toString();
      
      // Emit balance update
      this.client.emit('balance_update', {
        asset: 'usdc',
        balance: newBalance.toString(),
        total: { ...this.client.testBalance }
      });
    }

    const positionData = {
      type: 'position',
      positionType, // 'long' or 'short'
      amount,
      market: this.marketAddress,
      timestamp: Date.now()
    };

    try {
      // Send position update through Yellow SDK (off-chain)
      const message = await this.client.sendMessage('position_update', positionData);

      // Track position locally
      const positionKey = `${positionType}-${Date.now()}`;
      this.positions.set(positionKey, {
        ...positionData,
        messageId: message.signature || message.timestamp,
        status: 'pending'
      });

      console.log(`✅ Position taken off-chain: ${positionType} ${amount}`);

      // Log blockchain event
      if (this.client.blockchainClient) {
        this.client.blockchainClient.log('event', `Position taken: ${positionType}`, {
          positionType,
          amount,
          market: this.marketAddress,
          positionKey,
          userAddress: this.client.userAddress,
          sessionId: this.sessionId
        });
      }

      return {
        positionKey,
        ...positionData,
        offChain: true
      };
    } catch (error) {
      console.error('Error taking position:', error);
      throw error;
    }
  }

  /**
   * Update position off-chain (modify existing position)
   */
  async updatePosition(positionKey, newAmount) {
    const position = this.positions.get(positionKey);
    if (!position) {
      throw new Error('Position not found');
    }

    const updateData = {
      type: 'position_update',
      positionKey,
      newAmount,
      previousAmount: position.amount,
      timestamp: Date.now()
    };

    await this.client.sendMessage('position_update', updateData);

    // Update local position
    position.amount = newAmount;
    position.updatedAt = Date.now();

    return position;
  }

  /**
   * Finalize settlement on-chain
   * This should be called after market resolution to move funds on-chain
   */
  async finalizeSettlement(positionKey, payout) {
    const position = this.positions.get(positionKey);
    if (!position) {
      throw new Error('Position not found');
    }

    // Record settlement in YellowIntegration contract
    // This would typically be done through a backend or directly from frontend
    const settlementData = {
      sessionId: this.sessionId,
      positionKey,
      payout,
      market: this.marketAddress,
      timestamp: Date.now()
    };

    // Send settlement message
    await this.client.sendMessage('settlement', settlementData);

    // Update position status
    position.status = 'settled';
    position.payout = payout;
    position.settledAt = Date.now();

    return settlementData;
  }

  /**
   * Deposit funds into state channel
   */
  async deposit(amount, asset = 'usdc') {
    if (!this.isActive) {
      await this.initialize();
    }

    const depositData = {
      type: 'deposit',
      amount: amount.toString(),
      asset,
      timestamp: Date.now()
    };

    await this.client.sendPayment(amount, this.marketAddress, depositData);

    // Update balance
    if (!this.balance) {
      this.balance = { [asset]: 0 };
    }
    this.balance[asset] = (this.balance[asset] || 0) + parseFloat(amount);

    return depositData;
  }

  /**
   * Withdraw funds from state channel
   */
  async withdraw(amount, asset = 'usdc') {
    if (!this.isActive) {
      throw new Error('Session not initialized');
    }

    const withdrawData = {
      type: 'withdraw',
      amount: amount.toString(),
      asset,
      timestamp: Date.now()
    };

    await this.client.sendMessage('withdraw', withdrawData);

    // Update balance
    if (this.balance && this.balance[asset]) {
      this.balance[asset] = Math.max(0, this.balance[asset] - parseFloat(amount));
    }

    return withdrawData;
  }

  /**
   * Handle payment updates from Yellow Network
   */
  handlePaymentUpdate(message) {
    if (message.asset && message.amount) {
      if (!this.balance) {
        this.balance = {};
      }
      this.balance[message.asset] = parseFloat(message.amount) || 0;
    }
  }

  /**
   * Handle session messages
   */
  handleSessionMessage(message) {
    if (message.data?.type === 'position_confirmed') {
      // Update position status
      const positionKey = message.data.positionKey;
      const position = this.positions.get(positionKey);
      if (position) {
        position.status = 'confirmed';
      }
    } else if (message.data?.type === 'balance_update') {
      this.balance = message.data.balance;
    }
  }

  /**
   * Get current balance
   */
  getBalance(asset = 'usdc') {
    return this.balance?.[asset] || 0;
  }

  /**
   * Get all positions
   */
  getPositions() {
    return Array.from(this.positions.values());
  }

  /**
   * Get position by key
   */
  getPosition(positionKey) {
    return this.positions.get(positionKey);
  }

  /**
   * Close session
   */
  async close() {
    if (this.sessionId) {
      await this.client.sendMessage('close_session', {
        sessionId: this.sessionId
      });
    }
    this.isActive = false;
    this.positions.clear();
  }
}

/**
 * Create a session for a specific market
 */
export function createMarketSession(marketAddress, options) {
  return new YellowSession(marketAddress, options);
}

export default YellowSession;
