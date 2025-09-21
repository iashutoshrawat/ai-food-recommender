"use client"

import { useState } from "react"

export interface LocationData {
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface LocationError {
  code: number
  message: string
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<LocationError | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Check if geolocation is supported
  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator

  // Get current location
  const getCurrentLocation = async (): Promise<LocationData | null> => {
    if (!isSupported) {
      setError({ code: -1, message: "Geolocation is not supported by this browser" })
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        })
      })

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }

      // Try to get address from coordinates
      try {
        const addressData = await reverseGeocode(locationData.latitude, locationData.longitude)
        Object.assign(locationData, addressData)
      } catch (geocodeError) {
        console.warn("Reverse geocoding failed:", geocodeError)
      }

      setLocation(locationData)
      setHasPermission(true)
      return locationData
    } catch (err: any) {
      const locationError: LocationError = {
        code: err.code || -1,
        message: getLocationErrorMessage(err.code || -1),
      }
      setError(locationError)
      setHasPermission(false)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Search for location by address
  const searchLocation = async (address: string): Promise<LocationData | null> => {
    if (!address.trim()) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to geocode address")
      }

      const locationData = await response.json()
      setLocation(locationData)
      return locationData
    } catch (err) {
      setError({
        code: -1,
        message: err instanceof Error ? err.message : "Failed to search location",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Get address suggestions for autocomplete (new function)
  const getAddressSuggestions = async (query: string): Promise<LocationData[]> => {
    if (!query.trim() || query.length < 3) return []

    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        return []
      }

      const result = await response.json()
      
      // If single result, return as array
      if (result.latitude && result.longitude) {
        return [result]
      }
      
      // If multiple results, return as is
      if (Array.isArray(result)) {
        return result
      }
      
      return []
    } catch (error) {
      console.warn("Failed to get address suggestions:", error)
      return []
    }
  }

  // Search for nearby places (new function)
  const searchNearbyPlaces = async (
    lat: number, 
    lng: number, 
    category?: string
  ): Promise<LocationData[]> => {
    try {
      // For now, use the geocoding API with nearby search
      // This could be enhanced with a dedicated places API endpoint
      const response = await fetch(
        `/api/geocode?address=restaurants near ${lat},${lng}`
      )
      
      if (!response.ok) {
        return []
      }

      const result = await response.json()
      return Array.isArray(result) ? result : [result]
    } catch (error) {
      console.warn("Failed to search nearby places:", error)
      return []
    }
  }

  // Clear location data
  const clearLocation = () => {
    setLocation(null)
    setError(null)
    setHasPermission(null)
  }

  // Format location for display
  const formatLocation = (loc: LocationData): string => {
    if (loc.address) return loc.address
    if (loc.city && loc.state) return `${loc.city}, ${loc.state}`
    if (loc.city) return loc.city
    return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
  }

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  return {
    location,
    isLoading,
    error,
    hasPermission,
    isSupported,
    getCurrentLocation,
    searchLocation,
    getAddressSuggestions,
    searchNearbyPlaces,
    clearLocation,
    formatLocation,
    calculateDistance,
  }
}

// Helper function to reverse geocode coordinates
async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn("Reverse geocoding failed:", error)
  }
  return {}
}

// Helper function to get user-friendly error messages
function getLocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location access denied. Please enable location permissions."
    case 2:
      return "Location unavailable. Please check your connection."
    case 3:
      return "Location request timed out. Please try again."
    default:
      return "Unable to get your location. Please try again."
  }
}
