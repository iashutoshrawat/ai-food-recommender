// Enhanced Error Handling and Fallback System for Restaurant Search
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import type { LocationData } from "@/hooks/use-location"

export interface SearchError {
  type: 'network' | 'api_limit' | 'validation' | 'timeout' | 'unknown'
  message: string
  code: string
  retryable: boolean
  fallbackAvailable: boolean
  context?: any
}

export interface ErrorRecoveryOptions {
  enableFallback: boolean
  maxRetries: number
  retryDelay: number
  fallbackQuality: 'high' | 'medium' | 'low'
}

export class RestaurantSearchErrorHandler {
  private static errorCount: Map<string, { count: number; lastError: number }> = new Map()
  private static readonly MAX_ERRORS_PER_HOUR = 10
  private static readonly HOUR_MS = 60 * 60 * 1000

  /**
   * Classify and handle search errors with appropriate fallbacks
   */
  static handleSearchError(
    error: any,
    context: {
      query: string
      location: LocationData
      attempt: number
    },
    options: ErrorRecoveryOptions = {
      enableFallback: true,
      maxRetries: 2,
      retryDelay: 1000,
      fallbackQuality: 'medium'
    }
  ): {
    searchError: SearchError
    shouldRetry: boolean
    fallbackStrategy: 'none' | 'mock' | 'cache' | 'simplified_search'
    userMessage: string
  } {
    const searchError = this.classifyError(error, context)
    const errorKey = `${context.location.city || 'unknown'}-${Date.now().toString().slice(-6)}`
    
    // Track error frequency
    this.trackError(errorKey)
    
    // Determine retry strategy
    const shouldRetry = searchError.retryable && 
                       context.attempt < options.maxRetries && 
                       !this.isErrorRateExceeded(errorKey)

    // Determine fallback strategy
    let fallbackStrategy: 'none' | 'mock' | 'cache' | 'simplified_search' = 'none'
    
    if (options.enableFallback && searchError.fallbackAvailable) {
      fallbackStrategy = this.selectFallbackStrategy(searchError, context, options)
    }

    // Generate user-friendly message
    const userMessage = this.generateUserMessage(searchError, fallbackStrategy, context)

    return {
      searchError,
      shouldRetry,
      fallbackStrategy,
      userMessage
    }
  }

  /**
   * Generate mock restaurant data as fallback
   */
  static generateFallbackRestaurants(
    query: string,
    location: LocationData,
    quality: 'high' | 'medium' | 'low' = 'medium'
  ): Restaurant[] {
    const cuisineTypes = ['Italian', 'American', 'Mexican', 'Chinese', 'Japanese', 'Indian']
    const baseNames = [
      'Local Favorite', 'City Bistro', 'Corner Cafe', 'Downtown Grill', 
      'Main Street', 'Garden Restaurant', 'Plaza Dining', 'Central Kitchen'
    ]

    const restaurants: Restaurant[] = []
    const count = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4

    for (let i = 0; i < count; i++) {
      const cuisine = cuisineTypes[i % cuisineTypes.length]
      const baseName = baseNames[i % baseNames.length]
      const cityName = location.city || 'Local'

      restaurants.push({
        id: `fallback-${Date.now()}-${i}`,
        name: `${cityName} ${baseName} ${i > baseNames.length - 1 ? (i - baseNames.length + 2) : ''}`.trim(),
        cuisine,
        description: `${quality === 'high' ? 'Popular' : 'Local'} ${cuisine.toLowerCase()} restaurant in ${cityName}`,
        priceLevel: Math.floor(Math.random() * 3) + 2, // 2-4 range
        rating: quality === 'high' ? 4.0 + Math.random() * 0.8 : 3.5 + Math.random() * 1.0,
        reviewCount: quality === 'high' ? Math.floor(Math.random() * 500) + 200 : Math.floor(Math.random() * 200) + 50,
        address: this.generateFallbackAddress(location),
        phone: this.generateFallbackPhone(),
        website: `https://${baseName.toLowerCase().replace(/\s/g, '')}.com`,
        hours: "Daily 11am-10pm",
        specialties: this.getSpecialtiesForCuisine(cuisine),
        dietaryOptions: this.getRandomDietaryOptions(),
        ambiance: quality === 'high' ? 'Modern and inviting' : 'Casual and friendly',
        bestFor: quality === 'high' ? ['Date Night', 'Family Dinner'] : ['Casual Dining'],
        estimatedWaitTime: Math.random() > 0.5 ? `${Math.floor(Math.random() * 20) + 10} min` : undefined,
        distance: `${(Math.random() * 5 + 0.5).toFixed(1)} mi`,
        matchScore: quality === 'high' ? 75 + Math.floor(Math.random() * 20) : 60 + Math.floor(Math.random() * 20),
        matchReasons: this.generateFallbackMatchReasons(query, cuisine),
        imageUrl: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(baseName)}`
      })
    }

    return restaurants.sort((a, b) => b.matchScore - a.matchScore)
  }

  /**
   * Create a simplified search error for user feedback
   */
  static createUserFriendlyError(
    type: string,
    originalError?: any
  ): { 
    message: string
    suggestions: string[]
    canRetry: boolean 
  } {
    const errorMappings = {
      'network': {
        message: 'Unable to connect to restaurant search services. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Use a different location if possible'
        ],
        canRetry: true
      },
      'api_limit': {
        message: 'We\'ve reached our search limit for now. Please try again later or use the fallback results.',
        suggestions: [
          'Try again in 10-15 minutes',
          'Use a more specific search query',
          'Browse the suggested restaurants instead'
        ],
        canRetry: false
      },
      'location_invalid': {
        message: 'The location provided doesn\'t seem to be valid for restaurant search.',
        suggestions: [
          'Try a different city or address',
          'Use your current location if available',
          'Check the spelling of the location name'
        ],
        canRetry: true
      },
      'no_results': {
        message: 'No restaurants found matching your criteria in this area.',
        suggestions: [
          'Try a broader search query',
          'Expand your search radius',
          'Remove some filters to see more options'
        ],
        canRetry: true
      },
      'timeout': {
        message: 'The search is taking longer than expected. Please try again.',
        suggestions: [
          'Try a simpler search query',
          'Check your internet connection',
          'Try again in a moment'
        ],
        canRetry: true
      }
    }

    return errorMappings[type as keyof typeof errorMappings] || {
      message: 'Something went wrong with the restaurant search. Please try again.',
      suggestions: [
        'Try again with a different search',
        'Check your internet connection',
        'Contact support if the problem persists'
      ],
      canRetry: true
    }
  }

  // Private helper methods

  private static classifyError(error: any, context: any): SearchError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorLower = errorMessage.toLowerCase()

    // Network-related errors
    if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        code: 'NETWORK_ERROR',
        retryable: true,
        fallbackAvailable: true,
        context
      }
    }

    // API rate limiting
    if (errorLower.includes('rate') || errorLower.includes('limit') || errorLower.includes('quota')) {
      return {
        type: 'api_limit',
        message: 'API rate limit exceeded',
        code: 'RATE_LIMIT_ERROR',
        retryable: false,
        fallbackAvailable: true,
        context
      }
    }

    // Validation errors
    if (errorLower.includes('validation') || errorLower.includes('invalid') || error?.status === 400) {
      return {
        type: 'validation',
        message: 'Invalid search parameters',
        code: 'VALIDATION_ERROR',
        retryable: false,
        fallbackAvailable: true,
        context
      }
    }

    // Timeout errors
    if (errorLower.includes('timeout') || errorLower.includes('aborted') || error?.code === 'ECONNABORTED') {
      return {
        type: 'timeout',
        message: 'Search request timed out',
        code: 'TIMEOUT_ERROR',
        retryable: true,
        fallbackAvailable: true,
        context
      }
    }

    // Default unknown error
    return {
      type: 'unknown',
      message: errorMessage,
      code: 'UNKNOWN_ERROR',
      retryable: true,
      fallbackAvailable: true,
      context
    }
  }

  private static trackError(errorKey: string): void {
    const now = Date.now()
    const existing = this.errorCount.get(errorKey)
    
    if (existing && (now - existing.lastError) < this.HOUR_MS) {
      existing.count++
      existing.lastError = now
    } else {
      this.errorCount.set(errorKey, { count: 1, lastError: now })
    }

    // Cleanup old entries
    if (this.errorCount.size > 100) {
      for (const [key, value] of this.errorCount.entries()) {
        if ((now - value.lastError) > this.HOUR_MS) {
          this.errorCount.delete(key)
        }
      }
    }
  }

  private static isErrorRateExceeded(errorKey: string): boolean {
    const entry = this.errorCount.get(errorKey)
    return entry ? entry.count >= this.MAX_ERRORS_PER_HOUR : false
  }

  private static selectFallbackStrategy(
    error: SearchError,
    context: any,
    options: ErrorRecoveryOptions
  ): 'mock' | 'cache' | 'simplified_search' {
    // For API limits, use cache first, then mock
    if (error.type === 'api_limit') {
      return 'cache' // Assume cache check happens elsewhere
    }

    // For network errors, try simplified search first
    if (error.type === 'network') {
      return context.attempt === 0 ? 'simplified_search' : 'mock'
    }

    // For validation errors, use mock data
    if (error.type === 'validation') {
      return 'mock'
    }

    // Default to mock for unknown errors
    return 'mock'
  }

  private static generateUserMessage(
    error: SearchError,
    fallbackStrategy: string,
    context: any
  ): string {
    const location = context.location.city || 'your area'
    
    if (fallbackStrategy === 'mock') {
      return `We're having trouble finding restaurants in ${location} right now, so we've provided some local suggestions based on your preferences.`
    }
    
    if (fallbackStrategy === 'cache') {
      return `Using previously found restaurants in ${location} while we resolve the search issue.`
    }
    
    if (fallbackStrategy === 'simplified_search') {
      return `Trying a simplified search for restaurants in ${location}...`
    }
    
    return `Unable to search for restaurants in ${location}. Please try again later.`
  }

  private static generateFallbackAddress(location: LocationData): string {
    const streetNumbers = Math.floor(Math.random() * 9999) + 100
    const streetNames = ['Main St', 'First Ave', 'Broadway', 'Oak St', 'Park Ave', 'Center St']
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)]
    const city = location.city || 'City'
    
    return `${streetNumbers} ${streetName}, ${city}`
  }

  private static generateFallbackPhone(): string {
    const areaCode = Math.floor(Math.random() * 800) + 200
    const exchange = Math.floor(Math.random() * 800) + 200
    const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `(${areaCode}) ${exchange}-${number}`
  }

  private static getSpecialtiesForCuisine(cuisine: string): string[] {
    const specialties: Record<string, string[]> = {
      Italian: ['Pasta', 'Pizza', 'Risotto'],
      Japanese: ['Sushi', 'Ramen', 'Tempura'],
      Mexican: ['Tacos', 'Guacamole', 'Enchiladas'],
      Chinese: ['Kung Pao', 'Fried Rice', 'Dumplings'],
      Indian: ['Curry', 'Naan', 'Biryani'],
      American: ['Burgers', 'Steaks', 'BBQ']
    }
    
    return specialties[cuisine] || ['House Special']
  }

  private static getRandomDietaryOptions(): string[] {
    const options = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free']
    const numOptions = Math.floor(Math.random() * 2) + 1
    return options.slice(0, numOptions)
  }

  private static generateFallbackMatchReasons(query: string, cuisine: string): string[] {
    const reasons = [
      `Popular ${cuisine.toLowerCase()} restaurant`,
      'Good ratings from locals',
      'Convenient location'
    ]
    
    if (query.toLowerCase().includes(cuisine.toLowerCase())) {
      reasons.unshift(`Matches your ${cuisine} cuisine preference`)
    }
    
    return reasons.slice(0, 2)
  }
}