import { NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { z } from "zod"
import type { Restaurant } from "@/hooks/use-ai-recommendations"

const IntelligenceRequestSchema = z.object({
  restaurant: z.object({
    id: z.string(),
    name: z.string(),
    cuisine: z.string(),
    rating: z.number(),
    description: z.string(),
    distance: z.string(),
    priceRange: z.string(),
  }).passthrough().optional(),
  restaurants: z.array(z.any()).optional(), // For general questions about multiple restaurants
  searchContext: z.string().optional(), // What the user originally searched for
  userLocation: z.string().optional(),
  specificQuestion: z.string().optional(), // Specific follow-up question
  isGeneralQuestion: z.boolean().optional(), // Whether this is about multiple restaurants
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { restaurant, restaurants, searchContext, userLocation, specificQuestion, isGeneralQuestion } = IntelligenceRequestSchema.parse(body)

    // Generate intelligent research about the restaurant(s)
    const research = isGeneralQuestion && restaurants
      ? await generateGeneralIntelligence(restaurants, specificQuestion, searchContext, userLocation)
      : await generateRestaurantIntelligence(restaurant!, searchContext, userLocation, specificQuestion)

    return NextResponse.json({
      success: true,
      intelligence: research,
    })

  } catch (error) {
    console.error("Restaurant intelligence error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate restaurant intelligence",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function generateRestaurantIntelligence(
  restaurant: Restaurant, 
  searchContext?: string,
  userLocation?: string,
  specificQuestion?: string
) {
  const contextPrompt = searchContext 
    ? `The user originally searched for "${searchContext}", so focus on how this restaurant relates to that.`
    : ""

  const locationPrompt = userLocation
    ? `The user is in ${userLocation}.`
    : ""

  const questionPrompt = specificQuestion
    ? `The user has a specific question: "${specificQuestion}". Focus your response on answering this question thoroughly.`
    : ""

  try {
    // Main intelligence gathering
    const intelligenceResponse = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `
You are a knowledgeable restaurant expert doing deep research on a specific restaurant. 

Restaurant: ${JSON.stringify(restaurant)}
${contextPrompt}
${locationPrompt}
${questionPrompt}

${specificQuestion ? `
Focus on answering the user's specific question: "${specificQuestion}"

Provide a thorough, detailed answer that addresses exactly what they want to know. Be specific and practical.
` : `
Provide comprehensive insights about this restaurant including:

1. **What makes it special**: Unique features, signature dishes, notable aspects
2. **Food Quality & Style**: Cooking style, popular dishes, quality indicators
3. **Atmosphere & Experience**: Dining environment, service style, ambiance
4. **Value Assessment**: Price vs quality, what you get for the money
5. **Best For**: Ideal occasions, who would love this place
6. **Insider Tips**: Best time to visit, what to order, reservations needed
7. **Potential Concerns**: Any drawbacks or things to know

Make it conversational, insightful, and practical. Focus on information that would help someone decide if this is right for them.
`}

Provide specific, actionable insights rather than generic restaurant descriptions.
`,
    })

    // Generate follow-up questions
    const questionsResponse = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `
Based on this restaurant: ${restaurant.name} (${restaurant.cuisine}, ${restaurant.rating} stars)
${contextPrompt}

Generate 4-5 natural follow-up questions a user might want to ask about this restaurant. Make them specific and useful.

Examples:
- "How's the biryani quality compared to other places?"
- "Is it good for a romantic dinner?"
- "What's the parking situation like?"
- "Do they take reservations?"

Make the questions contextually relevant and practical.
`,
    })

    // Extract follow-up questions
    const followUpQuestions = questionsResponse.text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.includes('?'))
      .slice(0, 5)

    return {
      insights: intelligenceResponse.text,
      followUpQuestions,
      researchedAt: new Date().toISOString(),
      confidence: 0.85,
      sources: ["restaurant_data", "ai_analysis", "contextual_research"],
    }

  } catch (error) {
    console.error("Failed to generate intelligence:", error)
    
    // Fallback response
    return {
      insights: `${restaurant.name} is a ${restaurant.cuisine} restaurant with a ${restaurant.rating} star rating. ${restaurant.description} It's located ${restaurant.distance} from you and is in the ${restaurant.priceRange} price range.`,
      followUpQuestions: [
        `How's the food quality at ${restaurant.name}?`,
        `What's the atmosphere like?`,
        `Is ${restaurant.name} good value for money?`,
        `What are their most popular dishes?`,
        `Do I need to make a reservation?`
      ],
      researchedAt: new Date().toISOString(),
      confidence: 0.6,
      sources: ["basic_data"],
    }
  }
}

async function generateGeneralIntelligence(
  restaurants: Restaurant[],
  question: string = "",
  searchContext?: string,
  userLocation?: string
) {
  const contextPrompt = searchContext 
    ? `The user originally searched for "${searchContext}".`
    : ""

  const locationPrompt = userLocation
    ? `The user is in ${userLocation}.`
    : ""

  try {
    const intelligenceResponse = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `
You are a restaurant expert answering a question about multiple restaurants.

Question: "${question}"
Restaurants: ${JSON.stringify(restaurants)}
${contextPrompt}
${locationPrompt}

Provide a comprehensive answer that compares and contrasts the restaurants to answer the user's question. Be specific and helpful.

Focus on:
- Direct answer to their question
- Comparisons between restaurants
- Specific recommendations based on their needs
- Practical advice and insights

Make it conversational and actionable.
`,
    })

    // Generate contextual follow-up questions
    const followUpQuestions = generateContextualQuestions(question, restaurants)

    return {
      insights: intelligenceResponse.text,
      followUpQuestions,
      researchedAt: new Date().toISOString(),
      confidence: 0.85,
      sources: ["restaurant_comparison", "ai_analysis"],
    }

  } catch (error) {
    console.error("Failed to generate general intelligence:", error)
    
    return {
      insights: `Here's what I can tell you about these ${restaurants.length} restaurants based on your question "${question}". ${restaurants.map(r => `${r.name} is a ${r.cuisine} restaurant with ${r.rating} stars`).join(", ")}.`,
      followUpQuestions: [
        "Which restaurant would you recommend?",
        "Compare the top 2 restaurants",
        "Which is best value for money?",
        "Which has the best atmosphere?",
      ],
      researchedAt: new Date().toISOString(),
      confidence: 0.6,
      sources: ["basic_comparison"],
    }
  }
}

function generateContextualQuestions(question: string, restaurants: Restaurant[]): string[] {
  const lowerQuestion = question.toLowerCase()
  const questions: string[] = []

  if (lowerQuestion.includes("date") || lowerQuestion.includes("romantic")) {
    questions.push("Which has the best ambiance for couples?")
    questions.push("What about privacy and noise levels?")
    questions.push("Which offers the best service for special occasions?")
  } else if (lowerQuestion.includes("family") || lowerQuestion.includes("kid")) {
    questions.push("Which has the best kids menu?")
    questions.push("What about high chairs and space for families?")
    questions.push("Which is most accommodating for children?")
  } else if (lowerQuestion.includes("compare") || lowerQuestion.includes("best")) {
    questions.push("What are the main differences between these restaurants?")
    questions.push("Which offers the best value?")
    questions.push("Which has better reviews?")
  } else if (lowerQuestion.includes("cheap") || lowerQuestion.includes("value")) {
    questions.push("Which has the biggest portions for the price?")
    questions.push("Any lunch specials or deals?")
    questions.push("Which gives you the most for your money?")
  } else {
    questions.push("Tell me more about the top-rated option")
    questions.push("Which would you personally recommend?")
    questions.push("What should I consider when choosing?")
  }

  questions.push("How do I make a reservation at the best one?")
  
  return questions.slice(0, 5)
}