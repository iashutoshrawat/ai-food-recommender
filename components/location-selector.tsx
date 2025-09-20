"use client"

import { useState } from "react"
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

  const { location, isLoading, error, hasPermission, getCurrentLocation, searchLocation, formatLocation } =
    useLocation()

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

  const quickLocations = [
    { name: "New York, NY", coords: { latitude: 40.7128, longitude: -74.006 } },
    { name: "Los Angeles, CA", coords: { latitude: 34.0522, longitude: -118.2437 } },
    { name: "Chicago, IL", coords: { latitude: 41.8781, longitude: -87.6298 } },
    { name: "San Francisco, CA", coords: { latitude: 37.7749, longitude: -122.4194 } },
    { name: "Miami, FL", coords: { latitude: 25.7617, longitude: -80.1918 } },
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
          {currentLocation ? formatLocation(currentLocation) : "Set location"}
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
                  />
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
