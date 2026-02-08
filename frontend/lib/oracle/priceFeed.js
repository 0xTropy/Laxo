/**
 * Price Feed Service
 * Fetches live forex prices from real APIs
 * Uses Frankfurter API (free, no API key required) and ExchangeRate-API
 */

// Price history for charts (last 200 data points)
const priceHistory = new Map()

// Cache for API responses (to avoid rate limits)
const priceCache = new Map()
const CACHE_DURATION = 60000 // 1 minute cache

/**
 * Fetch real forex price from API
 * @param {string} pair - Currency pair (e.g., 'EUR/USD')
 * @returns {Promise<{price: number, timestamp: number}>}
 */
async function fetchRealPrice(pair) {
  try {
    // Check cache first
    const cached = priceCache.get(pair)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached
    }

    // Convert pair format for API (EUR/USD -> EUR to USD)
    const [base, quote] = pair.split('/')
    
    // Use Frankfurter API (free, no API key, ECB reference rates)
    // Format: https://api.frankfurter.app/latest?from=EUR&to=USD
    const response = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    const price = data.rates[quote]
    
    if (!price) {
      throw new Error(`Price not found for ${pair}`)
    }
    
    const result = {
      price,
      timestamp: Date.now()
    }
    
    // Cache the result
    priceCache.set(pair, result)
    
    return result
  } catch (error) {
    console.error(`Error fetching price for ${pair}:`, error)
    
    // Fallback: Try ExchangeRate-API (free tier, 1500 requests/month)
    try {
      const [base, quote] = pair.split('/')
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`)
      if (response.ok) {
        const data = await response.json()
        const price = data.rates[quote]
        if (price) {
          const result = { price, timestamp: Date.now() }
          priceCache.set(pair, result)
          return result
        }
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError)
    }
    
    // Last resort: return cached price or throw
    const cached = priceCache.get(pair)
    if (cached) {
      return cached
    }
    
    throw error
  }
}

/**
 * Get current price for a currency pair
 * @param {string} pair - Currency pair (e.g., 'EUR/USD')
 * @returns {Promise<{price: number, timestamp: number}>}
 */
export async function getCurrentPrice(pair) {
  try {
    const { price, timestamp } = await fetchRealPrice(pair)
    
    // Store in history for charts
    if (!priceHistory.has(pair)) {
      priceHistory.set(pair, [])
    }
    const history = priceHistory.get(pair)
    history.push({
      price,
      timestamp
    })
    // Keep only last 200 points
    if (history.length > 200) {
      history.shift()
    }
    
    return { price, timestamp }
  } catch (error) {
    console.error('Error getting current price:', error)
    // Return last known price if available
    const history = priceHistory.get(pair)
    if (history && history.length > 0) {
      return history[history.length - 1]
    }
    throw error
  }
}

/**
 * Fetch historical price data to populate chart
 * @param {string} pair - Currency pair
 * @param {number} days - Number of days of history (default: 1)
 * @returns {Promise<Array<{price: number, timestamp: number}>>}
 */
export async function fetchHistoricalPrices(pair, days = 1, forceRefresh = false) {
  try {
    const [base, quote] = pair.split('/')
    
    // Clear existing history if forcing refresh (for rehydration)
    if (forceRefresh && priceHistory.has(pair)) {
      priceHistory.set(pair, [])
    }
    
    // Use Frankfurter API for historical data
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const response = await fetch(
      `https://api.frankfurter.app/${startDate}..${endDate}?from=${base}&to=${quote}`
    )
    
    if (!response.ok) {
      throw new Error(`Historical API error: ${response.status}`)
    }
    
    const data = await response.json()
    const rates = data.rates || {}
    
    // Convert to our format
    const history = Object.entries(rates).map(([date, rate]) => ({
      price: rate[quote],
      timestamp: new Date(date).getTime()
    }))
    
    // Store in history (replace if forceRefresh, otherwise merge)
    if (forceRefresh || !priceHistory.has(pair)) {
      priceHistory.set(pair, history.slice(-200))
    } else {
      const existingHistory = priceHistory.get(pair)
      // Merge and sort by timestamp
      const merged = [...existingHistory, ...history].sort((a, b) => a.timestamp - b.timestamp)
      // Remove duplicates and keep last 200
      const unique = merged.filter((item, index, self) =>
        index === self.findIndex(t => t.timestamp === item.timestamp)
      )
      priceHistory.set(pair, unique.slice(-200))
    }
    
    return priceHistory.get(pair) || []
  } catch (error) {
    console.error('Error fetching historical prices:', error)
    return priceHistory.get(pair) || []
  }
}

/**
 * Get price history for charting
 * @param {string} pair - Currency pair
 * @param {number} limit - Number of data points (default: 50)
 * @returns {Array<{price: number, timestamp: number}>}
 */
export function getPriceHistory(pair, limit = 50) {
  const history = priceHistory.get(pair) || []
  return history.slice(-limit)
}

/**
 * Subscribe to price updates
 * @param {string} pair - Currency pair
 * @param {Function} callback - Callback function (price, timestamp) => void
 * @returns {Function} Unsubscribe function
 */
export function subscribeToPrice(pair, callback) {
  let isSubscribed = true
  
  // Initial fetch
  getCurrentPrice(pair)
    .then(({ price, timestamp }) => {
      if (isSubscribed) callback(price, timestamp)
    })
    .catch(err => console.error('Error in initial price fetch:', err))
  
  // Update every 30 seconds (to avoid rate limits, but still feel real-time)
  const interval = setInterval(async () => {
    if (!isSubscribed) return
    
    try {
      const { price, timestamp } = await getCurrentPrice(pair)
      if (isSubscribed) callback(price, timestamp)
    } catch (error) {
      console.error('Error in price subscription:', error)
    }
  }, 30000) // Update every 30 seconds
  
  return () => {
    isSubscribed = false
    clearInterval(interval)
  }
}

/**
 * Convert currency pair format
 * @param {string} pair - Pair in format "USDC/EURC"
 * @returns {string} Pair in format "EUR/USD" for oracle
 */
export function convertPairFormat(pair) {
  // Convert "USDC/EURC" to "EUR/USD"
  const map = {
    'USDC/EURC': 'EUR/USD',
    'USDC/JPYC': 'JPY/USD',
    'USDC/BRLA': 'BRL/USD',
    'USDC/MXNB': 'MXN/USD',
    'USDC/QCAD': 'CAD/USD',
    'USDC/AUDF': 'AUD/USD',
    'USDC/KRW1': 'KRW/USD',
    'USDC/PHPC': 'PHP/USD',
    'USDC/ZARU': 'ZAR/USD',
  }
  return map[pair] || pair
}

/**
 * Format price for display
 * @param {number} price - Price value
 * @param {number} decimals - Number of decimals (default: 2)
 * @returns {string} Formatted price
 */
export function formatPrice(price, decimals = 2) {
  return price.toFixed(decimals)
}
