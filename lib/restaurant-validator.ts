// Restaurant Data Validator and Quality Assessment
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import type { LocationData } from "@/hooks/use-location"

export interface ValidationResult {
  isValid: boolean
  score: number
  issues: ValidationIssue[]
  warnings: ValidationIssue[]
  suggestions: string[]
}

export interface ValidationIssue {
  field: string
  severity: 'error' | 'warning' | 'info'
  message: string
  code: string
}

export interface QualityMetrics {
  completeness: number
  accuracy: number
  relevance: number
  freshness: number
  overall: number
}

export class RestaurantValidator {
  private static readonly REQUIRED_FIELDS = ['name', 'cuisine', 'address']
  private static readonly OPTIONAL_FIELDS = ['phone', 'website', 'hours', 'rating', 'reviewCount']
  
  private static readonly CUISINE_CATEGORIES = new Set([
    'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 'Thai', 'French',
    'American', 'Mediterranean', 'Korean', 'Vietnamese', 'Greek', 'Spanish',
    'Lebanese', 'Turkish', 'Moroccan', 'Ethiopian', 'German', 'Brazilian',
    'Peruvian', 'Fusion', 'Contemporary', 'International', 'Seafood',
    'Steakhouse', 'BBQ', 'Pizza', 'Sushi', 'Ramen', 'Burger', 'Cafe',
    'Deli', 'Bakery', 'Fast Food', 'Fine Dining', 'Casual Dining'
  ])

  private static readonly SUSPICIOUS_PATTERNS = [
    /test\s*restaurant/i,
    /sample\s*restaurant/i,
    /example\s*restaurant/i,
    /placeholder/i,
    /lorem\s*ipsum/i,
    /^restaurant\s*\d+$/i,
    /^the\s*restaurant$/i
  ]

  /**
   * Validate a single restaurant entry
   */
  static validateRestaurant(
    restaurant: Restaurant,
    searchLocation?: LocationData,
    searchQuery?: string
  ): ValidationResult {
    const issues: ValidationIssue[] = []
    const warnings: ValidationIssue[] = []
    const suggestions: string[] = []

    // Check required fields
    this.validateRequiredFields(restaurant, issues)
    
    // Validate data quality
    this.validateDataQuality(restaurant, issues, warnings)
    
    // Check for suspicious patterns
    this.checkSuspiciousPatterns(restaurant, issues)
    
    // Validate business logic
    this.validateBusinessLogic(restaurant, issues, warnings)
    
    // Location relevance check
    if (searchLocation) {
      this.validateLocationRelevance(restaurant, searchLocation, warnings)
    }
    
    // Query relevance check
    if (searchQuery) {
      this.validateQueryRelevance(restaurant, searchQuery, warnings, suggestions)
    }
    
    // Calculate quality score
    const score = this.calculateQualityScore(restaurant, issues, warnings)
    
    return {
      isValid: issues.length === 0,
      score,
      issues,
      warnings,
      suggestions: suggestions.slice(0, 3) // Limit suggestions
    }
  }

  /**
   * Validate multiple restaurants and rank by quality
   */
  static validateRestaurantList(
    restaurants: Restaurant[],
    searchLocation?: LocationData,
    searchQuery?: string
  ): {
    valid: Array<{ restaurant: Restaurant; validation: ValidationResult }>
    invalid: Array<{ restaurant: Restaurant; validation: ValidationResult }>
    statistics: {
      totalCount: number
      validCount: number
      invalidCount: number
      averageScore: number
      qualityDistribution: Record<string, number>
    }
  } {
    const results = restaurants.map(restaurant => ({
      restaurant,
      validation: this.validateRestaurant(restaurant, searchLocation, searchQuery)
    }))

    const valid = results.filter(result => result.validation.isValid)
    const invalid = results.filter(result => !result.validation.isValid)

    // Sort by quality score
    valid.sort((a, b) => b.validation.score - a.validation.score)

    // Calculate statistics
    const scores = results.map(r => r.validation.score)
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

    const qualityDistribution = {
      excellent: results.filter(r => r.validation.score >= 90).length,
      good: results.filter(r => r.validation.score >= 70 && r.validation.score < 90).length,
      fair: results.filter(r => r.validation.score >= 50 && r.validation.score < 70).length,
      poor: results.filter(r => r.validation.score < 50).length
    }

    return {
      valid,
      invalid,
      statistics: {
        totalCount: restaurants.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        averageScore: Math.round(averageScore),
        qualityDistribution
      }
    }
  }

  /**
   * Calculate comprehensive quality metrics
   */
  static calculateQualityMetrics(restaurant: Restaurant): QualityMetrics {
    const completeness = this.calculateCompleteness(restaurant)
    const accuracy = this.calculateAccuracy(restaurant)
    const relevance = this.calculateRelevance(restaurant)
    const freshness = this.calculateFreshness(restaurant)
    
    const overall = Math.round(
      (completeness * 0.3 + accuracy * 0.3 + relevance * 0.25 + freshness * 0.15)
    )

    return {
      completeness: Math.round(completeness),
      accuracy: Math.round(accuracy),
      relevance: Math.round(relevance),
      freshness: Math.round(freshness),
      overall
    }
  }

  // Private validation methods

  private static validateRequiredFields(restaurant: Restaurant, issues: ValidationIssue[]) {
    this.REQUIRED_FIELDS.forEach(field => {
      const value = restaurant[field as keyof Restaurant]
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        issues.push({
          field,
          severity: 'error',
          message: `Required field '${field}' is missing or empty`,
          code: 'REQUIRED_FIELD_MISSING'
        })
      }
    })
  }

  private static validateDataQuality(
    restaurant: Restaurant, 
    issues: ValidationIssue[], 
    warnings: ValidationIssue[]
  ) {
    // Name validation
    if (restaurant.name) {
      if (restaurant.name.length < 2) {
        issues.push({
          field: 'name',
          severity: 'error',
          message: 'Restaurant name is too short',
          code: 'NAME_TOO_SHORT'
        })
      } else if (restaurant.name.length > 100) {
        warnings.push({
          field: 'name',
          severity: 'warning',
          message: 'Restaurant name is unusually long',
          code: 'NAME_TOO_LONG'
        })
      }
    }

    // Cuisine validation
    if (restaurant.cuisine && !this.CUISINE_CATEGORIES.has(restaurant.cuisine)) {
      warnings.push({
        field: 'cuisine',
        severity: 'warning',
        message: `Cuisine '${restaurant.cuisine}' is not in standard categories`,
        code: 'UNKNOWN_CUISINE'
      })
    }

    // Price level validation
    if (restaurant.priceLevel && (restaurant.priceLevel < 1 || restaurant.priceLevel > 5)) {
      issues.push({
        field: 'priceLevel',
        severity: 'error',
        message: 'Price level must be between 1 and 5',
        code: 'INVALID_PRICE_LEVEL'
      })
    }

    // Rating validation
    if (restaurant.rating && (restaurant.rating < 1 || restaurant.rating > 5)) {
      issues.push({
        field: 'rating',
        severity: 'error',
        message: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING'
      })
    }

    // Review count validation
    if (restaurant.reviewCount && restaurant.reviewCount < 0) {
      issues.push({
        field: 'reviewCount',
        severity: 'error',
        message: 'Review count cannot be negative',
        code: 'NEGATIVE_REVIEW_COUNT'
      })
    }

    // Phone validation
    if (restaurant.phone) {
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{9,20}$/
      if (!phoneRegex.test(restaurant.phone.replace(/\s/g, ''))) {
        warnings.push({
          field: 'phone',
          severity: 'warning',
          message: 'Phone number format appears invalid',
          code: 'INVALID_PHONE_FORMAT'
        })
      }
    }

    // Website validation
    if (restaurant.website) {
      try {
        new URL(restaurant.website)
      } catch {
        warnings.push({
          field: 'website',
          severity: 'warning',
          message: 'Website URL format appears invalid',
          code: 'INVALID_URL_FORMAT'
        })
      }
    }

    // Address validation
    if (restaurant.address && restaurant.address.length < 10) {
      warnings.push({
        field: 'address',
        severity: 'warning',
        message: 'Address appears to be incomplete',
        code: 'INCOMPLETE_ADDRESS'
      })
    }
  }

  private static checkSuspiciousPatterns(restaurant: Restaurant, issues: ValidationIssue[]) {
    // Check name for suspicious patterns
    if (restaurant.name) {
      for (const pattern of this.SUSPICIOUS_PATTERNS) {
        if (pattern.test(restaurant.name)) {
          issues.push({
            field: 'name',
            severity: 'error',
            message: 'Restaurant name appears to be placeholder or test data',
            code: 'SUSPICIOUS_NAME_PATTERN'
          })
          break
        }
      }
    }

    // Check for duplicate names in common patterns
    if (restaurant.name && /^(.+)\s+\1$/i.test(restaurant.name)) {
      issues.push({
        field: 'name',
        severity: 'error',
        message: 'Restaurant name contains suspicious repetition',
        code: 'DUPLICATE_NAME_PATTERN'
      })
    }
  }

  private static validateBusinessLogic(
    restaurant: Restaurant,
    issues: ValidationIssue[],
    warnings: ValidationIssue[]
  ) {
    // High rating with low review count is suspicious
    if (restaurant.rating && restaurant.reviewCount) {
      if (restaurant.rating >= 4.5 && restaurant.reviewCount < 10) {
        warnings.push({
          field: 'rating',
          severity: 'warning',
          message: 'High rating with very few reviews may be unreliable',
          code: 'SUSPICIOUS_RATING_PATTERN'
        })
      }
    }

    // Very high price level should have appropriate features
    if (restaurant.priceLevel && restaurant.priceLevel >= 4) {
      if (!restaurant.website) {
        warnings.push({
          field: 'website',
          severity: 'warning',
          message: 'High-end restaurants typically have websites',
          code: 'MISSING_EXPECTED_FEATURE'
        })
      }
    }

    // Check match between price level and ambiance
    if (restaurant.priceLevel && restaurant.ambiance) {
      const lowPriceHighEndAmbiance = restaurant.priceLevel <= 2 && 
        (restaurant.ambiance.toLowerCase().includes('upscale') || 
         restaurant.ambiance.toLowerCase().includes('elegant'))
      
      const highPriceCasualAmbiance = restaurant.priceLevel >= 4 && 
        restaurant.ambiance.toLowerCase().includes('casual')

      if (lowPriceHighEndAmbiance || highPriceCasualAmbiance) {
        warnings.push({
          field: 'ambiance',
          severity: 'warning',
          message: 'Price level and ambiance description may be inconsistent',
          code: 'INCONSISTENT_PRICE_AMBIANCE'
        })
      }
    }
  }

  private static validateLocationRelevance(
    restaurant: Restaurant,
    searchLocation: LocationData,
    warnings: ValidationIssue[]
  ) {
    // Check if restaurant address contains location info
    if (restaurant.address && searchLocation.city) {
      const addressLower = restaurant.address.toLowerCase()
      const cityLower = searchLocation.city.toLowerCase()
      
      if (!addressLower.includes(cityLower)) {
        warnings.push({
          field: 'address',
          severity: 'warning',
          message: `Restaurant address may not be in search city (${searchLocation.city})`,
          code: 'LOCATION_MISMATCH'
        })
      }
    }

    // Check distance reasonableness
    if (restaurant.distance && restaurant.distance !== "Unknown") {
      const distance = parseFloat(restaurant.distance.replace(' mi', ''))
      if (distance > 25) {
        warnings.push({
          field: 'distance',
          severity: 'warning',
          message: 'Restaurant is unusually far from search location',
          code: 'EXCESSIVE_DISTANCE'
        })
      }
    }
  }

  private static validateQueryRelevance(
    restaurant: Restaurant,
    searchQuery: string,
    warnings: ValidationIssue[],
    suggestions: string[]
  ) {
    const queryLower = searchQuery.toLowerCase()
    const nameLower = restaurant.name.toLowerCase()
    const cuisineLower = restaurant.cuisine.toLowerCase()

    // Check if restaurant matches query terms
    const matchesName = queryLower.includes(nameLower) || nameLower.includes(queryLower)
    const matchesCuisine = queryLower.includes(cuisineLower) || cuisineLower.includes(queryLower)
    
    if (!matchesName && !matchesCuisine) {
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2)
      const hasAnyMatch = queryWords.some(word => 
        nameLower.includes(word) || cuisineLower.includes(word) ||
        restaurant.description?.toLowerCase().includes(word)
      )

      if (!hasAnyMatch) {
        warnings.push({
          field: 'relevance',
          severity: 'warning',
          message: 'Restaurant may not be relevant to search query',
          code: 'LOW_QUERY_RELEVANCE'
        })
        
        suggestions.push(`Consider restaurants more closely matching "${searchQuery}"`)
      }
    }
  }

  private static calculateQualityScore(
    restaurant: Restaurant,
    issues: ValidationIssue[],
    warnings: ValidationIssue[]
  ): number {
    let score = 100

    // Deduct for errors (severe)
    score -= issues.length * 20

    // Deduct for warnings (moderate)
    score -= warnings.length * 5

    // Completeness bonus
    const completenessScore = this.calculateCompleteness(restaurant)
    score += (completenessScore - 50) * 0.3

    // Rating quality bonus
    if (restaurant.rating && restaurant.reviewCount) {
      if (restaurant.rating >= 4.0 && restaurant.reviewCount >= 50) {
        score += 10
      } else if (restaurant.rating >= 3.5 && restaurant.reviewCount >= 20) {
        score += 5
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  private static calculateCompleteness(restaurant: Restaurant): number {
    let score = 0
    let maxScore = 0

    // Required fields (30 points each)
    this.REQUIRED_FIELDS.forEach(field => {
      maxScore += 30
      const value = restaurant[field as keyof Restaurant]
      if (value && (typeof value !== 'string' || value.trim().length > 0)) {
        score += 30
      }
    })

    // Optional fields (10 points each)
    this.OPTIONAL_FIELDS.forEach(field => {
      maxScore += 10
      const value = restaurant[field as keyof Restaurant]
      if (value && (typeof value !== 'string' || value.trim().length > 0)) {
        score += 10
      }
    })

    // Special fields (5 points each)
    const specialFields = ['specialties', 'dietaryOptions', 'bestFor']
    specialFields.forEach(field => {
      maxScore += 5
      const value = restaurant[field as keyof Restaurant]
      if (Array.isArray(value) && value.length > 0) {
        score += 5
      }
    })

    return maxScore > 0 ? (score / maxScore) * 100 : 0
  }

  private static calculateAccuracy(restaurant: Restaurant): number {
    let score = 100

    // Check for data consistency issues
    if (restaurant.rating && restaurant.rating > 5) score -= 20
    if (restaurant.priceLevel && restaurant.priceLevel > 5) score -= 20
    if (restaurant.reviewCount && restaurant.reviewCount < 0) score -= 20

    // Check for reasonable ranges
    if (restaurant.rating && restaurant.reviewCount) {
      if (restaurant.rating > 4.8 && restaurant.reviewCount < 5) score -= 15
      if (restaurant.rating < 2.0 && restaurant.reviewCount > 1000) score -= 10
    }

    return Math.max(0, score)
  }

  private static calculateRelevance(restaurant: Restaurant): number {
    // Base relevance score
    let score = 70

    // Boost for having match reasons
    if (restaurant.matchReasons && restaurant.matchReasons.length > 0) {
      score += 20
    }

    // Boost for high match score
    if (restaurant.matchScore) {
      score += (restaurant.matchScore - 50) * 0.6
    }

    return Math.max(0, Math.min(100, score))
  }

  private static calculateFreshness(restaurant: Restaurant): number {
    // Since we don't have timestamps, use heuristics
    let score = 75 // Default assumption of moderate freshness

    // Boost for having current-looking data
    if (restaurant.estimatedWaitTime) score += 15
    if (restaurant.hours && restaurant.hours.includes('am')) score += 10

    return Math.min(100, score)
  }
}