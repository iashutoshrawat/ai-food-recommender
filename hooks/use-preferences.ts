"use client"

import { useState, useEffect } from "react"

export interface UserPreferences {
  cuisines: string[]
  spiceLevel: number
  dietaryRestrictions: string[]
  priceRange: number[]
  mealTiming: string[]
  diningStyle: string[]
  favoriteIngredients: string[]
  dislikedIngredients: string[]
  lastUpdated: string
}

export interface UserBehavior {
  searchHistory: string[]
  clickedRestaurants: string[]
  ratedRestaurants: { id: string; rating: number; timestamp: string }[]
  favoriteRestaurants: string[]
  rejectedSuggestions: string[]
}

const defaultPreferences: UserPreferences = {
  cuisines: [],
  spiceLevel: 3,
  dietaryRestrictions: [],
  priceRange: [2, 4],
  mealTiming: [],
  diningStyle: [],
  favoriteIngredients: [],
  dislikedIngredients: [],
  lastUpdated: new Date().toISOString(),
}

const defaultBehavior: UserBehavior = {
  searchHistory: [],
  clickedRestaurants: [],
  ratedRestaurants: [],
  favoriteRestaurants: [],
  rejectedSuggestions: [],
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [behavior, setBehavior] = useState<UserBehavior>(defaultBehavior)
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem("savora-preferences")
      const savedBehavior = localStorage.getItem("savora-behavior")

      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences))
      }

      if (savedBehavior) {
        setBehavior(JSON.parse(savedBehavior))
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = (newPreferences: UserPreferences) => {
    const updatedPreferences = {
      ...newPreferences,
      lastUpdated: new Date().toISOString(),
    }

    setPreferences(updatedPreferences)
    localStorage.setItem("savora-preferences", JSON.stringify(updatedPreferences))
  }

  // Track user behavior
  const trackSearch = (query: string) => {
    setBehavior((prev) => {
      const updated = {
        ...prev,
        searchHistory: [query, ...prev.searchHistory.filter((q) => q !== query)].slice(0, 50),
      }
      localStorage.setItem("savora-behavior", JSON.stringify(updated))
      return updated
    })
  }

  const trackRestaurantClick = (restaurantId: string) => {
    setBehavior((prev) => {
      const updated = {
        ...prev,
        clickedRestaurants: [restaurantId, ...prev.clickedRestaurants.filter((id) => id !== restaurantId)].slice(
          0,
          100,
        ),
      }
      localStorage.setItem("savora-behavior", JSON.stringify(updated))
      return updated
    })
  }

  const rateRestaurant = (restaurantId: string, rating: number) => {
    setBehavior((prev) => {
      const updated = {
        ...prev,
        ratedRestaurants: [
          { id: restaurantId, rating, timestamp: new Date().toISOString() },
          ...prev.ratedRestaurants.filter((r) => r.id !== restaurantId),
        ].slice(0, 200),
      }
      localStorage.setItem("savora-behavior", JSON.stringify(updated))
      return updated
    })
  }

  const toggleFavorite = (restaurantId: string) => {
    setBehavior((prev) => {
      const isFavorite = prev.favoriteRestaurants.includes(restaurantId)
      const updated = {
        ...prev,
        favoriteRestaurants: isFavorite
          ? prev.favoriteRestaurants.filter((id) => id !== restaurantId)
          : [...prev.favoriteRestaurants, restaurantId],
      }
      localStorage.setItem("savora-behavior", JSON.stringify(updated))
      return updated
    })
  }

  const rejectSuggestion = (restaurantId: string) => {
    setBehavior((prev) => {
      const updated = {
        ...prev,
        rejectedSuggestions: [restaurantId, ...prev.rejectedSuggestions].slice(0, 100),
      }
      localStorage.setItem("savora-behavior", JSON.stringify(updated))
      return updated
    })
  }

  // Generate preference score for a restaurant
  const calculatePreferenceScore = (restaurant: any): number => {
    let score = 0
    let factors = 0

    // Cuisine matching
    if (preferences.cuisines.length > 0 && restaurant.cuisine) {
      const cuisineMatch = preferences.cuisines.some((cuisine) =>
        restaurant.cuisine.toLowerCase().includes(cuisine.toLowerCase()),
      )
      score += cuisineMatch ? 20 : -5
      factors++
    }

    // Price range matching
    if (restaurant.priceLevel && preferences.priceRange) {
      const [minPrice, maxPrice] = preferences.priceRange
      if (restaurant.priceLevel >= minPrice && restaurant.priceLevel <= maxPrice) {
        score += 15
      } else {
        score -= Math.abs(restaurant.priceLevel - (minPrice + maxPrice) / 2) * 3
      }
      factors++
    }

    // Dietary restrictions
    if (preferences.dietaryRestrictions.length > 0 && restaurant.dietaryOptions) {
      const dietaryMatch = preferences.dietaryRestrictions.some((diet) => restaurant.dietaryOptions.includes(diet))
      score += dietaryMatch ? 10 : -10
      factors++
    }

    // Behavioral factors
    if (behavior.favoriteRestaurants.includes(restaurant.id)) {
      score += 25
    }

    if (behavior.rejectedSuggestions.includes(restaurant.id)) {
      score -= 30
    }

    const previousRating = behavior.ratedRestaurants.find((r) => r.id === restaurant.id)
    if (previousRating) {
      score += (previousRating.rating - 3) * 5 // Scale 1-5 rating to -10 to +10
    }

    return factors > 0 ? score / Math.max(factors, 1) : 0
  }

  return {
    preferences,
    behavior,
    isLoading,
    savePreferences,
    trackSearch,
    trackRestaurantClick,
    rateRestaurant,
    toggleFavorite,
    rejectSuggestion,
    calculatePreferenceScore,
  }
}
