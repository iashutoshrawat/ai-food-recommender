import { openai } from "@ai-sdk/openai"
import { generateText, generateObject } from "ai"
import { z } from "zod"
import type { Restaurant } from "@/hooks/use-ai-recommendations"

const AnalysisSchema = z.object({
  overall_score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  atmosphere_score: z.number().min(0).max(10),
  food_quality_score: z.number().min(0).max(10),
  value_score: z.number().min(0).max(10),
  service_score: z.number().min(0).max(10),
  best_for: z.array(z.string()),
  unique_features: z.array(z.string()),
  recommendation: z.string(),
})

const ComparisonSchema = z.object({
  winner: z.string(),
  summary: z.string(),
  detailed_comparison: z.array(z.object({
    restaurant_name: z.string(),
    scores: z.object({
      overall: z.number().min(0).max(100),
      food: z.number().min(0).max(10),
      atmosphere: z.number().min(0).max(10),
      value: z.number().min(0).max(10),
      service: z.number().min(0).max(10),
    }),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    best_for: z.string(),
  })),
  recommendation: z.string(),
})

export class RestaurantAnalysisService {
  static async analyzeRestaurant(
    restaurant: Restaurant,
    focusAreas?: string[]
  ) {
    try {
      const focusText = focusAreas && focusAreas.length > 0 
        ? `Focus particularly on: ${focusAreas.join(", ")}`
        : "Provide a comprehensive analysis"

      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: AnalysisSchema,
        prompt: `
          Analyze this restaurant in detail:
          
          Name: ${restaurant.name}
          Cuisine: ${restaurant.cuisine}
          Rating: ${restaurant.rating}/5
          Price Level: ${restaurant.priceLevel}/4
          Description: ${restaurant.description || "No description available"}
          Location: ${restaurant.address || "Location not specified"}
          
          ${focusText}
          
          Provide a comprehensive analysis including:
          - Overall score (0-100)
          - Key strengths and weaknesses
          - Detailed scores for atmosphere, food quality, value, and service (0-10)
          - What occasions/purposes this restaurant is best suited for
          - Unique features that set it apart
          - Final recommendation summary
          
          Base your analysis on the provided information and reasonable inferences about restaurants of this type, cuisine, and rating level.
        `
      })

      return result.object
    } catch (error) {
      console.error("Restaurant analysis failed:", error)
      
      // Fallback analysis
      return {
        overall_score: restaurant.rating * 20, // Convert 5-star to 100-point scale
        strengths: [`Highly rated ${restaurant.cuisine} restaurant`, "Good reputation in the area"],
        weaknesses: ["Limited detailed information available"],
        atmosphere_score: restaurant.rating,
        food_quality_score: restaurant.rating,
        value_score: Math.max(1, 6 - restaurant.priceLevel), // Inverse relationship with price
        service_score: restaurant.rating,
        best_for: [restaurant.cuisine.toLowerCase() + " dining", "local dining"],
        unique_features: [restaurant.cuisine + " cuisine"],
        recommendation: `${restaurant.name} appears to be a solid choice for ${restaurant.cuisine} food with a ${restaurant.rating}-star rating.`
      }
    }
  }

  static async compareRestaurants(
    restaurants: Restaurant[],
    comparisonCriteria?: string[]
  ) {
    try {
      if (restaurants.length < 2) {
        throw new Error("Need at least 2 restaurants to compare")
      }

      const criteriaText = comparisonCriteria && comparisonCriteria.length > 0
        ? `Focus the comparison on: ${comparisonCriteria.join(", ")}`
        : "Compare all aspects comprehensively"

      const restaurantList = restaurants.map(r => `
        ${r.name}:
        - Cuisine: ${r.cuisine}
        - Rating: ${r.rating}/5
        - Price Level: ${r.priceLevel}/4
        - Description: ${r.description || "No description"}
        - Location: ${r.address || "Location not specified"}
      `).join("\n")

      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: ComparisonSchema,
        prompt: `
          Compare these restaurants and determine which is best overall:
          
          ${restaurantList}
          
          ${criteriaText}
          
          Provide:
          - Overall winner and why
          - Summary of key differences
          - Detailed comparison with scores for each restaurant (0-100 overall, 0-10 for specific categories)
          - Pros and cons for each
          - What each restaurant is best suited for
          - Final recommendation with reasoning
          
          Base your comparison on the provided data and reasonable assumptions about restaurants of these types.
        `
      })

      return result.object
    } catch (error) {
      console.error("Restaurant comparison failed:", error)
      
      // Fallback comparison
      const bestRated = restaurants.sort((a, b) => b.rating - a.rating)[0]
      
      return {
        winner: bestRated.name,
        summary: `Based on ratings, ${bestRated.name} (${bestRated.rating} stars) appears to be the top choice among these options.`,
        detailed_comparison: restaurants.map(r => ({
          restaurant_name: r.name,
          scores: {
            overall: r.rating * 20,
            food: r.rating,
            atmosphere: r.rating,
            value: Math.max(1, 6 - r.priceLevel),
            service: r.rating,
          },
          pros: [`${r.rating}-star rating`, `${r.cuisine} cuisine`],
          cons: ["Limited detailed information"],
          best_for: `${r.cuisine} dining`
        })),
        recommendation: `I'd recommend ${bestRated.name} based on its higher rating of ${bestRated.rating} stars.`
      }
    }
  }
}