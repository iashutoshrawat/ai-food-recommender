// Advanced Search Query Builder for Restaurant Discovery
import type { LocationData } from "@/hooks/use-location"

export interface SearchContext {
  userQuery: string
  location: LocationData
  cuisine?: string
  dietaryRestrictions?: string[]
  priceRange?: number[]
  mealType?: string
  occasion?: string
  groupSize?: number
  preferences?: {
    ambiance?: string[]
    features?: string[]
    diningStyle?: string[]
  }
}

export interface QueryStrategy {
  primary: string
  fallback: string[]
  searchTerms: string[]
  locationContext: string
  confidence: number
}

export class SearchQueryBuilder {
  private static readonly CUISINE_KEYWORDS = {
    'Italian': ['italian', 'pasta', 'pizza', 'trattoria', 'ristorante'],
    'Japanese': ['japanese', 'sushi', 'ramen', 'hibachi', 'izakaya'],
    'Mexican': ['mexican', 'tacos', 'cantina', 'taqueria', 'tex-mex'],
    'Chinese': ['chinese', 'dim sum', 'szechuan', 'mandarin', 'cantonese'],
    'Indian': ['indian', 'curry', 'tandoori', 'biryani', 'masala'],
    'Thai': ['thai', 'pad thai', 'tom yum', 'curry', 'thai cuisine'],
    'French': ['french', 'bistro', 'brasserie', 'cafe', 'fine dining'],
    'American': ['american', 'grill', 'diner', 'burger', 'steakhouse'],
    'Mediterranean': ['mediterranean', 'greek', 'lebanese', 'hummus', 'gyro'],
    'Korean': ['korean', 'bbq', 'kimchi', 'bulgogi', 'k-town']
  }

  private static readonly DIETARY_KEYWORDS = {
    'Vegetarian': ['vegetarian', 'veggie', 'plant-based options'],
    'Vegan': ['vegan', 'plant-based', 'dairy-free options'],
    'Gluten-Free': ['gluten-free', 'celiac friendly', 'gluten free menu'],
    'Halal': ['halal', 'halal certified', 'muslim friendly'],
    'Kosher': ['kosher', 'kosher certified', 'jewish cuisine'],
    'Keto': ['keto', 'low-carb', 'ketogenic'],
    'Paleo': ['paleo', 'paleo-friendly', 'grain-free']
  }

  private static readonly PRICE_KEYWORDS = {
    1: ['cheap', 'budget', 'affordable', 'inexpensive', 'under $15'],
    2: ['casual', 'moderate', 'reasonably priced', '$15-25'],
    3: ['mid-range', 'good value', 'decent prices', '$25-40'],
    4: ['upscale', 'fine dining', 'pricey', '$40-60'],
    5: ['luxury', 'expensive', 'high-end', 'premium', 'over $60']
  }

  private static readonly OCCASION_KEYWORDS = {
    'date': ['romantic', 'intimate', 'date night', 'couples'],
    'business': ['business lunch', 'professional', 'quiet', 'wifi'],
    'family': ['family-friendly', 'kids menu', 'casual', 'spacious'],
    'celebration': ['special occasion', 'celebration', 'party', 'groups'],
    'quick': ['quick bite', 'fast service', 'takeout', 'grab and go'],
    'brunch': ['brunch', 'breakfast', 'weekend', 'bottomless mimosas']
  }

  /**
   * Build comprehensive search strategy for restaurant discovery
   */
  static buildSearchStrategy(context: SearchContext): QueryStrategy {
    const locationStr = this.buildLocationString(context.location)
    const searchTerms = this.extractSearchTerms(context)
    
    // Build primary query
    const primaryQuery = this.buildPrimaryQuery(context, locationStr)
    
    // Build fallback queries for better coverage
    const fallbackQueries = this.buildFallbackQueries(context, locationStr)
    
    // Calculate confidence based on query specificity
    const confidence = this.calculateQueryConfidence(context)

    return {
      primary: primaryQuery,
      fallback: fallbackQueries,
      searchTerms,
      locationContext: locationStr,
      confidence
    }
  }

  /**
   * Build the primary search query
   */
  private static buildPrimaryQuery(context: SearchContext, locationStr: string): string {
    const components: string[] = []
    
    // Start with user query if meaningful
    const cleanQuery = this.cleanUserQuery(context.userQuery)
    if (cleanQuery) {
      components.push(cleanQuery)
    }

    // Add cuisine if specified
    if (context.cuisine) {
      const cuisineKeywords = this.CUISINE_KEYWORDS[context.cuisine as keyof typeof this.CUISINE_KEYWORDS]
      if (cuisineKeywords) {
        components.push(cuisineKeywords[0]) // Use primary cuisine term
      } else {
        components.push(context.cuisine.toLowerCase())
      }
    }

    // Add dietary restrictions
    if (context.dietaryRestrictions && context.dietaryRestrictions.length > 0) {
      const dietaryTerms = context.dietaryRestrictions
        .map(restriction => {
          const keywords = this.DIETARY_KEYWORDS[restriction as keyof typeof this.DIETARY_KEYWORDS]
          return keywords ? keywords[0] : restriction.toLowerCase()
        })
        .slice(0, 2) // Limit to prevent query from becoming too long

      components.push(`${dietaryTerms.join(' ')} friendly`)
    }

    // Add price indicators
    if (context.priceRange && context.priceRange.length === 2) {
      const avgPrice = Math.round((context.priceRange[0] + context.priceRange[1]) / 2)
      const priceKeywords = this.PRICE_KEYWORDS[avgPrice as keyof typeof this.PRICE_KEYWORDS]
      if (priceKeywords) {
        components.push(priceKeywords[0])
      }
    }

    // Add occasion context
    if (context.occasion) {
      const occasionKeywords = this.OCCASION_KEYWORDS[context.occasion as keyof typeof this.OCCASION_KEYWORDS]
      if (occasionKeywords) {
        components.push(occasionKeywords[0])
      }
    }

    // Combine with location
    const queryPart = components.length > 0 ? components.join(' ') : 'restaurants'
    return `${queryPart} restaurants in ${locationStr}`
  }

  /**
   * Build fallback queries for broader coverage
   */
  private static buildFallbackQueries(context: SearchContext, locationStr: string): string[] {
    const fallbacks: string[] = []

    // General fallback
    fallbacks.push(`best restaurants in ${locationStr}`)

    // Cuisine-specific fallback
    if (context.cuisine) {
      fallbacks.push(`${context.cuisine} restaurants ${locationStr}`)
    }

    // Popular/top-rated fallback
    fallbacks.push(`top rated restaurants near ${locationStr}`)

    // Local favorites fallback
    fallbacks.push(`local restaurant recommendations ${locationStr}`)

    // Price-specific fallback
    if (context.priceRange) {
      const avgPrice = Math.round((context.priceRange[0] + context.priceRange[1]) / 2)
      if (avgPrice <= 2) {
        fallbacks.push(`affordable restaurants ${locationStr}`)
      } else if (avgPrice >= 4) {
        fallbacks.push(`fine dining restaurants ${locationStr}`)
      }
    }

    return fallbacks.slice(0, 3) // Limit to 3 fallbacks
  }

  /**
   * Extract relevant search terms for analysis
   */
  private static extractSearchTerms(context: SearchContext): string[] {
    const terms: Set<string> = new Set()

    // Add cleaned user query terms
    const cleanQuery = this.cleanUserQuery(context.userQuery)
    if (cleanQuery) {
      cleanQuery.split(' ').forEach(term => {
        if (term.length > 2) terms.add(term.toLowerCase())
      })
    }

    // Add cuisine terms
    if (context.cuisine) {
      terms.add(context.cuisine.toLowerCase())
      const cuisineKeywords = this.CUISINE_KEYWORDS[context.cuisine as keyof typeof this.CUISINE_KEYWORDS]
      if (cuisineKeywords) {
        cuisineKeywords.forEach(keyword => terms.add(keyword))
      }
    }

    // Add dietary terms
    if (context.dietaryRestrictions) {
      context.dietaryRestrictions.forEach(restriction => {
        terms.add(restriction.toLowerCase())
        const keywords = this.DIETARY_KEYWORDS[restriction as keyof typeof this.DIETARY_KEYWORDS]
        if (keywords) {
          keywords.forEach(keyword => terms.add(keyword))
        }
      })
    }

    // Add location terms
    if (context.location.city) terms.add(context.location.city.toLowerCase())
    if (context.location.state) terms.add(context.location.state.toLowerCase())

    return Array.from(terms)
  }

  /**
   * Build location string for search queries
   */
  private static buildLocationString(location: LocationData): string {
    // Prioritize city, state, country format
    if (location.city && location.country) {
      if (location.state && location.country === 'United States') {
        return `${location.city}, ${location.state}`
      }
      if (location.state) {
        return `${location.city}, ${location.state}, ${location.country}`
      }
      return `${location.city}, ${location.country}`
    }

    // Fallback to address if available
    if (location.address) {
      return location.address
    }

    // Last resort: coordinates
    return `${location.latitude}, ${location.longitude}`
  }

  /**
   * Clean and normalize user query
   */
  private static cleanUserQuery(query: string): string {
    if (!query) return ''

    // Remove common stop words that don't add value to restaurant search
    const stopWords = [
      'find', 'show', 'search', 'look', 'for', 'me', 'some', 'good', 'nice',
      'restaurant', 'restaurants', 'place', 'places', 'food', 'eat', 'dining',
      'near', 'around', 'in', 'at', 'the', 'a', 'an', 'and', 'or', 'but'
    ]

    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter(word => word.length > 2 && !stopWords.includes(word))

    return words.join(' ').trim()
  }

  /**
   * Calculate confidence score for the query strategy
   */
  private static calculateQueryConfidence(context: SearchContext): number {
    let confidence = 50 // Base confidence

    // User query quality
    const cleanQuery = this.cleanUserQuery(context.userQuery)
    if (cleanQuery.length > 0) {
      confidence += Math.min(20, cleanQuery.split(' ').length * 5)
    }

    // Location specificity
    if (context.location.city) confidence += 15
    if (context.location.state) confidence += 10
    if (context.location.postalCode) confidence += 5

    // Search parameters specificity
    if (context.cuisine) confidence += 10
    if (context.dietaryRestrictions && context.dietaryRestrictions.length > 0) confidence += 8
    if (context.priceRange) confidence += 5
    if (context.occasion) confidence += 5

    return Math.min(100, confidence)
  }

  /**
   * Generate alternative query variations for testing
   */
  static generateQueryVariations(context: SearchContext): string[] {
    const locationStr = this.buildLocationString(context.location)
    const variations: string[] = []

    // Basic variations
    variations.push(`restaurants near ${locationStr}`)
    variations.push(`dining ${locationStr}`)
    variations.push(`food near ${locationStr}`)

    // Cuisine variations
    if (context.cuisine) {
      variations.push(`${context.cuisine} food ${locationStr}`)
      variations.push(`${context.cuisine.toLowerCase()} cuisine ${locationStr}`)
      
      // Add cuisine-specific terms
      const cuisineKeywords = this.CUISINE_KEYWORDS[context.cuisine as keyof typeof this.CUISINE_KEYWORDS]
      if (cuisineKeywords && cuisineKeywords.length > 1) {
        variations.push(`${cuisineKeywords[1]} ${locationStr}`)
      }
    }

    // Dietary variations
    if (context.dietaryRestrictions && context.dietaryRestrictions.length > 0) {
      const dietary = context.dietaryRestrictions[0]
      variations.push(`${dietary} restaurants ${locationStr}`)
      variations.push(`${dietary} friendly dining ${locationStr}`)
    }

    // Price variations
    if (context.priceRange) {
      const avgPrice = Math.round((context.priceRange[0] + context.priceRange[1]) / 2)
      if (avgPrice <= 2) {
        variations.push(`cheap eats ${locationStr}`)
        variations.push(`budget restaurants ${locationStr}`)
      } else if (avgPrice >= 4) {
        variations.push(`upscale dining ${locationStr}`)
        variations.push(`fine restaurants ${locationStr}`)
      }
    }

    // Remove duplicates and limit
    return Array.from(new Set(variations)).slice(0, 5)
  }

  /**
   * Validate search context for completeness
   */
  static validateSearchContext(context: SearchContext): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    // Check location data
    if (!context.location) {
      issues.push('Location data is required')
    } else {
      if (!context.location.latitude || !context.location.longitude) {
        issues.push('Location coordinates are missing')
      }
      if (!context.location.city && !context.location.address) {
        issues.push('Location name or address is missing')
      }
    }

    // Check query meaningfulness
    if (!context.userQuery || context.userQuery.trim().length === 0) {
      if (!context.cuisine) {
        issues.push('Either user query or cuisine preference is required')
      }
    }

    // Validate price range
    if (context.priceRange) {
      if (context.priceRange.length !== 2) {
        issues.push('Price range must have exactly 2 values')
      } else if (context.priceRange[0] < 1 || context.priceRange[1] > 5) {
        issues.push('Price range values must be between 1 and 5')
      } else if (context.priceRange[0] > context.priceRange[1]) {
        issues.push('Price range minimum cannot exceed maximum')
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}