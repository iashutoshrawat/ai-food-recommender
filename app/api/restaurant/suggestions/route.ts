import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { QuestionGenerator } from "@/lib/question-generator"
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import type { ConversationMessage } from "@/hooks/use-restaurant-chat"

const SuggestionsRequestSchema = z.object({
  restaurants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    cuisine: z.string(),
    rating: z.number(),
    priceLevel: z.number(),
    description: z.string(),
  }).passthrough()).optional().default([]),
  messages: z.array(z.object({
    id: z.string(),
    type: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    timestamp: z.number(),
  }).passthrough()).optional().default([]),
  context: z.object({
    discussedTopics: z.array(z.string()).optional().default([]),
    restaurantCount: z.number().optional().default(0),
    userPreferences: z.record(z.any()).optional().default({}),
    conversationFlow: z.array(z.string()).optional().default([]),
    lastIntent: z.string().optional().default("general"),
    timeOfDay: z.string().optional().default("day"),
    sessionLength: z.number().optional().default(0),
  }),
  maxSuggestions: z.number().optional().default(5),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { restaurants, messages, context, maxSuggestions } = SuggestionsRequestSchema.parse(body)

    const questions = QuestionGenerator.generateQuestions(
      restaurants as Restaurant[],
      messages as ConversationMessage[],
      context,
      maxSuggestions
    )

    return NextResponse.json({
      success: true,
      suggestions: questions.map(q => ({
        text: q.text,
        category: q.category,
        priority: q.priority,
        expectedResponse: q.expectedResponse,
      })),
      contextInsights: {
        topCategories: getTopCategories(questions),
        suggestionTypes: getSuggestionTypes(questions),
        recommendedFlow: getRecommendedFlow(context, questions),
      }
    })

  } catch (error) {
    console.error("Suggestions generation error:", error)
    
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
        error: "Failed to generate suggestions",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

function getTopCategories(questions: any[]): string[] {
  const categoryCount = questions.reduce((acc, q) => {
    acc[q.category] = (acc[q.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category)
}

function getSuggestionTypes(questions: any[]): Record<string, number> {
  return questions.reduce((acc, q) => {
    acc[q.expectedResponse] = (acc[q.expectedResponse] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function getRecommendedFlow(context: any, questions: any[]): {
  nextAction: string
  reasoning: string
  priority: number
} {
  const { restaurantCount, conversationFlow, lastIntent } = context

  if (restaurantCount === 0) {
    return {
      nextAction: "search",
      reasoning: "No restaurants discussed yet, recommend starting with search",
      priority: 10
    }
  }

  if (restaurantCount === 1) {
    return {
      nextAction: "explore",
      reasoning: "One restaurant available, recommend exploring details",
      priority: 8
    }
  }

  if (restaurantCount > 1 && !conversationFlow.includes("compare")) {
    return {
      nextAction: "compare",
      reasoning: "Multiple restaurants available, comparison would be helpful",
      priority: 9
    }
  }

  if (conversationFlow.length > 5) {
    return {
      nextAction: "decide",
      reasoning: "Long conversation, user likely ready for decision help",
      priority: 7
    }
  }

  return {
    nextAction: "continue",
    reasoning: "Conversation flowing naturally",
    priority: 5
  }
}