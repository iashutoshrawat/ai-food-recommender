// Advanced Search Result Caching System
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import type { LocationData } from "@/hooks/use-location"

export interface CacheEntry<T> {
  key: string
  data: T
  timestamp: number
  expiresAt: number
  metadata: {
    location: LocationData
    query: string
    resultCount: number
    version: string
  }
  accessCount: number
  lastAccessed: number
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
  version?: string // Cache version for invalidation
}

export interface CacheStats {
  size: number
  maxSize: number
  hitRate: number
  totalHits: number
  totalMisses: number
  oldestEntry: number
  newestEntry: number
  memoryUsage: number // Approximate in bytes
}

export type RestaurantSearchResult = {
  restaurants: Restaurant[]
  searchMetadata: {
    query: string
    location: string
    totalFound: number
    searchTimestamp: string
    confidence: number
  }
}

/**
 * Advanced caching system for restaurant search results
 * Implements LRU eviction, TTL expiration, and smart cache key generation
 */
export class SearchCache<T = RestaurantSearchResult> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private accessOrder: string[] = []
  private readonly options: Required<CacheOptions>
  private stats: {
    hits: number
    misses: number
    evictions: number
    totalRequests: number
  }

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 30 * 60 * 1000, // 30 minutes default
      maxSize: options.maxSize || 100,
      version: options.version || '1.0'
    }

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    }
  }

  /**
   * Generate cache key from search parameters
   */
  static generateCacheKey(params: {
    query: string
    location: LocationData
    cuisine?: string
    dietaryRestrictions?: string[]
    priceRange?: number[]
    radius?: number
  }): string {
    // Normalize and sort parameters for consistent keys
    const normalized = {
      query: params.query.toLowerCase().trim(),
      lat: Math.round(params.location.latitude * 1000) / 1000, // 3 decimal precision
      lng: Math.round(params.location.longitude * 1000) / 1000,
      city: params.location.city?.toLowerCase(),
      cuisine: params.cuisine?.toLowerCase(),
      dietary: params.dietaryRestrictions?.map(d => d.toLowerCase()).sort().join(',') || '',
      priceMin: params.priceRange?.[0] || '',
      priceMax: params.priceRange?.[1] || '',
      radius: params.radius || 10
    }

    // Create hash-friendly key
    const keyParts = [
      normalized.query,
      `${normalized.lat},${normalized.lng}`,
      normalized.city || '',
      normalized.cuisine || '',
      normalized.dietary,
      `${normalized.priceMin}-${normalized.priceMax}`,
      normalized.radius.toString()
    ]

    return keyParts.join('|')
  }

  /**
   * Get cached result if valid
   */
  get(key: string): T | null {
    this.stats.totalRequests++

    const entry = this.cache.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.stats.misses++
      return null
    }

    // Update access tracking
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.updateAccessOrder(key)
    this.stats.hits++

    return entry.data
  }

  /**
   * Set cache entry with metadata
   */
  set(
    key: string, 
    data: T, 
    metadata: {
      location: LocationData
      query: string
      resultCount: number
    }
  ): void {
    const now = Date.now()
    
    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: now,
      expiresAt: now + this.options.ttl,
      metadata: {
        ...metadata,
        version: this.options.version
      },
      accessCount: 1,
      lastAccessed: now
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)
  }

  /**
   * Check if cache has valid entry
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return false
    }
    
    return true
  }

  /**
   * Manually delete cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.removeFromAccessOrder(key)
    }
    return deleted
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.resetStats()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0

    // Estimate memory usage (rough approximation)
    const memoryUsage = entries.reduce((total, entry) => {
      return total + JSON.stringify(entry).length * 2 // Rough bytes estimate
    }, 0)

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
      memoryUsage
    }
  }

  /**
   * Get all entries matching location
   */
  getEntriesForLocation(location: LocationData, radiusKm: number = 10): CacheEntry<T>[] {
    const entries: CacheEntry<T>[] = []
    
    for (const entry of this.cache.values()) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        entry.metadata.location.latitude,
        entry.metadata.location.longitude
      )
      
      if (distance <= radiusKm) {
        entries.push(entry)
      }
    }
    
    return entries.sort((a, b) => b.lastAccessed - a.lastAccessed)
  }

  /**
   * Expire entries older than specified age
   */
  expireOldEntries(maxAgeMs: number = 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - maxAgeMs
    let expiredCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < cutoffTime) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        expiredCount++
      }
    }
    
    return expiredCount
  }

  /**
   * Get entries that match query patterns
   */
  findSimilarQueries(query: string, maxDistance: number = 3): CacheEntry<T>[] {
    const queryLower = query.toLowerCase()
    const matches: Array<{ entry: CacheEntry<T>; score: number }> = []
    
    for (const entry of this.cache.values()) {
      const entryQuery = entry.metadata.query.toLowerCase()
      const score = this.calculateStringSimilarity(queryLower, entryQuery)
      
      if (score >= (1 - maxDistance / 10)) {
        matches.push({ entry, score })
      }
    }
    
    return matches
      .sort((a, b) => b.score - a.score)
      .map(m => m.entry)
      .slice(0, 5)
  }

  /**
   * Invalidate cache entries by version
   */
  invalidateVersion(version: string): number {
    let invalidatedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.version === version) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        invalidatedCount++
      }
    }
    
    return invalidatedCount
  }

  /**
   * Preload cache with popular queries
   */
  async preloadPopularQueries(
    popularQueries: Array<{
      query: string
      location: LocationData
      loader: () => Promise<T>
    }>
  ): Promise<number> {
    let loadedCount = 0
    
    for (const { query, location, loader } of popularQueries) {
      const key = SearchCache.generateCacheKey({
        query,
        location
      })
      
      if (!this.has(key)) {
        try {
          const data = await loader()
          this.set(key, data, {
            location,
            query,
            resultCount: Array.isArray((data as any)?.restaurants) 
              ? (data as any).restaurants.length 
              : 0
          })
          loadedCount++
        } catch (error) {
          console.warn(`Failed to preload query "${query}":`, error)
        }
      }
    }
    
    return loadedCount
  }

  // Private helper methods

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return
    
    const lruKey = this.accessOrder[0]
    this.cache.delete(lruKey)
    this.accessOrder.shift()
    this.stats.evictions++
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private calculateStringSimilarity(a: string, b: string): number {
    if (a === b) return 1
    if (a.length === 0 || b.length === 0) return 0
    
    // Simple Jaccard similarity on words
    const wordsA = new Set(a.split(/\s+/))
    const wordsB = new Set(b.split(/\s+/))
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)))
    const union = new Set([...wordsA, ...wordsB])
    
    return intersection.size / union.size
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    }
  }
}

// Export singleton instances for different cache types
export const restaurantSearchCache = new SearchCache<RestaurantSearchResult>({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 100,
  version: '1.0'
})

export const locationCache = new SearchCache<LocationData[]>({
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 50,
  version: '1.0'
})

// Cache utility functions
export class CacheUtils {
  /**
   * Warm up cache with common searches
   */
  static async warmUpCache(
    commonLocations: LocationData[],
    popularQueries: string[]
  ): Promise<void> {
    console.log('Warming up search cache...')
    
    const warmupPromises: Array<Promise<void>> = []
    
    for (const location of commonLocations.slice(0, 5)) { // Limit to avoid overwhelming
      for (const query of popularQueries.slice(0, 3)) {
        warmupPromises.push(
          this.preloadQuery(query, location).catch(error => {
            console.warn(`Failed to preload ${query} for ${location.city}:`, error)
          })
        )
      }
    }
    
    await Promise.allSettled(warmupPromises)
    console.log('Cache warmup completed')
  }

  private static async preloadQuery(query: string, location: LocationData): Promise<void> {
    const key = SearchCache.generateCacheKey({ query, location })
    
    if (restaurantSearchCache.has(key)) {
      return // Already cached
    }
    
    // This would typically call the actual search service
    // For now, we'll skip the actual API call
    console.log(`Would preload: "${query}" in ${location.city}`)
  }

  /**
   * Get cache health metrics
   */
  static getCacheHealth(): {
    restaurantCache: CacheStats
    locationCache: CacheStats
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
  } {
    const restaurantStats = restaurantSearchCache.getStats()
    const locationStats = locationCache.getStats()
    
    // Determine overall health
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
    const avgHitRate = (restaurantStats.hitRate + locationStats.hitRate) / 2
    
    if (avgHitRate >= 80) overallHealth = 'excellent'
    else if (avgHitRate >= 60) overallHealth = 'good'
    else if (avgHitRate >= 40) overallHealth = 'fair'
    
    return {
      restaurantCache: restaurantStats,
      locationCache: locationStats,
      overallHealth
    }
  }

  /**
   * Clean up expired entries from all caches
   */
  static cleanupExpiredEntries(): {
    restaurantCacheExpired: number
    locationCacheExpired: number
  } {
    const restaurantExpired = restaurantSearchCache.expireOldEntries()
    const locationExpired = locationCache.expireOldEntries()
    
    return {
      restaurantCacheExpired: restaurantExpired,
      locationCacheExpired: locationExpired
    }
  }
}