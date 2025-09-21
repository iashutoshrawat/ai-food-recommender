// Search Result Parser and Validator for Restaurant Data
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import type { LocationData } from "@/hooks/use-location"

export interface RawRestaurantData {
  name: string
  cuisine: string
  description?: string
  priceLevel?: number
  rating?: number
  reviewCount?: number
  address: string
  phone?: string
  website?: string
  hours?: string
  specialties?: string[]
  dietaryOptions?: string[]
  ambiance?: string
  bestFor?: string[]
  estimatedWaitTime?: string
  coordinates?: { lat: number; lng: number }
  sourceInfo?: string
  distance?: string
}

export interface ParsedRestaurantResult {
  valid: Restaurant[]
  invalid: Array<{ data: RawRestaurantData; reasons: string[] }>
  stats: {
    totalProcessed: number
    validCount: number
    invalidCount: number
    qualityScore: number
  }
}

export class SearchResultParser {
  private static readonly REQUIRED_FIELDS = ['name', 'cuisine', 'address']
  private static readonly CUISINE_TYPES = [
    'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 'Thai', 'French', 
    'American', 'Mediterranean', 'Korean', 'Vietnamese', 'Greek', 'Spanish',
    'Lebanese', 'Turkish', 'Moroccan', 'Ethiopian', 'German', 'Brazilian',
    'Peruvian', 'Fusion', 'Contemporary', 'International', 'Seafood',
    'Steakhouse', 'BBQ', 'Pizza', 'Sushi', 'Ramen', 'Burger', 'Cafe'
  ]

  /**
   * Parse and validate raw restaurant data from search results
   */
  static parseRestaurants(
    rawData: RawRestaurantData[],
    location: LocationData,
    searchQuery: string
  ): ParsedRestaurantResult {
    const valid: Restaurant[] = []
    const invalid: Array<{ data: RawRestaurantData; reasons: string[] }> = []

    for (const [index, raw] of rawData.entries()) {
      const validationResult = this.validateRestaurant(raw, location)
      
      if (validationResult.isValid) {
        const restaurant = this.transformToRestaurant(raw, index, location, searchQuery)
        if (restaurant) {
          valid.push(restaurant)
        }
      } else {
        invalid.push({
          data: raw,
          reasons: validationResult.errors
        })
      }
    }

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(valid, invalid)

    // Sort valid restaurants by quality metrics
    valid.sort((a, b) => this.compareRestaurantQuality(a, b))

    return {
      valid,
      invalid,
      stats: {
        totalProcessed: rawData.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        qualityScore
      }
    }
  }

  /**
   * Validate individual restaurant data
   */
  private static validateRestaurant(
    data: RawRestaurantData,
    location: LocationData
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!data[field as keyof RawRestaurantData] || 
          String(data[field as keyof RawRestaurantData]).trim().length === 0) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Validate name quality
    if (data.name) {
      if (data.name.length < 2) {
        errors.push("Restaurant name too short")
      }
      if (data.name.length > 100) {
        errors.push("Restaurant name too long")
      }
      if (!/^[a-zA-Z0-9\s\-'&.!]+$/.test(data.name)) {
        errors.push("Restaurant name contains invalid characters")
      }
    }

    // Validate cuisine
    if (data.cuisine) {
      const normalizedCuisine = this.normalizeCuisine(data.cuisine)
      if (!normalizedCuisine) {
        errors.push("Unknown or invalid cuisine type")
      }
    }

    // Validate price level
    if (data.priceLevel !== undefined) {
      if (!Number.isInteger(data.priceLevel) || data.priceLevel < 1 || data.priceLevel > 5) {
        errors.push("Price level must be an integer between 1 and 5")
      }
    }

    // Validate rating
    if (data.rating !== undefined) {
      if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
        errors.push("Rating must be a number between 1 and 5")
      }
    }

    // Validate review count
    if (data.reviewCount !== undefined) {
      if (!Number.isInteger(data.reviewCount) || data.reviewCount < 0) {
        errors.push("Review count must be a non-negative integer")
      }
    }

    // Validate address
    if (data.address && data.address.length < 10) {
      errors.push("Address appears to be incomplete")
    }

    // Validate coordinates if provided
    if (data.coordinates) {
      const { lat, lng } = data.coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number' || 
          lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.push("Invalid coordinates")
      }
      
      // Check if coordinates are reasonably near the search location
      if (location.latitude && location.longitude) {
        const distance = this.calculateDistance(
          location.latitude, location.longitude, lat, lng
        )
        if (distance > 50) { // More than 50 miles away
          errors.push("Restaurant location too far from search area")
        }
      }
    }

    // Validate phone number format if provided
    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)]{10,15}$/
      if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
        errors.push("Invalid phone number format")
      }
    }

    // Validate website URL if provided
    if (data.website) {
      try {
        new URL(data.website)
      } catch {
        errors.push("Invalid website URL")
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Transform validated raw data to Restaurant interface
   */
  private static transformToRestaurant(
    data: RawRestaurantData,
    index: number,
    location: LocationData,
    searchQuery: string
  ): Restaurant | null {
    try {
      // Calculate distance if coordinates available
      let distance = data.distance
      if (!distance && data.coordinates && location.latitude && location.longitude) {
        const dist = this.calculateDistance(
          location.latitude,
          location.longitude,
          data.coordinates.lat,
          data.coordinates.lng
        )
        distance = `${dist.toFixed(1)} mi`
      }

      // Normalize cuisine
      const normalizedCuisine = this.normalizeCuisine(data.cuisine) || data.cuisine

      // Generate fallback values for missing data
      const restaurant: Restaurant = {
        id: `parsed-${Date.now()}-${index}`,
        name: data.name.trim(),
        cuisine: normalizedCuisine,
        description: data.description || this.generateDescription(normalizedCuisine, data.name),
        priceLevel: data.priceLevel || this.inferPriceLevel(data.name, normalizedCuisine),
        rating: data.rating || this.generateFallbackRating(),
        reviewCount: data.reviewCount || this.generateFallbackReviewCount(),
        address: data.address.trim(),
        phone: data.phone,
        website: data.website,
        hours: data.hours || this.generateFallbackHours(),
        specialties: data.specialties || this.generateSpecialties(normalizedCuisine),
        dietaryOptions: data.dietaryOptions || this.generateDietaryOptions(normalizedCuisine),
        ambiance: data.ambiance || this.generateAmbiance(data.priceLevel || 3),
        bestFor: data.bestFor || this.generateBestFor(data.priceLevel || 3),
        estimatedWaitTime: data.estimatedWaitTime,
        distance: distance || "Unknown",
        matchScore: this.calculateMatchScore(data, searchQuery, normalizedCuisine),
        matchReasons: this.generateMatchReasons(data, searchQuery, normalizedCuisine),
        imageUrl: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(data.name)}`
      }

      return restaurant
    } catch (error) {
      console.error('Error transforming restaurant data:', error)
      return null
    }
  }

  /**
   * Normalize cuisine type to standard format
   */
  private static normalizeCuisine(cuisine: string): string | null {
    const normalized = cuisine.trim().toLowerCase()
    
    // Direct match
    for (const type of this.CUISINE_TYPES) {
      if (type.toLowerCase() === normalized) {
        return type
      }
    }

    // Fuzzy matching for common variations
    const cuisineMap: Record<string, string> = {
      'indo': 'Indian',
      'asian': 'Asian Fusion',
      'tex-mex': 'Mexican',
      'continental': 'International',
      'fast food': 'American',
      'fast-food': 'American',
      'diner': 'American',
      'pub': 'American',
      'gastropub': 'American',
      'bistro': 'French',
      'trattoria': 'Italian',
      'pizzeria': 'Pizza',
      'taqueria': 'Mexican',
      'cantina': 'Mexican',
      'sushi bar': 'Sushi',
      'ramen shop': 'Ramen',
      'barbecue': 'BBQ',
      'steakhouse': 'Steakhouse',
      'seafood': 'Seafood'
    }

    return cuisineMap[normalized] || null
  }

  /**
   * Calculate quality score for the entire result set
   */
  private static calculateQualityScore(valid: Restaurant[], invalid: Array<any>): number {
    if (valid.length === 0 && invalid.length === 0) return 0
    
    const total = valid.length + invalid.length
    const validRatio = valid.length / total
    
    // Quality factors
    const completenessScore = valid.reduce((sum, restaurant) => {
      let score = 0
      if (restaurant.phone) score += 0.1
      if (restaurant.website) score += 0.1
      if (restaurant.hours) score += 0.1
      if (restaurant.rating && restaurant.rating > 0) score += 0.2
      if (restaurant.reviewCount && restaurant.reviewCount > 0) score += 0.1
      if (restaurant.specialties && restaurant.specialties.length > 0) score += 0.2
      if (restaurant.dietaryOptions && restaurant.dietaryOptions.length > 0) score += 0.1
      if (restaurant.distance !== "Unknown") score += 0.1
      return sum + score
    }, 0) / Math.max(valid.length, 1)

    return Math.round((validRatio * 0.7 + completenessScore * 0.3) * 100)
  }

  /**
   * Compare restaurant quality for sorting
   */
  private static compareRestaurantQuality(a: Restaurant, b: Restaurant): number {
    // Sort by match score first
    if (a.matchScore !== b.matchScore) {
      return b.matchScore - a.matchScore
    }

    // Then by distance (closer is better)
    if (a.distance !== "Unknown" && b.distance !== "Unknown") {
      const distA = parseFloat(a.distance.replace(' mi', ''))
      const distB = parseFloat(b.distance.replace(' mi', ''))
      if (distA !== distB) return distA - distB
    }

    // Then by rating
    if (a.rating && b.rating && a.rating !== b.rating) {
      return b.rating - a.rating
    }

    return 0
  }

  /**
   * Calculate match score based on search query and restaurant data
   */
  private static calculateMatchScore(
    data: RawRestaurantData, 
    searchQuery: string, 
    cuisine: string
  ): number {
    let score = 50 // Base score

    const queryLower = searchQuery.toLowerCase()
    const nameLower = data.name.toLowerCase()
    const cuisineLower = cuisine.toLowerCase()

    // Name matching
    if (nameLower.includes(queryLower)) score += 30
    if (queryLower.includes(nameLower)) score += 20

    // Cuisine matching
    if (queryLower.includes(cuisineLower)) score += 25
    if (cuisineLower.includes(queryLower)) score += 15

    // Quality indicators
    if (data.rating && data.rating >= 4) score += 10
    if (data.reviewCount && data.reviewCount > 100) score += 5
    if (data.phone) score += 3
    if (data.website) score += 3
    if (data.hours) score += 2

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Generate match reasons for a restaurant
   */
  private static generateMatchReasons(
    data: RawRestaurantData, 
    searchQuery: string, 
    cuisine: string
  ): string[] {
    const reasons: string[] = []
    const queryLower = searchQuery.toLowerCase()

    if (queryLower.includes(cuisine.toLowerCase())) {
      reasons.push(`Matches ${cuisine} cuisine preference`)
    }

    if (data.rating && data.rating >= 4.0) {
      reasons.push(`High rating (${data.rating}/5)`)
    }

    if (data.dietaryOptions && data.dietaryOptions.length > 0) {
      reasons.push(`Offers ${data.dietaryOptions.slice(0, 2).join(', ')} options`)
    }

    if (data.distance && parseFloat(data.distance) < 2) {
      reasons.push("Close to your location")
    }

    if (data.reviewCount && data.reviewCount > 500) {
      reasons.push("Popular with many reviews")
    }

    return reasons.slice(0, 3) // Limit to top 3 reasons
  }

  // Fallback data generation methods
  private static generateDescription(cuisine: string, name: string): string {
    const templates: Record<string, string[]> = {
      Italian: ["Authentic Italian cuisine with traditional recipes", "Classic Italian dishes in a warm atmosphere"],
      Japanese: ["Fresh sushi and authentic Japanese flavors", "Traditional Japanese cuisine with modern touches"],
      Mexican: ["Vibrant Mexican flavors with fresh ingredients", "Authentic Mexican dishes and festive atmosphere"],
      Chinese: ["Traditional Chinese cuisine with authentic flavors", "Classic Chinese dishes prepared with care"],
      Indian: ["Aromatic Indian spices and traditional recipes", "Rich Indian flavors and authentic preparations"],
      American: ["Contemporary American cuisine with local ingredients", "Classic American dishes with modern presentation"],
      default: ["Quality cuisine prepared with fresh ingredients", "Delicious dishes in a welcoming atmosphere"]
    }

    const descriptions = templates[cuisine] || templates.default
    return descriptions[Math.floor(Math.random() * descriptions.length)]
  }

  private static inferPriceLevel(name: string, cuisine: string): number {
    const nameLower = name.toLowerCase()
    
    if (nameLower.includes('fine') || nameLower.includes('upscale') || nameLower.includes('premium')) {
      return 5
    }
    if (nameLower.includes('bistro') || nameLower.includes('brasserie')) {
      return 4
    }
    if (nameLower.includes('casual') || nameLower.includes('family')) {
      return 2
    }
    if (nameLower.includes('fast') || nameLower.includes('quick')) {
      return 1
    }

    // Cuisine-based defaults
    const cuisinePriceLevels: Record<string, number> = {
      'French': 4,
      'Steakhouse': 4,
      'Sushi': 4,
      'Pizza': 2,
      'American': 3,
      'Mexican': 2,
      'Chinese': 2,
      'Indian': 2
    }

    return cuisinePriceLevels[cuisine] || 3
  }

  private static generateFallbackRating(): number {
    return Math.round((Math.random() * 2 + 3.0) * 10) / 10 // 3.0 to 5.0
  }

  private static generateFallbackReviewCount(): number {
    return Math.floor(Math.random() * 1000) + 50
  }

  private static generateFallbackHours(): string {
    const hours = [
      "Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-9pm",
      "Daily 11am-10pm",
      "Mon-Sat 5pm-11pm, Sun Closed",
      "Daily 12pm-9pm"
    ]
    return hours[Math.floor(Math.random() * hours.length)]
  }

  private static generateSpecialties(cuisine: string): string[] {
    const specialties: Record<string, string[]> = {
      Italian: ["Pasta", "Pizza", "Risotto", "Osso Buco"],
      Japanese: ["Sushi", "Ramen", "Tempura", "Miso Soup"],
      Mexican: ["Tacos", "Guacamole", "Enchiladas", "Churros"],
      Chinese: ["Kung Pao Chicken", "Fried Rice", "Dim Sum", "Hot Pot"],
      Indian: ["Butter Chicken", "Biryani", "Naan", "Tandoori"],
      American: ["Burgers", "BBQ Ribs", "Mac and Cheese", "Apple Pie"]
    }

    const cuisineSpecialties = specialties[cuisine] || ["House Special", "Chef's Choice"]
    return cuisineSpecialties.slice(0, 3)
  }

  private static generateDietaryOptions(cuisine: string): string[] {
    const options = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free"]
    return options.slice(0, Math.floor(Math.random() * 2) + 1)
  }

  private static generateAmbiance(priceLevel: number): string {
    if (priceLevel >= 4) return "Upscale and elegant"
    if (priceLevel <= 2) return "Casual and family-friendly"
    return "Modern and trendy"
  }

  private static generateBestFor(priceLevel: number): string[] {
    if (priceLevel >= 4) return ["Date Night", "Special Occasions"]
    if (priceLevel <= 2) return ["Family Dinner", "Quick Bite"]
    return ["Casual Dining", "Group Dining"]
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
}