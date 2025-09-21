"use client"

import { useState, useEffect } from "react"
import type { LocationData } from "@/hooks/use-location"

const LOCATION_STORAGE_KEY = "savora-selected-location"

export function useLocationPersistence() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load location from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY)
      if (saved) {
        const parsedLocation = JSON.parse(saved)
        setSelectedLocation(parsedLocation)
      }
    } catch (error) {
      console.warn("Failed to load saved location:", error)
    }
    setIsLoaded(true)
  }, [])

  // Save location to localStorage when it changes
  const persistLocation = (location: LocationData | null) => {
    setSelectedLocation(location)
    try {
      if (location) {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
      } else {
        localStorage.removeItem(LOCATION_STORAGE_KEY)
      }
    } catch (error) {
      console.warn("Failed to save location:", error)
    }
  }

  // Parse location from URL parameters
  const parseLocationFromUrl = (searchParams: URLSearchParams): LocationData | null => {
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const address = searchParams.get("address")
    const city = searchParams.get("city")

    if (lat && lng) {
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        address: address || undefined,
        city: city || undefined,
      }
    }
    return null
  }

  // Convert location to URL parameters
  const locationToUrlParams = (location: LocationData): URLSearchParams => {
    const params = new URLSearchParams()
    params.set("lat", location.latitude.toString())
    params.set("lng", location.longitude.toString())
    if (location.address) params.set("address", location.address)
    if (location.city) params.set("city", location.city)
    return params
  }

  return {
    selectedLocation,
    setSelectedLocation: persistLocation,
    isLoaded,
    parseLocationFromUrl,
    locationToUrlParams,
  }
}