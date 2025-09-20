import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const { restaurants, preferences, behavior, context } = await req.json()

    const prompt = `You are a personalization AI that re-ranks restaurant recommendations based on user preferences and behavior.

User Preferences:
- Cuisines: ${preferences.cuisines?.join(", ") || "No preference"}
- Spice Level: ${preferences.spiceLevel}/5
- Dietary Restrictions: ${preferences.dietaryRestrictions?.join(", ") || "None"}
- Price Range: ${preferences.priceRange?.join("-") || "Any"}
- Dining Style: ${preferences.diningStyle?.join(", ") || "Any"}

User Behavior:
- Recent Searches: ${behavior.searchHistory?.slice(0, 5).join(", ") || "None"}
- Favorite Restaurants: ${behavior.favoriteRestaurants?.length || 0}
- Recent Ratings: ${
      behavior.ratedRestaurants
        ?.slice(0, 3)
        .map((r: any) => `${r.rating}/5`)
        .join(", ") || "None"
    }

Context: ${context || "General dining"}

Original Restaurants:
${restaurants
  .map((r: any, i: number) => `${i + 1}. ${r.name} - ${r.cuisine} - ${"$".repeat(r.priceLevel)} - ${r.rating}/5 stars`)
  .join("\n")}

Provide a personalized ranking explanation for why these restaurants are ordered for this specific user. Consider their taste preferences, past behavior, and current context. Be specific about what makes each restaurant a good or poor match.

Format as a brief, conversational explanation of the personalized ranking.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      maxOutputTokens: 800,
      temperature: 0.7,
    })

    return Response.json({ explanation: text })
  } catch (error) {
    console.error("Personalization error:", error)
    return Response.json({ error: "Failed to generate personalization" }, { status: 500 })
  }
}
