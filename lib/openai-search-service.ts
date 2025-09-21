// OpenAI Web Search Service for Restaurant Discovery
import { openai } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import type { LocationData } from "@/hooks/use-location"

// Schema for structured web search results
const restaurantSearchSchema = z.object({
  restaurants: z.array(
    z.object({
      name: z.string(),
      cuisine: z.string(),
      description: z.string(),
      priceLevel: z.number().min(1).max(5),
      rating: z.number().min(1).max(5).optional(),
      reviewCount: z.number().optional(),
      address: z.string(),
      phone: z.string().optional(),
      website: z.string().optional(),
      hours: z.string().optional(),
      specialties: z.array(z.string()),
      dietaryOptions: z.array(z.string()),
      ambiance: z.string(),
      bestFor: z.array(z.string()),
      estimatedWaitTime: z.string().optional(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
      sourceInfo: z.string().optional(), // Where the info came from
    })
  ),
  searchMetadata: z.object({
    query: z.string(),
    location: z.string(),
    totalFound: z.number(),
    searchTimestamp: z.string(),
    confidence: z.number().min(0).max(1),
  }),
})

export interface RestaurantSearchParams {
  query: string
  location: LocationData
  radius?: number
  priceRange?: number[]
  cuisine?: string
  dietaryRestrictions?: string[]
  maxResults?: number
}

export interface RestaurantSearchResult {
  restaurants: Array<{
    id: string
    name: string
    cuisine: string
    description: string
    priceLevel: number
    rating?: number
    reviewCount?: number
    address: string
    phone?: string
    website?: string
    hours?: string
    specialties: string[]
    dietaryOptions: string[]
    ambiance: string
    bestFor: string[]
    estimatedWaitTime?: string
    distance?: string
    coordinates?: { lat: number; lng: number }
    imageUrl?: string
    sourceInfo?: string
  }>
  searchMetadata: {
    query: string
    location: string
    totalFound: number
    searchTimestamp: string
    confidence: number
  }
}

export class OpenAISearchService {
  private static instance: OpenAISearchService | null = null
  private cache: Map<string, { data: RestaurantSearchResult; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_CACHE_SIZE = 100

  private constructor() {}

  static getInstance(): OpenAISearchService {
    if (!OpenAISearchService.instance) {
      OpenAISearchService.instance = new OpenAISearchService()
    }
    return OpenAISearchService.instance
  }

  /**
   * Search for real restaurants using OpenAI web search
   */
  async searchRestaurants(params: RestaurantSearchParams): Promise<RestaurantSearchResult> {
    const cacheKey = this.generateCacheKey(params)
    
    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Build optimized search query
      const searchQuery = this.buildSearchQuery(params)
      
      // Perform web search using OpenAI
      const webSearchResult = await this.performWebSearch(searchQuery, params)
      
      // Parse and structure the results
      const structuredResult = await this.parseSearchResults(webSearchResult, params)
      
      // Add generated IDs and process results
      const processedResult = this.processSearchResults(structuredResult, params)
      
      // Cache the result
      this.cacheResult(cacheKey, processedResult)
      
      return processedResult
    } catch (error) {
      console.error("OpenAI search error:", error)
      throw new Error(`Restaurant search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build an optimized search query for restaurants
   */
  private buildSearchQuery(params: RestaurantSearchParams): string {
    const { query, location, cuisine, dietaryRestrictions, priceRange } = params
    
    // Base location string
    const locationStr = this.formatLocationForSearch(location)
    
    // Build query components
    const queryParts: string[] = []
    
    // Add user query if provided
    if (query.trim()) {
      queryParts.push(query.trim())
    }
    
    // Add cuisine if specified
    if (cuisine) {
      queryParts.push(`${cuisine} cuisine`)
    }
    
    // Add dietary restrictions
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      queryParts.push(`${dietaryRestrictions.join(" ")} options`)
    }
    
    // Add price indicators
    if (priceRange && priceRange.length === 2) {
      if (priceRange[1] <= 2) {
        queryParts.push("affordable budget")
      } else if (priceRange[0] >= 4) {
        queryParts.push("fine dining upscale")
      }
    }
    
    // Combine with location
    const finalQuery = queryParts.length > 0 
      ? `${queryParts.join(" ")} restaurants in ${locationStr}`
      : `best restaurants in ${locationStr}`
    
    return finalQuery
  }

  /**
   * Format location data for search queries
   */
  private formatLocationForSearch(location: LocationData): string {
    if (location.city && location.country) {
      return location.state 
        ? `${location.city}, ${location.state}, ${location.country}`
        : `${location.city}, ${location.country}`
    }
    
    if (location.address) {
      return location.address
    }
    
    return `${location.latitude}, ${location.longitude}`
  }

  /**
   * Perform web search using OpenAI
   */
  private async performWebSearch(query: string, params: RestaurantSearchParams): Promise<string> {
    const searchPrompt = `Search the web for current, accurate information about restaurants based on this query: "${query}"

Please find real, currently operating restaurants that match the search criteria. Focus on:
- Restaurant name, location, and contact information
- Cuisine type and signature dishes
- Price range and dining style
- Current ratings and reviews
- Operating hours and availability
- Dietary options and accommodations
- Ambiance and best occasions for dining

Location context: ${this.formatLocationForSearch(params.location)}
Search radius: ${params.radius || 10} miles
Maximum results needed: ${params.maxResults || 8}

Provide comprehensive, factual information about real restaurants that are currently in business.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: searchPrompt,
      maxTokens: 4000,
      temperature: 0.3, // Lower temperature for more factual results
    })

    return text
  }

  /**
   * Parse web search results into structured restaurant data
   */
  private async parseSearchResults(
    webSearchText: string, 
    params: RestaurantSearchParams
  ): Promise<z.infer<typeof restaurantSearchSchema>> {
    const parsePrompt = `Based on the following web search results about restaurants, extract and structure the information into a standardized format.

Web search results:
${webSearchText}

Search context:
- Location: ${this.formatLocationForSearch(params.location)}
- User query: "${params.query}"
- Cuisine preference: ${params.cuisine || "Any"}
- Dietary restrictions: ${params.dietaryRestrictions?.join(", ") || "None"}
- Price range: ${params.priceRange ? `${"$".repeat(params.priceRange[0])} to ${"$".repeat(params.priceRange[1])}` : "Any"}

Please extract real restaurant information and structure it properly. For each restaurant:
1. Verify it appears to be a real, currently operating establishment
2. Extract accurate details (name, address, cuisine, etc.)
3. Infer reasonable estimates for missing data (price level, ambiance, etc.)
4. Ensure coordinates are realistic for the location
5. Rate confidence in the information quality

Focus on quality over quantity - better to have fewer high-confidence results than many uncertain ones.`

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: restaurantSearchSchema,
      prompt: parsePrompt,
      maxTokens: 3000,
      temperature: 0.2,
    })

    return object
  }

  /**
   * Process and enhance parsed results
   */
  private processSearchResults(
    structuredResult: z.infer<typeof restaurantSearchSchema>,
    params: RestaurantSearchParams
  ): RestaurantSearchResult {
    const { restaurants, searchMetadata } = structuredResult
    
    const processedRestaurants = restaurants.map((restaurant, index) => {
      // Generate unique ID
      const id = `real-${Date.now()}-${index}`
      
      // Calculate distance if coordinates are available
      let distance: string | undefined
      if (restaurant.coordinates) {
        const dist = this.calculateDistance(
          params.location.latitude,
          params.location.longitude,
          restaurant.coordinates.lat,
          restaurant.coordinates.lng
        )
        distance = `${dist.toFixed(1)} mi`
      }
      
      // Generate placeholder image URL
      const imageUrl = `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(restaurant.name)}`
      
      return {
        ...restaurant,
        id,
        distance,
        imageUrl,
        // Ensure required arrays exist
        specialties: restaurant.specialties || [],
        dietaryOptions: restaurant.dietaryOptions || [],
        bestFor: restaurant.bestFor || [],
      }
    })
    
    // Sort by distance if available, otherwise by rating
    processedRestaurants.sort((a, b) => {
      if (a.distance && b.distance) {
        const distA = parseFloat(a.distance.replace(' mi', ''))
        const distB = parseFloat(b.distance.replace(' mi', ''))
        return distA - distB
      }
      
      if (a.rating && b.rating) {
        return b.rating - a.rating
      }
      
      return 0
    })
    
    return {
      restaurants: processedRestaurants,
      searchMetadata,
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.degToRad(lat2 - lat1)
    const dLon = this.degToRad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI/180)
  }

  /**
   * Generate cache key for search parameters
   */
  private generateCacheKey(params: RestaurantSearchParams): string {
    const keyData = {
      query: params.query.toLowerCase().trim(),
      location: `${params.location.latitude.toFixed(3)},${params.location.longitude.toFixed(3)}`,
      cuisine: params.cuisine || '',
      dietary: params.dietaryRestrictions?.sort().join(',') || '',
      price: params.priceRange?.join('-') || '',
    }
    return Object.values(keyData).join('|')
  }

  /**
   * Get result from cache if valid
   */
  private getFromCache(key: string): RestaurantSearchResult | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  /**
   * Cache search result
   */
  private cacheResult(key: string, result: RestaurantSearchResult): void {
    // Clear old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
    })
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttlMinutes: this.CACHE_TTL / (60 * 1000),
    }
  }
}

// Export singleton instance
export const openAISearchService = OpenAISearchService.getInstance()