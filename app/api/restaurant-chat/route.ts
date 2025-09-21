import { NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import { z } from "zod"
import type { Restaurant } from "@/hooks/use-ai-recommendations"
import type { ConversationMessage } from "@/hooks/use-restaurant-chat"

const ChatRequestSchema = z.object({
  message: z.string(),
  conversationHistory: z.array(z.any()).optional(),
  context: z.object({
    activeRestaurants: z.array(z.string()).optional(),
    discussedRestaurants: z.array(z.any()).optional(),
    currentTopic: z.string().optional(),
    intent: z.string(),
    userPreferences: z.record(z.any()).optional(),
  }),
})

const ChatResponseSchema = z.object({
  content: z.string(),
  restaurants: z.array(z.any()).optional(),
  suggestions: z.array(z.string()).optional(),
  activeRestaurants: z.array(z.string()).optional(),
  topic: z.string().optional(),
  responseType: z.string(),
  updatedContext: z.record(z.any()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, conversationHistory = [], context } = ChatRequestSchema.parse(body)

    const { intent, activeRestaurants = [], discussedRestaurants = [], currentTopic, userPreferences = {} } = context

    // Build context for the AI
    const conversationContext = buildConversationContext(conversationHistory, discussedRestaurants, userPreferences)

    let response: any

    switch (intent) {
      case "find_restaurants":
        response = await handleRestaurantSearch(message, userPreferences, conversationContext)
        break
      case "compare_restaurants":
        response = await handleRestaurantComparison(message, discussedRestaurants, activeRestaurants, conversationContext)
        break
      case "restaurant_inquiry":
        response = await handleRestaurantInquiry(message, discussedRestaurants, activeRestaurants, conversationContext)
        break
      case "atmosphere_inquiry":
        response = await handleAtmosphereInquiry(message, discussedRestaurants, activeRestaurants, conversationContext)
        break
      case "menu_inquiry":
        response = await handleMenuInquiry(message, discussedRestaurants, activeRestaurants, conversationContext)
        break
      case "pricing_inquiry":
        response = await handlePricingInquiry(message, discussedRestaurants, activeRestaurants, conversationContext)
        break
      case "review_inquiry":
        response = await handleReviewInquiry(message, discussedRestaurants, activeRestaurants, conversationContext)
        break
      case "recommendation_request":
        response = await handleRecommendationRequest(message, discussedRestaurants, userPreferences, conversationContext)
        break
      case "refine_search":
        response = await handleSearchRefinement(message, discussedRestaurants, userPreferences, conversationContext)
        break
      default:
        response = await handleGeneralInquiry(message, discussedRestaurants, conversationContext)
    }

    return NextResponse.json({
      content: response.content,
      restaurants: response.restaurants || [],
      suggestions: response.suggestions || [],
      activeRestaurants: response.activeRestaurants || activeRestaurants,
      topic: response.topic || currentTopic,
      responseType: response.responseType || intent,
      updatedContext: response.updatedContext,
    })

  } catch (error) {
    console.error("Restaurant chat error:", error)
    return NextResponse.json(
      { 
        error: "Failed to process chat request",
        content: "I'm sorry, I encountered an issue processing your request. Please try again.",
        suggestions: ["Try a different question", "Search for restaurants", "Tell me what you're looking for"]
      },
      { status: 500 }
    )
  }
}

function buildConversationContext(history: ConversationMessage[], restaurants: Restaurant[], preferences: any): string {
  const context = []
  
  if (restaurants.length > 0) {
    context.push(`Previously discussed restaurants: ${restaurants.map(r => `${r.name} (${r.cuisine}, ${r.rating}★, ${r.priceRange})`).join(", ")}`)
  }
  
  if (preferences && Object.keys(preferences).length > 0) {
    context.push(`User preferences: ${JSON.stringify(preferences)}`)
  }
  
  if (history.length > 0) {
    const recentMessages = history.slice(-5).map(msg => `${msg.type}: ${msg.content}`).join("\n")
    context.push(`Recent conversation:\n${recentMessages}`)
  }
  
  return context.join("\n\n")
}

async function handleRestaurantSearch(message: string, preferences: any, context: string) {
  // First, try to get real restaurant data
  const searchResponse = await fetch(new URL("/api/restaurants/search", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: message, preferences }),
  })

  let restaurants: Restaurant[] = []
  
  if (searchResponse.ok) {
    const searchData = await searchResponse.json()
    restaurants = searchData.restaurants || []
  }

  // Try to get personalized insights from memory system
  let personalizedInsights = ""
  try {
    // This would normally call the memory system, but since we can't access browser storage in API routes,
    // we'll include personalized messaging in the response that the frontend can enhance
    if (preferences && Object.keys(preferences).length > 0) {
      personalizedInsights = `Based on your preferences: ${JSON.stringify(preferences)}`
    }
  } catch (error) {
    console.warn("Could not access personalization data:", error)
  }

  // Generate response with AI
  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
You are a friendly, personalized restaurant assistant. The user is searching for: "${message}"

Context: ${context}

${personalizedInsights}

${restaurants.length > 0 ? `I found ${restaurants.length} restaurants: ${JSON.stringify(restaurants)}` : "No specific restaurants found - you should acknowledge this and offer to help differently."}

Respond conversationally and helpfully. If restaurants were found, introduce them enthusiastically with personalized commentary based on the user's context and preferences. Mention why each might be interesting to them specifically.

If no restaurants found, offer to help in other ways like:
- Suggesting different search terms
- Asking about specific preferences
- Recommending popular cuisines in their area
- Offering to search in a wider radius

Keep the response warm, engaging, and personalized. Show that you're learning about their taste preferences.`,
  })

  const suggestions = generatePersonalizedSuggestions("search", restaurants, preferences, message)

  return {
    content: response.text,
    restaurants: restaurants.slice(0, 5), // Limit to top 5
    suggestions,
    responseType: "search_results",
    topic: "search",
    userPreferences: preferences, // Include for frontend personalization
  }
}

function generatePersonalizedSuggestions(context: string, restaurants: Restaurant[], preferences: any, originalQuery: string): string[] {
  const suggestions: string[] = []
  
  if (restaurants.length > 0) {
    // Suggestions based on found restaurants
    suggestions.push("Tell me more about these restaurants")
    suggestions.push("Which one do you recommend?")
    suggestions.push("Compare the top options")
    
    // Add preference-based suggestions
    if (preferences?.cuisines?.length > 0) {
      const userCuisines = preferences.cuisines
      const matchingCuisines = restaurants.filter(r => userCuisines.includes(r.cuisine))
      if (matchingCuisines.length > 0) {
        suggestions.push(`Tell me more about the ${matchingCuisines[0].cuisine} options`)
      }
    }
    
    if (preferences?.priceRange && preferences.priceRange.length === 2) {
      suggestions.push("Show me the best value options")
      if (preferences.priceRange[1] > 3) {
        suggestions.push("Any upscale options?")
      }
    }
    
    // Occasion-based suggestions
    const query = originalQuery.toLowerCase()
    if (query.includes("date") || query.includes("romantic")) {
      suggestions.push("Which is most romantic?")
    } else if (query.includes("family") || query.includes("kids")) {
      suggestions.push("Which is most family-friendly?")
    } else if (query.includes("business") || query.includes("meeting")) {
      suggestions.push("Which is best for business meals?")
    } else {
      suggestions.push("Which has the best atmosphere?")
    }
    
  } else {
    // Suggestions when no restaurants found
    suggestions.push("Try a different search term")
    suggestions.push("Search in a wider area")
    suggestions.push("Tell me your preferences")
    suggestions.push("What type of cuisine interests you?")
    
    if (preferences?.cuisines?.length > 0) {
      suggestions.push(`Find ${preferences.cuisines[0]} restaurants`)
    }
  }
  
  return suggestions.slice(0, 5)
}

async function handleRestaurantComparison(message: string, allRestaurants: Restaurant[], activeIds: string[], context: string) {
  const activeRestaurants = allRestaurants.filter(r => activeIds.includes(r.id))
  
  if (activeRestaurants.length < 2) {
    return {
      content: "I need at least 2 restaurants to compare. Which restaurants would you like me to compare?",
      suggestions: ["Compare all the restaurants you showed me", "Find more restaurants to compare", "Tell me about the differences"],
      responseType: "comparison_error",
    }
  }

  try {
    // Use the structured comparison API for more detailed analysis
    const comparisonResponse = await fetch(new URL("/api/restaurant/compare", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurants: activeRestaurants,
        comparisonCriteria: extractComparisonCriteria(message),
      }),
    })

    let detailedComparison = null
    if (comparisonResponse.ok) {
      const data = await comparisonResponse.json()
      detailedComparison = data.comparison
    }

    const response = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `
You are comparing these restaurants for the user: ${JSON.stringify(activeRestaurants)}

User's comparison request: "${message}"

Context: ${context}

${detailedComparison ? `Detailed comparison analysis: ${JSON.stringify(detailedComparison)}` : ""}

Provide a conversational comparison focusing on the aspects the user mentioned. Consider:
- Food quality and cuisine style
- Pricing and value for money
- Atmosphere and dining experience
- Service quality and speed
- Location and convenience factors
- Unique features and specialties

Be specific, helpful, and conversational. Make clear recommendations based on different use cases (date night, family dinner, business meal, etc.).`,
    })

    const suggestions = generateComparisonSuggestions(activeRestaurants, message)

    return {
      content: response.text,
      restaurants: activeRestaurants, // Include restaurants in response for highlighting
      suggestions,
      activeRestaurants: activeIds,
      responseType: "comparison",
      topic: "comparison",
      comparisonData: detailedComparison,
    }
  } catch (error) {
    console.error("Comparison analysis failed, using fallback:", error)
    
    // Fallback to simple comparison
    const response = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `
You are comparing these restaurants: ${JSON.stringify(activeRestaurants)}

User's request: "${message}"

Provide a helpful comparison based on the available information. Focus on ratings, cuisine types, pricing, and any notable features mentioned in their descriptions.`,
    })

    return {
      content: response.text,
      suggestions: [
        "Which one is better for a date?",
        "Which has better value for money?",
        "Which one should I choose?",
        "Tell me about the atmosphere differences",
        "Compare their menus",
      ],
      activeRestaurants: activeIds,
      responseType: "comparison",
      topic: "comparison",
    }
  }
}

function extractComparisonCriteria(message: string): string[] {
  const criteria: string[] = []
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes("atmosphere") || lowerMessage.includes("ambiance") || lowerMessage.includes("vibe")) {
    criteria.push("atmosphere")
  }
  if (lowerMessage.includes("food") || lowerMessage.includes("menu") || lowerMessage.includes("dish")) {
    criteria.push("food_quality")
  }
  if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("value")) {
    criteria.push("pricing")
  }
  if (lowerMessage.includes("service") || lowerMessage.includes("staff") || lowerMessage.includes("wait")) {
    criteria.push("service")
  }
  if (lowerMessage.includes("location") || lowerMessage.includes("distance") || lowerMessage.includes("parking")) {
    criteria.push("location")
  }
  if (lowerMessage.includes("date") || lowerMessage.includes("romantic")) {
    criteria.push("date_night")
  }
  if (lowerMessage.includes("family") || lowerMessage.includes("kids") || lowerMessage.includes("children")) {
    criteria.push("family_friendly")
  }
  if (lowerMessage.includes("business") || lowerMessage.includes("meeting") || lowerMessage.includes("professional")) {
    criteria.push("business_dining")
  }
  
  return criteria.length > 0 ? criteria : ["overall"]
}

function generateComparisonSuggestions(restaurants: Restaurant[], originalMessage: string): string[] {
  const restaurantNames = restaurants.map(r => r.name)
  const suggestions = [
    "Which one should I choose?",
    "What are the main differences?",
    "Which is better value for money?",
  ]
  
  // Add context-specific suggestions
  if (!originalMessage.toLowerCase().includes("date")) {
    suggestions.push("Which is better for a date night?")
  }
  if (!originalMessage.toLowerCase().includes("family")) {
    suggestions.push("Which is more family-friendly?")
  }
  if (!originalMessage.toLowerCase().includes("atmosphere")) {
    suggestions.push("Compare their atmospheres")
  }
  if (!originalMessage.toLowerCase().includes("menu")) {
    suggestions.push("How do their menus compare?")
  }
  
  return suggestions.slice(0, 5)
}

async function handleRestaurantInquiry(message: string, allRestaurants: Restaurant[], activeIds: string[], context: string) {
  const restaurant = allRestaurants.find(r => activeIds.includes(r.id)) || allRestaurants[0]
  
  if (!restaurant) {
    return {
      content: "I don't have information about any specific restaurant to discuss. Would you like me to find some restaurants for you first?",
      suggestions: ["Find restaurants near me", "Search for a specific cuisine", "Show me popular restaurants"],
      responseType: "no_restaurant_context",
    }
  }

  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user is asking about ${restaurant.name}: "${message}"

Restaurant details: ${JSON.stringify(restaurant)}

Context: ${context}

Provide detailed, helpful information about this restaurant based on what the user is asking. Be specific and engaging. 

If you don't have specific information requested, be honest about it but offer related information you do have.`,
  })

  const suggestions = [
    `What's the atmosphere like at ${restaurant.name}?`,
    `How's the food at ${restaurant.name}?`,
    `Tell me about the pricing at ${restaurant.name}`,
    `What do reviews say about ${restaurant.name}?`,
    "Find similar restaurants",
  ]

  return {
    content: response.text,
    suggestions,
    activeRestaurants: [restaurant.id],
    responseType: "restaurant_info",
    topic: "restaurant_details",
  }
}

async function handleAtmosphereInquiry(message: string, allRestaurants: Restaurant[], activeIds: string[], context: string) {
  const restaurants = allRestaurants.filter(r => activeIds.includes(r.id))
  
  if (restaurants.length === 0) {
    return {
      content: "I'd be happy to tell you about restaurant atmospheres! Which restaurant would you like to know about?",
      suggestions: ["Tell me about a cozy restaurant", "Find romantic restaurants", "Show me casual dining spots"],
      responseType: "need_restaurant_context",
    }
  }

  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user is asking about the atmosphere at these restaurants: ${JSON.stringify(restaurants)}

User's question: "${message}"

Context: ${context}

Focus on describing the atmosphere, ambiance, vibe, and overall dining experience. Consider:
- Interior design and decor
- Noise level and music
- Lighting and mood
- Crowd and clientele
- Best occasions for dining there

Be descriptive and helpful.`,
  })

  const suggestions = [
    "Is it good for dates?",
    "How's the noise level?",
    "Is it family-friendly?",
    "What about the service?",
    "Compare the atmospheres",
  ]

  return {
    content: response.text,
    suggestions,
    responseType: "atmosphere_analysis",
    topic: "atmosphere",
  }
}

async function handleMenuInquiry(message: string, allRestaurants: Restaurant[], activeIds: string[], context: string) {
  const restaurants = allRestaurants.filter(r => activeIds.includes(r.id))
  
  if (restaurants.length === 0) {
    return {
      content: "I'd love to tell you about restaurant menus! Which restaurant are you curious about?",
      suggestions: ["What cuisines are available?", "Find vegetarian restaurants", "Show me pizza places"],
      responseType: "need_restaurant_context",
    }
  }

  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user is asking about the menu at these restaurants: ${JSON.stringify(restaurants)}

User's question: "${message}"

Context: ${context}

Focus on the food offerings, popular dishes, specialties, dietary options, and menu variety. Include information about:
- Signature dishes and specialties
- Dietary accommodations (vegetarian, vegan, gluten-free, etc.)
- Menu variety and options
- Food quality and preparation style
- Any unique or standout items

Be informative and appetizing in your description.`,
  })

  const suggestions = [
    "What are the popular dishes?",
    "Any vegetarian options?",
    "How are the portion sizes?",
    "What about desserts?",
    "Tell me about the drink menu",
  ]

  return {
    content: response.text,
    suggestions,
    responseType: "menu_analysis",
    topic: "menu",
  }
}

async function handlePricingInquiry(message: string, allRestaurants: Restaurant[], activeIds: string[], context: string) {
  const restaurants = allRestaurants.filter(r => activeIds.includes(r.id))
  
  if (restaurants.length === 0) {
    return {
      content: "I can help you understand restaurant pricing! Which restaurants are you considering?",
      suggestions: ["Find budget-friendly options", "Show me mid-range restaurants", "What about fine dining?"],
      responseType: "need_restaurant_context",
    }
  }

  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user is asking about pricing at these restaurants: ${JSON.stringify(restaurants)}

User's question: "${message}"

Context: ${context}

Focus on pricing information including:
- Average cost per person
- Value for money assessment
- Price range for different items
- Any special deals or lunch specials
- Comparison of pricing if multiple restaurants
- Whether it's worth the price based on quality

Be honest and helpful about costs.`,
  })

  const suggestions = [
    "Is it worth the price?",
    "Any lunch specials?",
    "How do prices compare?",
    "What's the average cost per person?",
    "Find cheaper alternatives",
  ]

  return {
    content: response.text,
    suggestions,
    responseType: "pricing_analysis",
    topic: "pricing",
  }
}

async function handleReviewInquiry(message: string, allRestaurants: Restaurant[], activeIds: string[], context: string) {
  const restaurants = allRestaurants.filter(r => activeIds.includes(r.id))
  
  if (restaurants.length === 0) {
    return {
      content: "I can share review insights! Which restaurant would you like to know about?",
      suggestions: ["Show me highly rated restaurants", "Find restaurants with good reviews", "What makes a restaurant great?"],
      responseType: "need_restaurant_context",
    }
  }

  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user is asking about reviews for these restaurants: ${JSON.stringify(restaurants)}

User's question: "${message}"

Context: ${context}

Focus on review analysis including:
- Overall rating and what it means
- Common positive feedback themes
- Any notable concerns or criticisms
- What reviewers particularly praise
- Service quality feedback
- Food quality consensus

Summarize the review sentiment helpfully.`,
  })

  const suggestions = [
    "What do people love most?",
    "Any common complaints?",
    "How's the service according to reviews?",
    "What about food quality reviews?",
    "Compare the review scores",
  ]

  return {
    content: response.text,
    suggestions,
    responseType: "review_analysis",
    topic: "reviews",
  }
}

async function handleRecommendationRequest(message: string, allRestaurants: Restaurant[], preferences: any, context: string) {
  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user is asking for a recommendation: "${message}"

Available restaurants: ${JSON.stringify(allRestaurants)}
User preferences: ${JSON.stringify(preferences)}

Context: ${context}

Provide a thoughtful recommendation based on:
- The user's stated preferences
- The specific request they made
- The quality and characteristics of available options
- Their conversation history and interests

Give a clear recommendation with reasoning. If you need more information to make a good recommendation, ask clarifying questions.`,
  })

  const suggestions = [
    "Why do you recommend this one?",
    "What makes it special?",
    "Any other good options?",
    "Tell me more about your top pick",
    "How do I make a reservation?",
  ]

  return {
    content: response.text,
    suggestions,
    responseType: "recommendation",
    topic: "recommendation",
  }
}

async function handleSearchRefinement(message: string, existingRestaurants: Restaurant[], preferences: any, context: string) {
  // Extract refinement criteria from the message
  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user wants to refine their search: "${message}"

Current restaurants: ${JSON.stringify(existingRestaurants)}
Current preferences: ${JSON.stringify(preferences)}

Context: ${context}

Understand what kind of refinement they want (cheaper, closer, different cuisine, better atmosphere, etc.) and respond helpfully.

If you can provide a refined list from the current restaurants, do so. Otherwise, acknowledge their request and explain how you can help find what they're looking for.`,
  })

  const suggestions = [
    "Show me more options",
    "Find something completely different",
    "What about a different price range?",
    "Any other cuisines nearby?",
    "Make another search",
  ]

  return {
    content: response.text,
    suggestions,
    responseType: "search_refinement",
    topic: "refinement",
  }
}

async function handleGeneralInquiry(message: string, allRestaurants: Restaurant[], context: string) {
  const response = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
The user has a general question: "${message}"

Context: ${context}
${allRestaurants.length > 0 ? `Available restaurants: ${JSON.stringify(allRestaurants)}` : "No specific restaurants in context."}

Respond helpfully and conversationally. Try to understand what they want and guide them toward a useful next step.`,
  })

  const suggestions = [
    "Find restaurants near me",
    "Tell me about different cuisines",
    "What makes a restaurant great?",
    "Help me choose a restaurant",
    "Search for specific food",
  ]

  return {
    content: response.text,
    suggestions,
    responseType: "general_response",
    topic: "general",
  }
}

function generateSuggestions(context: string, restaurantCount: number): string[] {
  const baseSuggestions: Record<string, string[]> = {
    search: restaurantCount > 0 
      ? ["Tell me more about these restaurants", "Which one do you recommend?", "Show me reviews", "Find similar restaurants"]
      : ["Try a different search", "Tell me your preferences", "Search for a specific cuisine", "Find restaurants near me"],
    comparison: ["Which one is better for dates?", "Compare their prices", "What about the atmosphere?", "Which has better food?"],
    restaurant_info: ["How's the atmosphere?", "What about the menu?", "Tell me about pricing", "Show me reviews"],
    atmosphere: ["Is it good for dates?", "How's the service?", "What about noise levels?", "Is it family-friendly?"],
    menu: ["What are popular dishes?", "Any dietary options?", "How are portion sizes?", "Tell me about desserts"],
    pricing: ["Is it worth the price?", "Any specials?", "Compare costs", "Find cheaper options"],
    reviews: ["What do people love?", "Any complaints?", "How's the service?", "What about food quality?"],
  }

  return baseSuggestions[context] || baseSuggestions.search
}