"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Flame, Leaf, Heart, DollarSign, Clock, Users } from "lucide-react"

interface UserPreferences {
  cuisines: string[]
  spiceLevel: number
  dietaryRestrictions: string[]
  priceRange: number[]
  mealTiming: string[]
  diningStyle: string[]
  favoriteIngredients: string[]
  dislikedIngredients: string[]
}

interface PreferenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (preferences: UserPreferences) => void
  initialPreferences?: Partial<UserPreferences>
}

const cuisineOptions = [
  "Italian",
  "Japanese",
  "Mexican",
  "Chinese",
  "Indian",
  "Thai",
  "French",
  "Mediterranean",
  "American",
  "Korean",
  "Vietnamese",
  "Greek",
  "Spanish",
  "Lebanese",
  "Ethiopian",
  "Peruvian",
]

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Keto",
  "Paleo",
  "Halal",
  "Kosher",
]

const mealTimingOptions = [
  "Quick Bite",
  "Leisurely Meal",
  "Business Lunch",
  "Romantic Dinner",
  "Family Meal",
  "Late Night",
]

const diningStyleOptions = ["Fine Dining", "Casual", "Fast Casual", "Street Food", "Food Truck", "Buffet", "Takeout"]

const commonIngredients = [
  "Garlic",
  "Onions",
  "Tomatoes",
  "Cheese",
  "Mushrooms",
  "Peppers",
  "Herbs",
  "Seafood",
  "Beef",
  "Chicken",
  "Pork",
  "Lamb",
  "Tofu",
  "Beans",
  "Rice",
  "Pasta",
]

export default function PreferenceModal({ open, onOpenChange, onSave, initialPreferences }: PreferenceModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    cuisines: initialPreferences?.cuisines || [],
    spiceLevel: initialPreferences?.spiceLevel || 3,
    dietaryRestrictions: initialPreferences?.dietaryRestrictions || [],
    priceRange: initialPreferences?.priceRange || [2, 4],
    mealTiming: initialPreferences?.mealTiming || [],
    diningStyle: initialPreferences?.diningStyle || [],
    favoriteIngredients: initialPreferences?.favoriteIngredients || [],
    dislikedIngredients: initialPreferences?.dislikedIngredients || [],
  })

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) ? array.filter((i) => i !== item) : [...array, item]
  }

  const handleSave = () => {
    onSave(preferences)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border-white/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair text-foreground">
            Tell us about your taste preferences
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Cuisine Preferences */}
          <div>
            <Label className="text-lg font-semibold text-foreground mb-4 block">Favorite Cuisines</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {cuisineOptions.map((cuisine) => (
                <Badge
                  key={cuisine}
                  variant={preferences.cuisines.includes(cuisine) ? "default" : "outline"}
                  className={`cursor-pointer p-3 text-center justify-center transition-all font-medium ${
                    preferences.cuisines.includes(cuisine)
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent border-white/30 text-foreground hover:bg-white/20"
                  }`}
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      cuisines: toggleArrayItem(prev.cuisines, cuisine),
                    }))
                  }
                >
                  {cuisine}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Spice Level */}
          <div>
            <Label className="text-lg font-semibold text-foreground mb-4 block flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              Spice Tolerance
            </Label>
            <div className="space-y-4">
              <Slider
                value={[preferences.spiceLevel]}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, spiceLevel: value[0] }))}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Mild</span>
                <span>Medium</span>
                <span>Hot</span>
                <span>Very Hot</span>
                <span>Extreme</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Dietary Restrictions */}
          <div>
            <Label className="text-lg font-semibold text-foreground mb-4 block flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              Dietary Preferences
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {dietaryOptions.map((diet) => (
                <div key={diet} className="flex items-center space-x-2">
                  <Checkbox
                    id={diet}
                    checked={preferences.dietaryRestrictions.includes(diet)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPreferences((prev) => ({
                          ...prev,
                          dietaryRestrictions: [...prev.dietaryRestrictions, diet],
                        }))
                      } else {
                        setPreferences((prev) => ({
                          ...prev,
                          dietaryRestrictions: prev.dietaryRestrictions.filter((d) => d !== diet),
                        }))
                      }
                    }}
                  />
                  <Label htmlFor={diet} className="text-foreground cursor-pointer font-medium">
                    {diet}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Price Range */}
          <div>
            <Label className="text-lg font-semibold text-foreground mb-4 block flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Price Range
            </Label>
            <div className="space-y-4">
              <Slider
                value={preferences.priceRange}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, priceRange: value }))}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>$ Budget</span>
                <span>$$ Moderate</span>
                <span>$$$ Upscale</span>
                <span>$$$$ Fine Dining</span>
                <span>$$$$$ Luxury</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Meal Timing */}
          <div>
            <Label className="text-lg font-semibold text-foreground mb-4 block flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Dining Occasions
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {mealTimingOptions.map((timing) => (
                <Badge
                  key={timing}
                  variant={preferences.mealTiming.includes(timing) ? "default" : "outline"}
                  className={`cursor-pointer p-3 text-center justify-center transition-all font-medium ${
                    preferences.mealTiming.includes(timing)
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent border-white/30 text-foreground hover:bg-white/20"
                  }`}
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      mealTiming: toggleArrayItem(prev.mealTiming, timing),
                    }))
                  }
                >
                  {timing}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Dining Style */}
          <div>
            <Label className="text-lg font-semibold text-foreground mb-4 block flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Dining Style
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {diningStyleOptions.map((style) => (
                <Badge
                  key={style}
                  variant={preferences.diningStyle.includes(style) ? "default" : "outline"}
                  className={`cursor-pointer p-3 text-center justify-center transition-all font-medium ${
                    preferences.diningStyle.includes(style)
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent border-white/30 text-foreground hover:bg-white/20"
                  }`}
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      diningStyle: toggleArrayItem(prev.diningStyle, style),
                    }))
                  }
                >
                  {style}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Favorite Ingredients */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-lg font-semibold text-foreground mb-4 block flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Love These
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {commonIngredients.map((ingredient) => (
                  <Badge
                    key={ingredient}
                    variant={preferences.favoriteIngredients.includes(ingredient) ? "default" : "outline"}
                    className={`cursor-pointer p-2 text-center justify-center transition-all text-xs font-medium ${
                      preferences.favoriteIngredients.includes(ingredient)
                        ? "bg-green-600 text-white"
                        : "bg-transparent border-white/30 text-foreground hover:bg-white/20"
                    }`}
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        favoriteIngredients: toggleArrayItem(prev.favoriteIngredients, ingredient),
                        dislikedIngredients: prev.dislikedIngredients.filter((i) => i !== ingredient),
                      }))
                    }
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold text-foreground mb-4 block">Avoid These</Label>
              <div className="grid grid-cols-2 gap-2">
                {commonIngredients.map((ingredient) => (
                  <Badge
                    key={ingredient}
                    variant={preferences.dislikedIngredients.includes(ingredient) ? "default" : "outline"}
                    className={`cursor-pointer p-2 text-center justify-center transition-all text-xs font-medium ${
                      preferences.dislikedIngredients.includes(ingredient)
                        ? "bg-red-600 text-white"
                        : "bg-transparent border-white/30 text-foreground hover:bg-white/20"
                    }`}
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        dislikedIngredients: toggleArrayItem(prev.dislikedIngredients, ingredient),
                        favoriteIngredients: prev.favoriteIngredients.filter((i) => i !== ingredient),
                      }))
                    }
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-white/20">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="glass-effect border-white/30 text-foreground hover:bg-white/20"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
