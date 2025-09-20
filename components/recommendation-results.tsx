"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, MapPin, Clock, Phone, Globe, Heart, X, DollarSign, Utensils } from "lucide-react"
import type { Restaurant, SearchSummary } from "@/hooks/use-ai-recommendations"
import { usePreferences } from "@/hooks/use-preferences"
import RestaurantDetailModal from "./restaurant-detail-modal"

interface RecommendationResultsProps {
  recommendations: Restaurant[]
  searchSummary: SearchSummary | null
  personalizationExplanation: string
  onRestaurantClick: (restaurant: Restaurant) => void
}

export default function RecommendationResults({
  recommendations,
  searchSummary,
  personalizationExplanation,
  onRestaurantClick,
}: RecommendationResultsProps) {
  const { toggleFavorite, rejectSuggestion, behavior } = usePreferences()
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setShowDetailModal(true)
    onRestaurantClick(restaurant)
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Search Summary */}
      {searchSummary && (
        <Card className="glass-effect border-white/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Found {searchSummary.totalResults} restaurants for "{searchSummary.query}"
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Avg: ${"$".repeat(Math.round(searchSummary.averagePrice))}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {searchSummary.topCuisines.map((cuisine) => (
                <Badge key={cuisine} variant="outline" className="border-white/30 text-foreground bg-white/10">
                  {cuisine}
                </Badge>
              ))}
            </div>

            {personalizationExplanation && (
              <div className="bg-primary/20 rounded-lg p-4 border border-primary/30">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  <strong className="text-primary">Personalized for you:</strong> {personalizationExplanation}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Restaurant Recommendations */}
      <div className="grid gap-4">
        {recommendations.map((restaurant, index) => (
          <Card
            key={restaurant.id}
            className="glass-effect border-white/30 hover:bg-white/10 transition-all cursor-pointer"
            onClick={() => handleRestaurantClick(restaurant)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-primary bg-primary/20 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <h3 className="text-xl font-semibold text-foreground font-playfair">{restaurant.name}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-foreground">{restaurant.rating}</span>
                      <span className="text-xs text-muted-foreground">({restaurant.reviewCount})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Utensils className="w-4 h-4" />
                      {restaurant.cuisine}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {"$".repeat(restaurant.priceLevel)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {restaurant.distance}
                    </span>
                    {restaurant.estimatedWaitTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {restaurant.estimatedWaitTime}
                      </span>
                    )}
                  </div>

                  <p className="text-foreground mb-4 leading-relaxed">{restaurant.description}</p>

                  {/* Match Score and Reasons */}
                  <div className="bg-primary/20 rounded-lg p-3 mb-4 border border-primary/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">Match Score</span>
                      <span className="text-lg font-bold text-primary">{restaurant.matchScore}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {restaurant.matchReasons.map((reason, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs border-primary/40 text-primary bg-primary/10"
                        >
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Specialties and Dietary Options */}
                  <div className="space-y-2 mb-4">
                    {restaurant.specialties.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-foreground">Specialties: </span>
                        <span className="text-sm text-muted-foreground">{restaurant.specialties.join(", ")}</span>
                      </div>
                    )}
                    {restaurant.dietaryOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {restaurant.dietaryOptions.map((option) => (
                          <Badge
                            key={option}
                            variant="secondary"
                            className="text-xs bg-secondary/80 text-secondary-foreground"
                          >
                            {option}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {restaurant.address}
                    </span>
                    {restaurant.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {restaurant.phone}
                      </span>
                    )}
                    {restaurant.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Website
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-primary/80 font-medium">
                    Click to view detailed review analysis →
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="glass-effect border-white/30 bg-transparent hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(restaurant.id)
                    }}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        behavior.favoriteRestaurants.includes(restaurant.id)
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="glass-effect border-white/30 text-muted-foreground hover:text-red-400 bg-transparent hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      rejectSuggestion(restaurant.id)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restaurant Detail Modal with Review Analysis */}
      <RestaurantDetailModal restaurant={selectedRestaurant} open={showDetailModal} onOpenChange={setShowDetailModal} />
    </div>
  )
}
