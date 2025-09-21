import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { RestaurantAnalysisService } from "@/lib/restaurant-analysis-service"
import type { Restaurant } from "@/hooks/use-ai-recommendations"

const ComparisonRequestSchema = z.object({
  restaurants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    cuisine: z.string(),
    rating: z.number(),
    priceLevel: z.number(),
    description: z.string(),
    // Add other restaurant fields as needed
  }).passthrough()).min(2).max(5), // Allow 2-5 restaurants for comparison
  comparisonCriteria: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { restaurants, comparisonCriteria } = ComparisonRequestSchema.parse(body)

    const comparison = await RestaurantAnalysisService.compareRestaurants(
      restaurants as Restaurant[],
      comparisonCriteria
    )

    return NextResponse.json({
      success: true,
      comparison,
    })

  } catch (error) {
    console.error("Restaurant comparison error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request format",
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: "Failed to compare restaurants",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}