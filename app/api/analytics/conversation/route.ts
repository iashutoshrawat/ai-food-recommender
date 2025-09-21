import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const AnalyticsEventSchema = z.object({
  sessionId: z.string(),
  eventType: z.enum([
    "conversation_started",
    "message_sent",
    "restaurant_viewed",
    "restaurant_compared",
    "suggestion_clicked",
    "conversation_ended"
  ]),
  eventData: z.record(z.any()),
  timestamp: z.number(),
  metadata: z.object({
    userAgent: z.string().optional(),
    location: z.string().optional(),
    conversationLength: z.number().optional(),
    restaurantsDiscussed: z.number().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const analyticsEvent = AnalyticsEventSchema.parse(body)

    // In a real implementation, you would save this to a database
    // For now, we'll just log it and return success
    console.log("Analytics Event:", {
      ...analyticsEvent,
      userAgent: req.headers.get("user-agent"),
      ip: req.ip || "unknown",
    })

    // You could integrate with analytics services like:
    // - Google Analytics
    // - Mixpanel
    // - PostHog
    // - Custom analytics database

    return NextResponse.json({
      success: true,
      message: "Analytics event recorded",
    })

  } catch (error) {
    console.error("Analytics recording error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid analytics data format",
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: "Failed to record analytics",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving analytics data (for admin dashboard)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  const eventType = searchParams.get("eventType")
  const timeRange = searchParams.get("timeRange") // e.g., "24h", "7d", "30d"

  // In a real implementation, you would query your analytics database
  // For now, return mock analytics data
  const mockAnalytics = {
    summary: {
      totalConversations: 1250,
      averageMessagesPerConversation: 8.5,
      topRestaurantTypes: ["Italian", "Chinese", "Mexican", "Japanese", "Thai"],
      conversionRate: 0.65, // Percentage of conversations that end with restaurant selection
    },
    recentEvents: [
      {
        sessionId: "session-123",
        eventType: "conversation_started",
        timestamp: Date.now() - 3600000,
        eventData: { initialQuery: "Find Italian restaurants" },
      },
      {
        sessionId: "session-123", 
        eventType: "restaurant_viewed",
        timestamp: Date.now() - 3000000,
        eventData: { restaurantName: "Bella Vista", action: "atmosphere" },
      },
    ],
    insights: [
      "Users most commonly ask about restaurant atmosphere first",
      "Comparison requests increase likelihood of selection by 40%",
      "Average conversation length is 8.5 messages",
      "Italian and Chinese cuisines are most popular",
    ],
  }

  return NextResponse.json({
    success: true,
    analytics: mockAnalytics,
    filters: {
      sessionId,
      eventType,
      timeRange,
    },
  })
}