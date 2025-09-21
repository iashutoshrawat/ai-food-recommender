// Type definitions for the enhanced restaurant search system
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import type { LocationData } from "@/hooks/use-location"

// Enhanced Restaurant type with metadata
export interface EnhancedRestaurant extends Restaurant {
  _metadata?: {
    isRealRestaurant: boolean
    dataSource: 'real_and_ai_enhanced' | 'ai_generated' | 'fallback'
    usedFallback: boolean
    qualityScore?: number
    searchConfidence?: number
  }
}

// Search metadata types
export interface SearchMetadata {
  query: string
  location: string
  totalFound: number
  searchTimestamp: string
  confidence: number
  usedFallback?: boolean
  qualityStats?: {
    totalProcessed: number
    validCount: number
    invalidCount: number
    qualityScore: number
  }
  validationStats?: {
    totalCount: number
    validCount: number
    invalidCount: number
    averageScore: number
    qualityDistribution: Record<string, number>
  }
  errorInfo?: {
    type: string
    message: string
    fallbackStrategy: string
  }
}

// Enhanced search summary with context
export interface EnhancedSearchSummary {
  query: string
  totalResults: number
  averagePrice: number
  topCuisines: string[]
  personalizedNote: string
  dataSource?: 'real_and_ai_enhanced' | 'ai_generated' | 'fallback'
  realRestaurantsAnalyzed?: number
  enhancementNote?: string
  searchContext?: {
    realRestaurantsFound: number
    usedWebSearch: boolean
    usedFallback: boolean
    searchRadius: number
    enhancementNote: string
  }
}

// Search request parameters
export interface RestaurantSearchRequest {
  query: string
  location: LocationData
  radius?: number
  priceRange?: number[]
  cuisine?: string
  dietaryRestrictions?: string[]
  maxResults?: number
}

// Search response format
export interface RestaurantSearchResponse {
  restaurants: EnhancedRestaurant[]
  totalResults: number
  searchMetadata: SearchMetadata
  searchParams: RestaurantSearchRequest
  cached: boolean
}

// Recommendation request format
export interface RecommendationRequest {
  query: string
  preferences: {
    cuisines: string[]
    spiceLevel: number
    dietaryRestrictions: string[]
    priceRange: number[]
    mealTiming: string[]
    diningStyle: string[]
    favoriteIngredients: string[]
    dislikedIngredients: string[]
  }
  location: {
    address: string
    city?: string
    state?: string
    country?: string
    coordinates: { lat: number; lng: number }
  }
  behavior: {
    searchHistory: string[]
    favoriteRestaurants: any[]
    rejectedSuggestions: any[]
    ratedRestaurants: any[]
  }
  realRestaurants?: any[]
}

// Quality assessment types
export interface RestaurantQuality {
  score: number
  completeness: number
  accuracy: number
  relevance: number
  freshness: number
  issues: Array<{
    field: string
    severity: 'error' | 'warning' | 'info'
    message: string
  }>
}

// Search performance metrics
export interface SearchPerformanceMetrics {
  searchDuration: number
  apiCallsUsed: number
  cacheHitRate: number
  qualityScore: number
  dataSource: 'web_search' | 'fallback' | 'cache'
  restaurantsFound: number
  restaurantsReturned: number
}

// Error handling types
export interface SearchErrorInfo {
  type: 'network' | 'api_limit' | 'validation' | 'timeout' | 'unknown'
  message: string
  retryable: boolean
  suggestions: string[]
  fallbackAvailable: boolean
}

// Cache-related types
export interface CacheKeyParams {
  query: string
  location: LocationData
  cuisine?: string
  dietaryRestrictions?: string[]
  priceRange?: number[]
  radius?: number
}

export interface CacheEntry {
  restaurants: EnhancedRestaurant[]
  searchMetadata: SearchMetadata
  timestamp: number
  expiresAt: number
  hitCount: number
}

// Analytics and monitoring types
export interface SearchAnalytics {
  sessionId: string
  userId?: string
  searchQuery: string
  location: LocationData
  timestamp: number
  results: {
    totalFound: number
    dataSource: string
    qualityScore: number
    userSatisfaction?: number
  }
  performance: SearchPerformanceMetrics
  userInteractions?: {
    viewedRestaurants: string[]
    clickedRestaurants: string[]
    savedRestaurants: string[]
    rejectedRestaurants: string[]
  }
}

// Feature flags for search behavior
export interface SearchFeatureFlags {
  enableWebSearch: boolean
  enableCaching: boolean
  enableFallback: boolean
  enableValidation: boolean
  enableAnalytics: boolean
  maxSearchResults: number
  searchTimeoutMs: number
  cacheExpirationMs: number
  qualityThreshold: number
}

// Utility types for type checking
export type SearchDataSource = 'web_search' | 'ai_generated' | 'fallback' | 'cache'
export type SearchStatus = 'idle' | 'searching' | 'success' | 'error' | 'fallback'
export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor'