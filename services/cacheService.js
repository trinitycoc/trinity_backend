import NodeCache from 'node-cache'

// Initialize cache with default settings
const cache = new NodeCache({
  stdTTL: 600,           // Default TTL: 10 minutes
  checkperiod: 120,      // Check for expired keys every 2 minutes
  useClones: false       // Better performance (don't clone objects)
})

/**
 * Cache service for storing API responses
 */
export const cacheService = {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get: (key) => {
    const value = cache.get(key)
    if (value !== undefined) {
      console.log(`✅ Cache HIT: ${key}`)
    } else {
      console.log(`❌ Cache MISS: ${key}`)
    }
    return value
  },

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} Success status
   */
  set: (key, value, ttl) => {
    const success = cache.set(key, value, ttl)
    if (success) {
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl || 'default'}s)`)
    }
    return success
  },

  /**
   * Delete specific key from cache
   * @param {string} key - Cache key
   * @returns {number} Number of deleted entries
   */
  del: (key) => {
    const count = cache.del(key)
    console.log(`🗑️  Cache DEL: ${key}`)
    return count
  },

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., "clan:*")
   * @returns {number} Number of deleted entries
   */
  delPattern: (pattern) => {
    const keys = cache.keys()
    const regex = new RegExp(pattern.replace('*', '.*'))
    const matchingKeys = keys.filter(key => regex.test(key))
    
    if (matchingKeys.length > 0) {
      cache.del(matchingKeys)
      console.log(`🗑️  Cache DEL pattern: ${pattern} (${matchingKeys.length} keys)`)
    }
    
    return matchingKeys.length
  },

  /**
   * Clear all cache
   */
  flush: () => {
    cache.flushAll()
    console.log('🧹 Cache FLUSHED (all keys deleted)')
  },

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats: () => {
    const stats = cache.getStats()
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize,
      hitRate: stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%'
    }
  },

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has: (key) => {
    return cache.has(key)
  },

  /**
   * Get all cache keys
   * @returns {string[]} Array of cache keys
   */
  keys: () => {
    return cache.keys()
  }
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  CLAN_BASIC: 600,        // 10 minutes - Basic clan info
  CLAN_WAR: 300,          // 5 minutes - Current war (changes during war)
  CLAN_WAR_LOG: 1800,     // 30 minutes - Historical war log
  CLAN_RAIDS: 3600,       // 1 hour - Capital raids (weekly data)
  GOOGLE_SHEETS: 900,     // 15 minutes - Google Sheets data
  STATS: 600,             // 10 minutes - Aggregated stats
  CWL_FILTERED: 600,      // 10 minutes - Filtered CWL clans
}

export default cacheService

