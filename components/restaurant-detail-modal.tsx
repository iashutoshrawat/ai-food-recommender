"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Star, MapPin, Clock, Phone, Globe, DollarSign, Utensils, Heart, X } from "lucide-react"
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import { usePreferences } from "@/hooks/use-preferences"
import ReviewAnalysisComponent from "./review-analysis"

interface RestaurantDetailModalProps {
  restaurant: Restaurant | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Mock reviews for demonstration - in a real app, these would come from an API
const generateMockReviews = (restaurant: Restaurant) => [
  {
    rating: 5,
    text: `Amazing ${restaurant.cuisine.toLowerCase()} food! The ${restaurant.specialties[0]?.toLowerCase() || "signature dish"} was absolutely delicious. Great service and atmosphere. Highly recommend!`,
  },
  {
    rating: 4,
    text: `Really enjoyed our meal here. The food quality was excellent and the staff was friendly. The ambiance was perfect for a ${restaurant.bestFor[0]?.toLowerCase() || "dinner"}. Will definitely come back.`,
  },
  {
    rating: 4,
    text: `Good ${restaurant.cuisine.toLowerCase()} restaurant with fresh ingredients. The ${restaurant.specialties[1]?.toLowerCase() || "dishes"} were flavorful. Service was a bit slow but worth the wait.`,
  },
  {
    rating: 5,
    text: `One of the best ${restaurant.cuisine.toLowerCase()} places in the area! The ${restaurant.specialties[0]?.toLowerCase() || "food"} was outstanding. Perfect for ${restaurant.bestFor[0]?.toLowerCase() || "dining"}.`,
  },
  {
    rating: 3,
    text: `Decent food but nothing extraordinary. The service was okay and the prices are reasonable for the portion sizes. Good for a casual meal.`,
  },
]

export default function RestaurantDetailModal({ restaurant, open, onOpenChange }: RestaurantDetailModalProps) {
  const { toggleFavorite, rejectSuggestion, behavior } = usePreferences()
  const [mockReviews] = useState(() => (restaurant ? generateMockReviews(restaurant) : []))

  if (!restaurant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border-white/30">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-playfair text-foreground mb-2">{restaurant.name}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Utensils className="w-4 h-4" />
                  {restaurant.cuisine}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {"$".repeat(restaurant.priceLevel)}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {restaurant.rating} ({restaurant.reviewCount} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {restaurant.distance}
                </span>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                className="glass-effect border-white/30 bg-transparent hover:bg-white/20"
                onClick={() => toggleFavorite(restaurant.id)}
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
                onClick={() => rejectSuggestion(restaurant.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <p className="text-foreground leading-relaxed">{restaurant.description}</p>

          {/* Match Score */}
          <div className="bg-primary/20 rounded-lg p-4 border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-primary">Match Score</span>
              <span className="text-2xl font-bold text-primary">{restaurant.matchScore}%</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {restaurant.matchReasons.map((reason, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-primary/40 text-primary bg-primary/10">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Specialties */}
              {restaurant.specialties.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {restaurant.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline" className="border-white/30 text-foreground bg-white/10">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary Options */}
              {restaurant.dietaryOptions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Dietary Options</h3>
                  <div className="flex flex-wrap gap-2">
                    {restaurant.dietaryOptions.map((option, index) => (
                      <Badge key={index} variant="secondary" className="bg-secondary/80 text-secondary-foreground">
                        {option}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Best For */}
              {restaurant.bestFor.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Best For</h3>
                  <div className="flex flex-wrap gap-2">
                    {restaurant.bestFor.map((occasion, index) => (
                      <Badge key={index} variant="outline" className="border-primary/40 text-primary bg-primary/10">
                        {occasion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Contact Info */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Contact & Location</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{restaurant.address}</span>
                  </div>
                  {restaurant.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{restaurant.phone}</span>
                    </div>
                  )}
                  {restaurant.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Website Available</span>
                    </div>
                  )}
                  {restaurant.estimatedWaitTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Wait Time: {restaurant.estimatedWaitTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ambiance */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Ambiance</h3>
                <p className="text-sm text-muted-foreground">{restaurant.ambiance}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* AI Review Analysis */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Review Insights</h3>
            <ReviewAnalysisComponent restaurantName={restaurant.name} reviews={mockReviews} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
