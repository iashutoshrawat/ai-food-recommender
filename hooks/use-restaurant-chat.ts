import { useState, useCallback } from "react"

export interface ConversationMessage {
  id: string
  type: "user" | "assistant" | "system"
  content: string
  timestamp: number
}

export interface ChatContext {
  activeRestaurants?: string[]
  discussedRestaurants?: any[]
  currentTopic?: string
  intent: string
  userPreferences?: Record<string, any>
}

export interface ChatResponse {
  content: string
  restaurants?: any[]
  suggestions?: string[]
  activeRestaurants?: string[]
  topic?: string
  responseType: string
  updatedContext?: Record<string, any>
}

export function useRestaurantChat() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [context, setContext] = useState<ChatContext>({
    intent: "general",
    activeRestaurants: [],
    discussedRestaurants: [],
    currentTopic: "general",
    userPreferences: {}
  })

  const sendMessage = useCallback(async (
    message: string,
    intent: string = "general"
  ): Promise<ChatResponse> => {
    setIsLoading(true)
    
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch("/api/restaurant-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages,
          context: {
            ...context,
            intent
          }
        })
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const chatResponse: ChatResponse = await response.json()

      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: chatResponse.content,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Update context with response data
      setContext(prev => ({
        ...prev,
        activeRestaurants: chatResponse.activeRestaurants || prev.activeRestaurants,
        currentTopic: chatResponse.topic || prev.currentTopic,
        ...chatResponse.updatedContext
      }))

      return chatResponse
    } catch (error) {
      console.error("Chat error:", error)
      
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant", 
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, errorMessage])

      return {
        content: "I'm sorry, I encountered an error. Please try again.",
        suggestions: ["Try asking again", "Search for restaurants", "Tell me what you're looking for"],
        responseType: "error"
      }
    } finally {
      setIsLoading(false)
    }
  }, [messages, context])

  const clearMessages = useCallback(() => {
    setMessages([])
    setContext({
      intent: "general",
      activeRestaurants: [],
      discussedRestaurants: [],
      currentTopic: "general",
      userPreferences: {}
    })
  }, [])

  const updateContext = useCallback((updates: Partial<ChatContext>) => {
    setContext(prev => ({ ...prev, ...updates }))
  }, [])

  return {
    messages,
    isLoading,
    context,
    sendMessage,
    clearMessages,
    updateContext
  }
}