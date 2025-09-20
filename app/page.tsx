"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Search, MapPin, Star, Clock, Settings } from "lucide-react"
import PreferenceModal from "@/components/preference-modal"
import LocationSelector from "@/components/location-selector"
import { usePreferences } from "@/hooks/use-preferences"
import { useAIRecommendations, type Restaurant } from "@/hooks/use-ai-recommendations"
import type { LocationData } from "@/hooks/use-location"
import { useRouter } from "next/navigation"

const foodVideos = [
  {
    id: "pizza",
    title: "Pizza Cheese Pull",
    description: "Melted mozzarella stretching from a perfect slice",
    placeholder: "/close-up-pizza-cheese-pull-melted-mozzarella-st.jpg",
  },
  {
    id: "cake",
    title: "Cake Being Cut",
    description: "Layers revealed as knife glides through frosting",
    placeholder: "/elegant-cake-being-cut-with-knife-layers-visible-c.jpg",
  },
  {
    id: "noodles",
    title: "Noodles in Wok",
    description: "Steam rising as noodles dance in the wok",
    placeholder: "/noodles-being-tossed-in-wok-with-steam-rising-cine.jpg",
  },
]

export default function HomePage() {
  const [currentVideo, setCurrentVideo] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [showPreferences, setShowPreferences] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const router = useRouter()

  const { preferences, behavior, isLoading, savePreferences, trackRestaurantClick } = usePreferences()
  const {
    recommendations,
    searchSummary,
    personalizationExplanation,
    isLoading: isSearching,
    error,
    getRecommendations,
  } = useAIRecommendations()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideo((prev) => (prev + 1) % foodVideos.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isLoading && preferences.cuisines.length === 0 && !localStorage.getItem("savora-preferences-dismissed")) {
      const timer = setTimeout(() => {
        setShowPreferences(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isLoading, preferences.cuisines.length])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
  }

  const handlePreferencesSave = (newPreferences: any) => {
    savePreferences(newPreferences)
    localStorage.setItem("savora-preferences-dismissed", "true")
  }

  const handleRestaurantClick = (restaurant: Restaurant) => {
    trackRestaurantClick(restaurant.id)
    // Here you could navigate to a detailed restaurant page
    console.log("Restaurant clicked:", restaurant)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient Video Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={foodVideos[currentVideo].placeholder || "/placeholder.svg"}
          alt={foodVideos[currentVideo].title}
          className="w-full h-full object-cover transition-opacity duration-1000"
        />
        <div className="absolute inset-0 video-overlay" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <span className="text-foreground font-playfair text-xl font-semibold">savora</span>
        </div>
        <Button
          variant="outline"
          className="glass-effect border-white/30 text-foreground hover:bg-white/20 bg-transparent"
          onClick={() => setShowPreferences(true)}
        >
          <Settings className="w-4 h-4 mr-2" />
          preferences
        </Button>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 px-6 pb-20">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <h1 className="font-playfair text-6xl md:text-8xl font-bold text-foreground mb-6 text-glow text-balance">
              Find Your Perfect
              <br />
              <span className="text-primary">Dining Experience</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 text-pretty leading-relaxed">
              AI-powered recommendations that learn your taste preferences and discover the best restaurants around you
            </p>

            {preferences.cuisines.length > 0 && (
              <div className="glass-effect p-4 rounded-lg mb-6 max-w-2xl mx-auto border-white/30">
                <p className="text-foreground text-sm font-medium">
                  Personalized for your taste: {preferences.cuisines.slice(0, 3).join(", ")}
                  {preferences.cuisines.length > 3 && ` +${preferences.cuisines.length - 3} more`}
                </p>
              </div>
            )}
          </div>

          {/* Search Interface */}
          <Card className="glass-effect p-8 w-full max-w-2xl">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="What are you craving? (e.g., ramen, pizza, sushi)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg bg-background/70 border-white/30 text-foreground placeholder:text-muted-foreground"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex items-center gap-4">
                <LocationSelector
                  onLocationSelect={setSelectedLocation}
                  currentLocation={selectedLocation}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSearching ? "Searching..." : "Find Restaurants"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="flex items-center gap-8 mt-12 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm">AI-Powered Matching</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm">Real-time Reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm">Location-Based</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex gap-2">
          {foodVideos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentVideo(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentVideo ? "bg-primary w-8" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      <PreferenceModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        onSave={handlePreferencesSave}
        initialPreferences={preferences}
      />
    </div>
  )
}
