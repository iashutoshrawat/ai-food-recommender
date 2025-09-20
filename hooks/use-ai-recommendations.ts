"use client"

import { useState } from "react"
import { usePreferences } from "./use-preferences"
import type { LocationData } from "./use-location"

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  description: string
  priceLevel: number
  rating: number
  reviewCount: number
  address: string
  phone?: string
  website?: string
  hours?: string
  specialties: string[]
  dietaryOptions: string[]
  ambiance: string
  bestFor: string[]
  estimatedWaitTime?: string
  distance: string
  matchScore: number
  matchReasons: string[]
  imageUrl?: string
}

export interface SearchSummary {
  query: string
  totalResults: number
  averagePrice: number
  topCuisines: string[]
  personalizedNote: string
}

export interface RecommendationResult {
  recommendations: Restaurant[]
  searchSummary: SearchSummary
}

export function useAIRecommendations() {
  const [recommendations, setRecommendations] = useState<Restaurant[]>([])
  const [searchSummary, setSearchSummary] = useState<SearchSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personalizationExplanation, setPersonalizationExplanation] = useState<string>("")

  const { preferences, behavior, trackSearch } = usePreferences()

  const getRecommendations = async (query: string, location?: LocationData) => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Track the search
      trackSearch(query)

      // First, search for real restaurants if location is provided
      let realRestaurants: any[] = []
      if (location) {
        try {
          const restaurantResponse = await fetch("/api/restaurants/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: query.trim(),
              location,
              radius: 10, // 10 mile radius
              priceRange: preferences.priceRange,
              cuisine: preferences.cuisines.length > 0 ? preferences.cuisines[0] : undefined,
              dietaryRestrictions: preferences.dietaryRestrictions,
            }),
          })

          if (restaurantResponse.ok) {
            const restaurantData = await restaurantResponse.json()
            realRestaurants = restaurantData.restaurants || []
          }
        } catch (restaurantError) {
          console.warn("Restaurant search failed, falling back to AI generation:", restaurantError)
        }
      }

      // Get AI recommendations (enhanced with real restaurant data if available)
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          preferences,
          location: location
            ? {
                address: location.address || `${location.latitude}, ${location.longitude}`,
                city: location.city,
                state: location.state,
                coordinates: { lat: location.latitude, lng: location.longitude },
              }
            : "Current location",
          behavior,
          realRestaurants, // Include real restaurant data for AI to enhance
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get recommendations")
      }

      const result: RecommendationResult = await response.json()

      // Sort by match score
      const sortedRecommendations = result.recommendations.sort((a, b) => b.matchScore - a.matchScore)

      setRecommendations(sortedRecommendations)
      setSearchSummary(result.searchSummary)

      // Get personalization explanation
      if (sortedRecommendations.length > 0) {
        const personalizationResponse = await fetch("/api/personalize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurants: sortedRecommendations.slice(0, 5),
            preferences,
            behavior,
            context: query,
            location: location ? location.city || location.address : undefined,
          }),
        })

        if (personalizationResponse.ok) {
          const personalizationResult = await personalizationResponse.json()
          setPersonalizationExplanation(personalizationResult.explanation)
        }
      }
    } catch (err) {
      console.error("Recommendation error:", err)
      setError(err instanceof Error ? err.message : "Failed to get recommendations")
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeRestaurantReviews = async (restaurantName: string, reviews: any[]) => {
    try {
      const response = await fetch("/api/analyze-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantName,
          reviews,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze reviews")
      }

      return await response.json()
    } catch (err) {
      console.error("Review analysis error:", err)
      return null
    }
  }

  const clearRecommendations = () => {
    setRecommendations([])
    setSearchSummary(null)
    setPersonalizationExplanation("")
    setError(null)
  }

  return {
    recommendations,
    searchSummary,
    personalizationExplanation,
    isLoading,
    error,
    getRecommendations,
    analyzeRestaurantReviews,
    clearRecommendations,
  }
}
