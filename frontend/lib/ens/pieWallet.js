/**
 * Pie Wallet & ENS Utilities
 * Generates deterministic wallet addresses for pies and ENS names
 * Uses real ENS registry via viem for resolution
 */

import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize as normalizeENS } from 'viem/ens'

// Create public client for ENS resolution (mainnet only - ENS doesn't exist on Sepolia)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

/**
 * Generate a deterministic address for a pie wallet
 * Uses user address + pie ID to create a unique, reproducible address
 * @param {string} userAddress - User's main wallet address
 * @param {string} pieId - Unique pie identifier
 * @returns {string} Deterministic pie wallet address
 */
export function generatePieWalletAddress(userAddress, pieId) {
  // Simple hash-based approach for deterministic address generation
  // In production, you'd use proper EIP-1014 CREATE2 or similar
  const input = `${userAddress}-${pieId}`
  
  // Use Web Crypto API for hashing (available in browsers)
  // This creates a deterministic hash
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Convert to hex and pad to 40 characters (20 bytes = Ethereum address length)
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0')
  const address = `0x${hashHex}${hashHex}${hashHex}${hashHex}${hashHex}`.slice(0, 42)
  
  return address
}

/**
 * Generate an ENS name for a pie
 * Format: pie-{shortId}.{userShortAddress}.eth
 * @param {string} userAddress - User's main wallet address
 * @param {string} pieId - Unique pie identifier
 * @param {string} pieName - Optional pie name for more readable ENS
 * @returns {string} ENS name (e.g., "pie-abc123.user.eth")
 */
export function generatePieENSName(userAddress, pieId, pieName = null) {
  // Extract short identifier from pieId (last 6 chars)
  const shortId = pieId.slice(-6)
  
  // Extract short address from user address (last 4 chars before checksum)
  const userShort = userAddress.slice(2, 6).toLowerCase()
  
  // If pie name provided, create a slug from it
  if (pieName) {
    const slug = pieName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) // Limit length
    
    if (slug.length > 0) {
      return `pie-${slug}-${shortId}.${userShort}.eth`
    }
  }
  
  return `pie-${shortId}.${userShort}.eth`
}

/**
 * Resolve ENS name to address using real ENS registry
 * @param {string} ensName - ENS name (e.g., "pie-abc123.user.eth" or "vitalik.eth")
 * @returns {Promise<string|null>} Resolved address or null if not found
 */
export async function resolveENS(ensName) {
  try {
    // Normalize ENS name (handles emoji, unicode, etc.)
    const normalizedName = normalizeENS(ensName)
    
    // Resolve ENS name to address using viem
    const address = await publicClient.getEnsAddress({
      name: normalizedName,
    })
    
    if (address) {
      // Cache the resolution for faster subsequent lookups
      localStorage.setItem(`ens_resolution_${ensName}`, address)
      console.log(`✅ ENS resolved: ${ensName} → ${address}`)
      return address
    }
    
    return null
  } catch (error) {
    console.error('ENS resolution error:', error)
    // Fallback to cached value if available
    const cached = localStorage.getItem(`ens_resolution_${ensName}`)
    if (cached) {
      return cached
    }
    return null
  }
}

/**
 * Register ENS name for a pie
 * Note: This function tracks the ENS name locally for display purposes.
 * Actual ENS subdomain registration requires:
 * 1. User to own the parent domain (e.g., user.eth)
 * 2. Using ENS resolver contract to set subdomain
 * 3. Paying gas fees on mainnet
 * 
 * For this hackathon, we track the generated ENS names locally and resolve them
 * if they exist on-chain. Users can manually register subdomains if they own the parent domain.
 * 
 * @param {string} ensName - ENS name to register (e.g., "pie-abc123.user.eth")
 * @param {string} address - Address to point the ENS name to
 * @param {string} userAddress - User's main wallet address (for authorization)
 * @returns {Promise<{success: boolean, txHash?: string, message: string}>}
 */
export async function registerENSName(ensName, address, userAddress) {
  try {
    // Validate ENS name format
    if (!isValidENSName(ensName)) {
      return {
        success: false,
        message: `Invalid ENS name format: ${ensName}`
      }
    }
    
    // Check if ENS name already resolves on-chain
    const existingAddress = await resolveENS(ensName)
    if (existingAddress && existingAddress.toLowerCase() !== address.toLowerCase()) {
      return {
        success: false,
        message: `ENS name ${ensName} already resolves to ${existingAddress}`
      }
    }
    
    // Store locally for tracking (even if not registered on-chain)
    // This allows the UI to display the ENS name
    localStorage.setItem(`ens_resolution_${ensName}`, address)
    localStorage.setItem(`ens_owner_${ensName}`, userAddress)
    localStorage.setItem(`ens_registered_${ensName}`, Date.now().toString())
    
    // Note: Actual on-chain registration would require:
    // 1. Getting wallet client from wagmi
    // 2. Calling ENS resolver contract's setSubnodeRecord function
    // 3. Paying gas fees
    // For hackathon purposes, we track locally and note that users can register manually
    
    console.log(`✅ ENS name tracked locally: ${ensName} → ${address}`)
    console.log(`ℹ️  To register on-chain, user needs to own parent domain and use ENS resolver`)
    
    return {
      success: true,
      txHash: null, // No on-chain transaction yet
      message: `ENS name ${ensName} tracked locally. To register on-chain, ensure you own the parent domain.`,
      localOnly: true
    }
  } catch (error) {
    console.error('ENS registration error:', error)
    return {
      success: false,
      message: error.message || 'Failed to register ENS name'
    }
  }
}

/**
 * Get all ENS names owned by a user
 * Checks both local storage (for tracked names) and on-chain resolution
 * @param {string} userAddress - User's main wallet address
 * @returns {Promise<Array<{name: string, address: string, registeredAt: number, onChain: boolean}>>}
 */
export async function getUserENSNames(userAddress) {
  try {
    const ensNames = []
    const userShort = userAddress.slice(2, 6).toLowerCase()
    
    // Check localStorage for tracked ENS names
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('ens_registered_pie-') && key.includes(userShort)) {
        const ensName = key.replace('ens_registered_', '')
        const localAddress = localStorage.getItem(`ens_resolution_${ensName}`)
        const registeredAt = parseInt(localStorage.getItem(key) || '0')
        
        if (localAddress) {
          // Verify if it resolves on-chain
          let onChainAddress = null
          try {
            onChainAddress = await resolveENS(ensName)
          } catch (err) {
            // Ignore resolution errors
          }
          
          ensNames.push({
            name: ensName,
            address: onChainAddress || localAddress,
            registeredAt,
            onChain: !!onChainAddress,
            localOnly: !onChainAddress
          })
        }
      }
    }
    
    return ensNames.sort((a, b) => b.registeredAt - a.registeredAt)
  } catch (error) {
    console.error('Error fetching user ENS names:', error)
    return []
  }
}

/**
 * Format ENS name for display
 * @param {string} ensName - Full ENS name
 * @returns {string} Formatted name
 */
export function formatENSName(ensName) {
  if (!ensName) return ''
  // Truncate if too long
  if (ensName.length > 30) {
    return ensName.slice(0, 27) + '...'
  }
  return ensName
}

/**
 * Validate ENS name format
 * @param {string} ensName - ENS name to validate
 * @returns {boolean} True if valid format
 */
export function isValidENSName(ensName) {
  if (!ensName || !ensName.endsWith('.eth')) return false
  const namePart = ensName.slice(0, -4)
  // Basic validation: alphanumeric, hyphens, dots
  return /^[a-z0-9.-]+$/.test(namePart) && namePart.length > 0 && namePart.length <= 253
}
