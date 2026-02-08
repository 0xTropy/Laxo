/**
 * Faucet Utility for Sepolia Testnet
 * Requests USDC from testnet faucets
 */

const CIRCLE_FAUCET_URL = 'https://faucet.circle.com/'
const ETHGLOBAL_FAUCET_URL = 'https://ethglobal.com/faucet/sepolia-11155111-usdc'

/**
 * Request USDC from Circle Faucet (10 USDC daily)
 * @param {string} address - Wallet address to receive USDC
 * @returns {Promise<{success: boolean, message: string, amount?: string}>}
 */
export async function requestUSDCFromCircle(address) {
  try {
    // Circle faucet requires manual interaction, so we'll simulate it
    // In a real implementation, you'd make an API call if Circle provides one
    // For now, we'll return a message directing users to the faucet
    
    return {
      success: true,
      message: `Visit Circle Faucet to claim 10 USDC: ${CIRCLE_FAUCET_URL}`,
      amount: '10000000', // 10 USDC with 6 decimals
      faucetUrl: CIRCLE_FAUCET_URL,
      manual: true
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to request from Circle faucet: ${error.message}`
    }
  }
}

/**
 * Request USDC from ETHGlobal Faucet (1 USDC daily)
 * @param {string} address - Wallet address to receive USDC
 * @returns {Promise<{success: boolean, message: string, amount?: string}>}
 */
export async function requestUSDCFromETHGlobal(address) {
  try {
    // ETHGlobal faucet requires login, so we'll direct users there
    return {
      success: true,
      message: `Visit ETHGlobal Faucet to claim 1 USDC: ${ETHGLOBAL_FAUCET_URL}`,
      amount: '1000000', // 1 USDC with 6 decimals
      faucetUrl: ETHGLOBAL_FAUCET_URL,
      manual: true
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to request from ETHGlobal faucet: ${error.message}`
    }
  }
}

/**
 * Request USDC from any available faucet
 * Tries Circle first (higher amount), then ETHGlobal
 * @param {string} address - Wallet address to receive USDC
 * @returns {Promise<{success: boolean, message: string, amount?: string, faucetUrl?: string}>}
 */
export async function requestUSDC(address) {
  if (!address || !address.startsWith('0x')) {
    return {
      success: false,
      message: 'Invalid wallet address'
    }
  }

  // Try Circle faucet first (10 USDC)
  const circleResult = await requestUSDCFromCircle(address)
  if (circleResult.success) {
    return circleResult
  }

  // Fallback to ETHGlobal (1 USDC)
  return await requestUSDCFromETHGlobal(address)
}

/**
 * Format address for display
 */
export function formatAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Copy address to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}
