"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react"
import { useLocation, type LocationData } from "@/hooks/use-location"

interface LocationSelectorProps {
  onLocationSelect: (location: LocationData) => void
  currentLocation?: LocationData | null
  className?: string
}

export default function LocationSelector({ onLocationSelect, currentLocation, className }: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationData[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { location, isLoading, error, hasPermission, getCurrentLocation, searchLocation, formatLocation } =
    useLocation()

  // Validate and format the current location
  const getDisplayLocation = (loc: LocationData | null | undefined): string => {
    if (!loc) return "Set location"
    try {
      return formatLocation(loc)
    } catch (error) {
      console.warn("Error formatting location:", error)
      return "Set location"
    }
  }

  const handleCurrentLocation = async () => {
    const loc = await getCurrentLocation()
    if (loc) {
      onLocationSelect(loc)
      setIsExpanded(false)
    }
  }

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return

    const loc = await searchLocation(searchQuery)
    if (loc) {
      onLocationSelect(loc)
      setSearchQuery("")
      setIsExpanded(false)
    }
  }

  const handleQuickLocation = (locationName: string, coords: { latitude: number; longitude: number }) => {
    const quickLocation: LocationData = {
      ...coords,
      address: locationName,
      city: locationName.split(",")[0],
    }
    onLocationSelect(quickLocation)
    setIsExpanded(false)
  }

  // Debounced autocomplete search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await fetchSuggestions(searchQuery)
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) return

    setSuggestionLoading(true)
    try {
      const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.results || [])
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setSuggestionLoading(false)
    }
  }

  const handleSuggestionSelect = (suggestion: LocationData) => {
    onLocationSelect(suggestion)
    setSearchQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    setIsExpanded(false)
  }

  const quickLocations = [
    // International cities prioritized
    { name: "Delhi, India", coords: { latitude: 28.7041, longitude: 77.1025 } },
    { name: "Mumbai, India", coords: { latitude: 19.0760, longitude: 72.8777 } },
    { name: "London, UK", coords: { latitude: 51.5074, longitude: -0.1278 } },
    { name: "Paris, France", coords: { latitude: 48.8566, longitude: 2.3522 } },
    { name: "Tokyo, Japan", coords: { latitude: 35.6762, longitude: 139.6503 } },
    { name: "New York, NY", coords: { latitude: 40.7128, longitude: -74.006 } },
    { name: "Los Angeles, CA", coords: { latitude: 34.0522, longitude: -118.2437 } },
    { name: "Singapore", coords: { latitude: 1.3521, longitude: 103.8198 } },
  ]

  return (
    <div className={className}>
      {!isExpanded ? (
        <Button
          variant="outline"
          className="glass-effect border-white/30 text-foreground hover:bg-white/20 w-full justify-start bg-transparent"
          onClick={() => setIsExpanded(true)}
        >
          <MapPin className="w-4 h-4 mr-2" />
          {getDisplayLocation(currentLocation)}
        </Button>
      ) : (
        <Card className="glass-effect border-white/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Choose Location</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Current Location Button */}
            <Button
              variant="outline"
              className="w-full justify-start glass-effect border-white/30 bg-transparent hover:bg-white/20"
              onClick={handleCurrentLocation}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
              Use Current Location
            </Button>

            {/* Location Permission Error */}
            {error && (
              <div className="text-sm text-red-300 bg-red-500/20 p-2 rounded border border-red-500/30 font-medium">
                {error.message}
              </div>
            )}

            {/* Search Location */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search city or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/70 border-white/30 text-foreground"
                    onKeyPress={(e) => e.key === "Enter" && handleSearchLocation()}
                    onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking
                      setTimeout(() => setShowSuggestions(false), 150)
                    }}
                  />
                  {suggestionLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  
                  {/* Autocomplete Suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background/95 border border-white/30 rounded-md shadow-lg max-h-48 overflow-y-auto backdrop-blur-sm">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                          className="px-3 py-2 cursor-pointer hover:bg-white/10 text-foreground text-sm border-b border-white/10 last:border-b-0"
                          onClick={() => handleSuggestionSelect(suggestion)}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <div>
                              <div className="font-medium">{suggestion.city}</div>
                              <div className="text-xs text-muted-foreground">{suggestion.address}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSearchLocation}
                  disabled={!searchQuery.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
              </div>
            </div>

            {/* Quick Locations */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Popular locations:</p>
              <div className="flex flex-wrap gap-2">
                {quickLocations.map((loc) => (
                  <Badge
                    key={loc.name}
                    variant="outline"
                    className="cursor-pointer border-white/30 text-foreground hover:bg-white/20 transition-colors bg-white/5"
                    onClick={() => handleQuickLocation(loc.name, loc.coords)}
                  >
                    {loc.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
