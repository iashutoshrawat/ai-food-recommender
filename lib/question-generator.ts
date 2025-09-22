import type { Restaurant } from "@/hooks/use-ai-recommendations"

export interface ConversationMessage {
  id: string
  type: "user" | "assistant" | "system"
  content: string
  timestamp: number
}

export interface Question {
  text: string
  category: string
  priority: number
  expectedResponse: string
}

export interface ConversationContext {
  discussedTopics?: string[]
  restaurantCount?: number
  userPreferences?: Record<string, any>
  conversationFlow?: string[]
  lastIntent?: string
  timeOfDay?: string
  sessionLength?: number
}

export class QuestionGenerator {
  static generateQuestions(
    restaurants: Restaurant[],
    messages: ConversationMessage[],
    context: ConversationContext,
    maxSuggestions: number = 5
  ): Question[] {
    const questions: Question[] = []
    const { restaurantCount = 0, discussedTopics = [], lastIntent = "general", conversationFlow = [] } = context

    // Generate questions based on conversation state
    if (restaurantCount === 0) {
      questions.push(
        {
          text: "What type of cuisine are you in the mood for?",
          category: "preference",
          priority: 10,
          expectedResponse: "cuisine_preference"
        },
        {
          text: "Are you looking for a specific price range?",
          category: "budget",
          priority: 9,
          expectedResponse: "budget_preference"
        },
        {
          text: "What's the occasion for dining out?",
          category: "context",
          priority: 8,
          expectedResponse: "occasion_context"
        }
      )
    } else if (restaurantCount === 1) {
      const restaurant = restaurants[0]
      questions.push(
        {
          text: `Would you like to know more about ${restaurant?.name}?`,
          category: "exploration",
          priority: 9,
          expectedResponse: "restaurant_details"
        },
        {
          text: `What specifically interests you about ${restaurant?.cuisine} cuisine?`,
          category: "cuisine",
          priority: 7,
          expectedResponse: "cuisine_interest"
        }
      )
    } else if (restaurantCount > 1) {
      questions.push(
        {
          text: "Would you like me to compare these restaurants for you?",
          category: "comparison",
          priority: 9,
          expectedResponse: "comparison_request"
        },
        {
          text: "Which factors are most important to you - price, atmosphere, or food quality?",
          category: "priorities",
          priority: 8,
          expectedResponse: "decision_criteria"
        }
      )
    }

    // Add contextual questions based on discussion topics
    if (!discussedTopics.includes("atmosphere")) {
      questions.push({
        text: "What kind of atmosphere are you looking for?",
        category: "atmosphere",
        priority: 6,
        expectedResponse: "atmosphere_preference"
      })
    }

    if (!discussedTopics.includes("dietary")) {
      questions.push({
        text: "Do you have any dietary restrictions or preferences?",
        category: "dietary",
        priority: 5,
        expectedResponse: "dietary_requirements"
      })
    }

    // Add follow-up questions based on recent messages
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.type === "user" && lastMessage.content.toLowerCase().includes("recommend")) {
        questions.push({
          text: "What would make the perfect restaurant recommendation for you?",
          category: "recommendation",
          priority: 8,
          expectedResponse: "ideal_match"
        })
      }
    }

    // Sort by priority and return top suggestions
    return questions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxSuggestions)
  }
}