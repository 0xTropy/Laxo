/**
 * Wallet persistence utilities
 * Stores positions and ARC positions (pies) in localStorage
 */

const POSITIONS_KEY = 'laxo_positions'
const PIES_KEY = 'laxo_pies'

/**
 * Save positions to localStorage
 */
export function savePositions(positions) {
  try {
    // Convert Map to array for storage
    const positionsArray = Array.from(positions.entries()).map(([key, value]) => ({
      key,
      ...value
    }))
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positionsArray))
  } catch (error) {
    console.warn('Failed to save positions:', error)
  }
}

/**
 * Load positions from localStorage
 */
export function loadPositions() {
  try {
    const stored = localStorage.getItem(POSITIONS_KEY)
    if (!stored) return new Map()
    
    const positionsArray = JSON.parse(stored)
    const positions = new Map()
    
    positionsArray.forEach(({ key, ...position }) => {
      positions.set(key, position)
    })
    
    return positions
  } catch (error) {
    console.warn('Failed to load positions:', error)
    return new Map()
  }
}

/**
 * Add or update a single position
 */
export function savePosition(positionKey, position) {
  const positions = loadPositions()
  positions.set(positionKey, position)
  savePositions(positions)
}

/**
 * Remove a position
 */
export function removePosition(positionKey) {
  const positions = loadPositions()
  positions.delete(positionKey)
  savePositions(positions)
}

/**
 * Save pies to localStorage
 */
export function savePies(pies) {
  try {
    // Convert Map to array for storage
    const piesArray = Array.from(pies.entries()).map(([key, value]) => ({
      key,
      ...value
    }))
    localStorage.setItem(PIES_KEY, JSON.stringify(piesArray))
  } catch (error) {
    console.warn('Failed to save pies:', error)
  }
}

/**
 * Load pies from localStorage
 * Handles both array format (new) and object format (legacy)
 */
export function loadPies() {
  try {
    const stored = localStorage.getItem(PIES_KEY)
    if (!stored) return new Map()
    
    const parsed = JSON.parse(stored)
    const pies = new Map()
    
    // Handle array format (new format)
    if (Array.isArray(parsed)) {
      parsed.forEach(({ key, ...pie }) => {
        pies.set(key, pie)
      })
    } 
    // Handle object format (legacy format from forex-portfolios)
    else if (typeof parsed === 'object' && parsed !== null) {
      Object.entries(parsed).forEach(([key, pie]) => {
        pies.set(key, pie)
      })
    }
    
    return pies
  } catch (error) {
    console.warn('Failed to load pies:', error)
    return new Map()
  }
}

/**
 * Add or update a single pie
 */
export function savePie(pieId, pie) {
  const pies = loadPies()
  pies.set(pieId, pie)
  savePies(pies)
}

/**
 * Remove a pie
 */
export function removePie(pieId) {
  const pies = loadPies()
  pies.delete(pieId)
  savePies(pies)
}

/**
 * Get all unique market addresses from positions
 */
export function getMarketAddresses() {
  const positions = loadPositions()
  const addresses = new Set()
  
  positions.forEach(position => {
    if (position.market) {
      addresses.add(position.market)
    }
    if (position.marketAddress) {
      addresses.add(position.marketAddress)
    }
  })
  
  return Array.from(addresses)
}
