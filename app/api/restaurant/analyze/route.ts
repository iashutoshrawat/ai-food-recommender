import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { RestaurantAnalysisService } from "@/lib/restaurant-analysis-service"
import type { Restaurant } from "@/hooks/use-ai-recommendations"

const AnalysisRequestSchema = z.object({
  restaurant: z.object({
    id: z.string(),
    name: z.string(),
    cuisine: z.string(),
    rating: z.number(),
    priceLevel: z.number(),
    description: z.string(),
    // Add other restaurant fields as needed
  }).passthrough(), // Allow additional fields
  focusAreas: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { restaurant, focusAreas } = AnalysisRequestSchema.parse(body)

    const analysis = await RestaurantAnalysisService.analyzeRestaurant(
      restaurant as Restaurant,
      focusAreas
    )

    return NextResponse.json({
      success: true,
      analysis,
    })

  } catch (error) {
    console.error("Restaurant analysis error:", error)
    
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
        error: "Failed to analyze restaurant",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}