import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const restaurantRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      cuisine: z.string(),
      description: z.string(),
      priceLevel: z.number().min(1).max(5),
      rating: z.number().min(1).max(5),
      reviewCount: z.number(),
      address: z.string(),
      phone: z.string().optional(),
      website: z.string().optional(),
      hours: z.string().optional(),
      specialties: z.array(z.string()),
      dietaryOptions: z.array(z.string()),
      ambiance: z.string(),
      bestFor: z.array(z.string()),
      estimatedWaitTime: z.string().optional(),
      distance: z.string(),
      matchScore: z.number().min(0).max(100),
      matchReasons: z.array(z.string()),
      imageUrl: z.string().optional(),
    }),
  ),
  searchSummary: z.object({
    query: z.string(),
    totalResults: z.number(),
    averagePrice: z.number(),
    topCuisines: z.array(z.string()),
    personalizedNote: z.string(),
  }),
})

export async function POST(req: Request) {
  try {
    const { query, preferences, location, behavior } = await req.json()

    // Build context for AI recommendation
    const userContext = {
      preferences: {
        cuisines: preferences.cuisines || [],
        spiceLevel: preferences.spiceLevel || 3,
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        priceRange: preferences.priceRange || [2, 4],
        mealTiming: preferences.mealTiming || [],
        diningStyle: preferences.diningStyle || [],
        favoriteIngredients: preferences.favoriteIngredients || [],
        dislikedIngredients: preferences.dislikedIngredients || [],
      },
      behavior: {
        searchHistory: behavior?.searchHistory?.slice(0, 10) || [],
        favoriteRestaurants: behavior?.favoriteRestaurants || [],
        rejectedSuggestions: behavior?.rejectedSuggestions || [],
        recentRatings: behavior?.ratedRestaurants?.slice(0, 5) || [],
      },
      location: location || "Current location",
    }

    const prompt = `You are an expert restaurant recommendation AI. Based on the user's query "${query}" and their detailed preferences, generate personalized restaurant recommendations.

User Preferences:
- Favorite Cuisines: ${userContext.preferences.cuisines.join(", ") || "No specific preference"}
- Spice Tolerance: ${userContext.preferences.spiceLevel}/5
- Dietary Restrictions: ${userContext.preferences.dietaryRestrictions.join(", ") || "None"}
- Price Range: ${"$".repeat(userContext.preferences.priceRange[0])} to ${"$".repeat(userContext.preferences.priceRange[1])}
- Dining Style: ${userContext.preferences.diningStyle.join(", ") || "Any"}
- Meal Timing: ${userContext.preferences.mealTiming.join(", ") || "Any time"}
- Loves: ${userContext.preferences.favoriteIngredients.join(", ") || "No specific preferences"}
- Avoids: ${userContext.preferences.dislikedIngredients.join(", ") || "Nothing specific"}

User Behavior:
- Recent Searches: ${userContext.behavior.searchHistory.join(", ") || "None"}
- Favorite Restaurants: ${userContext.behavior.favoriteRestaurants.length} saved
- Previously Rejected: ${userContext.behavior.rejectedSuggestions.length} restaurants

Location: ${userContext.location}

Generate 6-8 diverse restaurant recommendations that match the user's query and preferences. Each recommendation should:
1. Have a realistic name and details
2. Match the user's dietary restrictions and preferences
3. Fall within their preferred price range
4. Include a match score (0-100) based on how well it fits their profile
5. Provide specific reasons why it matches their preferences
6. Include practical details like estimated wait time and distance

Make the recommendations feel authentic and varied, covering different aspects of their preferences. If they have strong preferences (like specific cuisines or dietary restrictions), prioritize those heavily in the match scoring.`

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: restaurantRecommendationSchema,
      prompt,
      maxOutputTokens: 3000,
      temperature: 0.7,
    })

    return Response.json(object)
  } catch (error) {
    console.error("Recommendation error:", error)
    return Response.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
