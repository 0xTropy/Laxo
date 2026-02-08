/**
 * Pie Wallet & ENS Utilities
 * Generates deterministic wallet addresses for pies and ENS names
 */

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
 * Resolve ENS name to address (simulated for testnet)
 * In production, this would query the ENS registry
 * @param {string} ensName - ENS name (e.g., "pie-abc123.user.eth")
 * @returns {Promise<string|null>} Resolved address or null if not found
 */
export async function resolveENS(ensName) {
  // For testnet, we'll simulate resolution by checking localStorage
  // In production, you'd use ethers.js or web3.js to query ENS registry
  try {
    const cached = localStorage.getItem(`ens_resolution_${ensName}`)
    if (cached) {
      return cached
    }
    
    // Simulate ENS resolution delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Return null if not found (simulated)
    return null
  } catch (error) {
    console.error('ENS resolution error:', error)
    return null
  }
}

/**
 * Register ENS name for a pie (simulated for testnet)
 * In production, this would create a transaction to register the subdomain
 * @param {string} ensName - ENS name to register
 * @param {string} address - Address to point the ENS name to
 * @param {string} userAddress - User's main wallet address (for authorization)
 * @returns {Promise<{success: boolean, txHash?: string, message: string}>}
 */
export async function registerENSName(ensName, address, userAddress) {
  // For testnet, we'll simulate registration by storing in localStorage
  // In production, you'd:
  // 1. Check if user owns the parent domain (e.g., user.eth)
  // 2. Create a transaction to register the subdomain
  // 3. Wait for confirmation
  
  try {
    // Simulate registration delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Store in localStorage for testnet simulation
    localStorage.setItem(`ens_resolution_${ensName}`, address)
    localStorage.setItem(`ens_owner_${ensName}`, userAddress)
    localStorage.setItem(`ens_registered_${ensName}`, Date.now().toString())
    
    // Generate mock transaction hash
    const mockTxHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`
    
    console.log(`✅ ENS name registered (simulated): ${ensName} → ${address}`)
    
    return {
      success: true,
      txHash: mockTxHash,
      message: `ENS name ${ensName} registered successfully`
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
 * @param {string} userAddress - User's main wallet address
 * @returns {Promise<Array<{name: string, address: string, registeredAt: number}>>}
 */
export async function getUserENSNames(userAddress) {
  try {
    const ensNames = []
    const userShort = userAddress.slice(2, 6).toLowerCase()
    
    // Check localStorage for registered ENS names
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('ens_registered_pie-') && key.includes(userShort)) {
        const ensName = key.replace('ens_registered_', '')
        const address = localStorage.getItem(`ens_resolution_${ensName}`)
        const registeredAt = parseInt(localStorage.getItem(key) || '0')
        
        if (address) {
          ensNames.push({
            name: ensName,
            address,
            registeredAt
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
