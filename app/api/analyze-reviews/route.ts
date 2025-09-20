import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const reviewAnalysisSchema = z.object({
  overallSentiment: z.enum(["positive", "negative", "mixed", "neutral"]),
  sentimentScore: z.number().min(-1).max(1),
  keyStrengths: z.array(z.string()),
  keyWeaknesses: z.array(z.string()),
  foodQuality: z.object({
    score: z.number().min(1).max(5),
    highlights: z.array(z.string()),
    concerns: z.array(z.string()),
  }),
  service: z.object({
    score: z.number().min(1).max(5),
    highlights: z.array(z.string()),
    concerns: z.array(z.string()),
  }),
  ambiance: z.object({
    score: z.number().min(1).max(5),
    description: z.string(),
  }),
  value: z.object({
    score: z.number().min(1).max(5),
    notes: z.string(),
  }),
  popularDishes: z.array(z.string()),
  dietaryFriendliness: z.object({
    vegetarian: z.boolean(),
    vegan: z.boolean(),
    glutenFree: z.boolean(),
    notes: z.string(),
  }),
  bestTimes: z.array(z.string()),
  crowdType: z.array(z.string()),
  summary: z.string(),
  recommendationScore: z.number().min(0).max(100),
})

export async function POST(req: Request) {
  try {
    const { reviews, restaurantName } = await req.json()

    if (!reviews || reviews.length === 0) {
      return Response.json({ error: "No reviews provided for analysis" }, { status: 400 })
    }

    const reviewsText = reviews
      .map((review: any, index: number) => `Review ${index + 1} (${review.rating}/5 stars): ${review.text}`)
      .join("\n\n")

    const prompt = `Analyze the following customer reviews for "${restaurantName}" and provide a comprehensive analysis:

${reviewsText}

Please analyze these reviews to understand:
1. Overall customer sentiment and satisfaction
2. Food quality, service, ambiance, and value ratings
3. Most praised and criticized aspects
4. Popular dishes mentioned
5. Dietary accommodation information
6. Best times to visit and typical crowd
7. Overall recommendation score

Focus on extracting actionable insights that would help someone decide whether to visit this restaurant and what to expect.`

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: reviewAnalysisSchema,
      prompt,
      maxOutputTokens: 2000,
      temperature: 0.3,
    })

    return Response.json(object)
  } catch (error) {
    console.error("Review analysis error:", error)
    return Response.json({ error: "Failed to analyze reviews" }, { status: 500 })
  }
}
