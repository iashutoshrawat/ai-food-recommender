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
    const { query, preferences, location, behavior, realRestaurants } = await req.json()

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

    // Determine if we have real restaurant data to work with
    const hasRealData = realRestaurants && Array.isArray(realRestaurants) && realRestaurants.length > 0

    let prompt: string

    if (hasRealData) {
      // Enhanced prompt for real restaurant data analysis
      const restaurantData = realRestaurants.slice(0, 12) // Limit to prevent token overflow
      
      prompt = `You are an expert restaurant recommendation AI. Based on the user's query "${query}" and their detailed preferences, analyze and rank these REAL restaurants, then enhance with additional personalized recommendations.

REAL RESTAURANTS FOUND:
${restaurantData.map((r, i) => `
${i + 1}. ${r.name}
   - Cuisine: ${r.cuisine}
   - Address: ${r.address}
   - Price Level: ${"$".repeat(r.priceLevel || 3)}
   - Rating: ${r.rating || "N/A"}/5 (${r.reviewCount || 0} reviews)
   - Specialties: ${(r.specialties || []).join(", ")}
   - Dietary Options: ${(r.dietaryOptions || []).join(", ")}
   - Distance: ${r.distance || "Unknown"}
   - Description: ${r.description || ""}
`).join("")}

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

Location Context: ${userContext.location}

TASK: Analyze these real restaurants and create personalized recommendations:

1. **Rank the real restaurants** based on how well they match the user's preferences
2. **Calculate match scores (0-100)** based on:
   - Cuisine preference alignment
   - Price range fit
   - Dietary restriction accommodation
   - Distance and convenience
   - Rating and review quality
   - Specialty dish alignment with user's favorite ingredients
3. **Provide specific match reasons** for each restaurant
4. **Enhance missing data** reasonably (like estimated wait times, ambiance)
5. **Include 2-3 additional restaurants** if the real data doesn't provide enough variety

Focus on authentic analysis of the real restaurant data while personalizing based on user preferences. Prioritize restaurants that genuinely match dietary restrictions and cuisine preferences.`

    } else {
      // Fallback prompt for when no real data is available (original behavior)
      prompt = `You are an expert restaurant recommendation AI. Based on the user's query "${query}" and their detailed preferences, generate personalized restaurant recommendations.

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
1. Have a realistic name and details based on the location
2. Match the user's dietary restrictions and preferences
3. Fall within their preferred price range
4. Include a match score (0-100) based on how well it fits their profile
5. Provide specific reasons why it matches their preferences
6. Include practical details like estimated wait time and distance

Make the recommendations feel authentic and varied, covering different aspects of their preferences. If they have strong preferences (like specific cuisines or dietary restrictions), prioritize those heavily in the match scoring.`
    }

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: restaurantRecommendationSchema,
      prompt,
      maxOutputTokens: hasRealData ? 4000 : 3000, // More tokens for real data analysis
      temperature: hasRealData ? 0.5 : 0.7, // Lower temperature for real data analysis
    })

    // Enhance the response with metadata about data source
    const enhancedResponse = {
      ...object,
      searchSummary: {
        ...object.searchSummary,
        dataSource: hasRealData ? 'real_and_ai_enhanced' : 'ai_generated',
        realRestaurantsAnalyzed: hasRealData ? realRestaurants.length : 0,
        enhancementNote: hasRealData 
          ? 'Recommendations based on real restaurant data, enhanced with AI analysis and personalization.'
          : 'Recommendations generated using AI based on your preferences and location.'
      }
    }

    return Response.json(enhancedResponse)
  } catch (error) {
    console.error("Recommendation error:", error)
    return Response.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
