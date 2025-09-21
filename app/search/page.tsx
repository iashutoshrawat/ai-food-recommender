"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, ArrowLeft, MapPin, Settings, User, Utensils, MessageSquare } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePreferences } from "@/hooks/use-preferences"
import { useAIRecommendations, type Restaurant } from "@/hooks/use-ai-recommendations"
import LocationSelector from "@/components/location-selector"
import PreferenceModal from "@/components/preference-modal"
import type { LocationData } from "@/hooks/use-location"
import { useLocationPersistence } from "@/hooks/use-location-persistence"

interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  restaurants?: Restaurant[]
  timestamp: Date
  followUpQuestions?: string[]
  isProactive?: boolean
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [showPreferences, setShowPreferences] = useState(false)
  const [lastActivityTime, setLastActivityTime] = useState(Date.now())
  
  const { selectedLocation, setSelectedLocation, parseLocationFromUrl, isLoaded } = useLocationPersistence()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { preferences, savePreferences } = usePreferences()
  const { recommendations, searchSummary, personalizationExplanation, isLoading, error, getRecommendations } =
    useAIRecommendations()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Proactive suggestions system
  useEffect(() => {
    const proactiveTimer = setTimeout(() => {
      // Only show proactive suggestions if user has restaurants but hasn't asked questions recently
      if (recommendations.length > 0 && messages.length > 0) {
        const lastUserMessage = messages.filter(m => m.type === "user").slice(-1)[0]
        const timeSinceLastMessage = lastUserMessage ? Date.now() - lastUserMessage.timestamp.getTime() : 0
        
        // If user hasn't interacted for 30 seconds, offer proactive help
        if (timeSinceLastMessage > 30000) {
          addProactiveSuggestion()
        }
      }
    }, 30000) // Check after 30 seconds

    return () => clearTimeout(proactiveTimer)
  }, [messages, recommendations])

  const addProactiveSuggestion = () => {
    // Don't add if user is currently typing or if we recently added a proactive message
    if (currentMessage.trim() || isLoading) return
    
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.isProactive) return // Don't spam proactive messages

    const proactiveMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "assistant",
      content: "👋 I notice you're browsing the restaurants! I'm here to help if you have any questions. I can tell you about food quality, atmosphere, pricing, or help you decide between options.",
      timestamp: new Date(),
      followUpQuestions: [
        "Which restaurant do you recommend?",
        "What's the atmosphere like at the top-rated place?",
        "Which is best value for money?",
        "Help me decide between the top 2",
        "Which is good for a special occasion?"
      ],
      isProactive: true,
    }

    setMessages(prev => [...prev, proactiveMessage])
  }

  // Parse location from URL parameters on initial load
  useEffect(() => {
    if (isLoaded) {
      const urlLocation = parseLocationFromUrl(searchParams)
      if (urlLocation) {
        setSelectedLocation(urlLocation)
      }
    }
  }, [isLoaded, searchParams, parseLocationFromUrl, setSelectedLocation])

  useEffect(() => {
    if (initialQuery && isLoaded) {
      handleInitialSearch(initialQuery)
    }
  }, [initialQuery, isLoaded])

  useEffect(() => {
    if (recommendations.length > 0 && !isLoading) {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content:
          searchSummary?.personalizedNote ||
          `I found ${recommendations.length} great restaurants for you! Here are my top recommendations:`,
        restaurants: recommendations,
        timestamp: new Date(),
      }
      
      const followUpMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `🎯 **Want to know more?** Click on any restaurant above and I'll research it for you! I can tell you about:

• Food quality and signature dishes
• Atmosphere and dining experience
• Pricing and value for money
• Best occasions to visit
• Reservation requirements
• And much more!`,
        timestamp: new Date(),
        followUpQuestions: generateContextualFollowUpQuestions(initialQuery, recommendations),
        isProactive: true,
      }

      setMessages((prev) => [...prev, assistantMessage, followUpMessage])
    }
  }, [recommendations, isLoading, searchSummary])

  const handleInitialSearch = async (query: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      timestamp: new Date(),
    }
    setMessages([userMessage])
    await getRecommendations(query, selectedLocation || undefined)
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: currentMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const messageToProcess = currentMessage
    setCurrentMessage("")

    // Add thinking message
    const thinkingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant", 
      content: "Let me think about that...",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, thinkingMessage])

    try {
      // Check if this is about a specific restaurant mentioned in previous messages
      const restaurantMentioned = findMentionedRestaurant(messageToProcess, messages)
      
      if (restaurantMentioned) {
        // This is a follow-up question about a specific restaurant
        await handleRestaurantFollowUp(messageToProcess, restaurantMentioned)
      } else if (
        messageToProcess.toLowerCase().includes("different") ||
        messageToProcess.toLowerCase().includes("other") ||
        messageToProcess.toLowerCase().includes("more") ||
        messageToProcess.toLowerCase().includes("cheaper") ||
        messageToProcess.toLowerCase().includes("closer")
      ) {
        // This is a refinement request
        const refinedQuery = `${initialQuery} but ${messageToProcess}`
        setMessages((prev) => prev.slice(0, -1)) // Remove thinking message
        await getRecommendations(refinedQuery, selectedLocation || undefined)
      } else {
        // This is a new search or general question
        setMessages((prev) => prev.slice(0, -1)) // Remove thinking message
        await getRecommendations(messageToProcess, selectedLocation || undefined)
      }
    } catch (error) {
      console.error('Error processing message:', error)
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: "I'm having trouble processing your request right now. Could you try rephrasing or asking something else?",
        timestamp: new Date(),
      }

      setMessages((prev) => {
        const withoutThinking = prev.slice(0, -1)
        return [...withoutThinking, errorResponse]
      })
    }
  }

  // Helper function to find if a restaurant is mentioned in the message
  const findMentionedRestaurant = (message: string, chatHistory: ChatMessage[]): Restaurant | null => {
    const lowerMessage = message.toLowerCase()
    
    // Look through recent messages for restaurants
    for (const chatMessage of chatHistory.slice(-10).reverse()) {
      if (chatMessage.restaurants) {
        for (const restaurant of chatMessage.restaurants) {
          if (lowerMessage.includes(restaurant.name.toLowerCase()) ||
              lowerMessage.includes('this restaurant') ||
              lowerMessage.includes('this place') ||
              lowerMessage.includes('it ')) {
            return restaurant
          }
        }
      }
    }
    return null
  }

  // Handle follow-up questions about specific restaurants
  const handleRestaurantFollowUp = async (question: string, restaurant: Restaurant) => {
    try {
      const response = await fetch('/api/restaurant-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant,
          specificQuestion: question,
          searchContext: initialQuery,
          userLocation: selectedLocation?.address || selectedLocation?.city,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        const intelligentAnswer: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: data.intelligence.insights,
          timestamp: new Date(),
          followUpQuestions: data.intelligence.followUpQuestions || [],
        }

        setMessages((prev) => {
          const withoutThinking = prev.slice(0, -1)
          return [...withoutThinking, intelligentAnswer]
        })
      } else {
        throw new Error('Failed to get intelligent response')
      }
    } catch (error) {
      // Fallback to basic response
      const basicResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: `Regarding ${restaurant.name}: ${restaurant.description} 

Would you like me to search for more specific information about this restaurant or help you with something else?`,
        timestamp: new Date(),
        followUpQuestions: [
          `How's the food quality at ${restaurant.name}?`,
          `What's the atmosphere like at ${restaurant.name}?`,
          `Is ${restaurant.name} good value for money?`,
          `What are the popular dishes at ${restaurant.name}?`
        ],
      }

      setMessages((prev) => {
        const withoutThinking = prev.slice(0, -1)
        return [...withoutThinking, basicResponse]
      })
    }
  }

  // Handle follow-up question button clicks
  const handleFollowUpQuestionClick = async (question: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Add thinking message
    const thinkingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: "Let me think about that...",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, thinkingMessage])

    // Process the question
    const restaurantMentioned = findMentionedRestaurant(question, messages)
    
    if (restaurantMentioned) {
      await handleRestaurantFollowUp(question, restaurantMentioned)
    } else {
      // Handle as general question about all current restaurants
      await handleGeneralFollowUpQuestion(question)
    }
  }

  // Generate contextual follow-up questions based on search query and results
  const generateContextualFollowUpQuestions = (query: string, restaurants: Restaurant[]): string[] => {
    const lowerQuery = query.toLowerCase()
    const questions: string[] = []

    // Base questions everyone gets
    questions.push("Compare the top 2 restaurants")
    questions.push("Which is most family-friendly?")

    // Query-specific questions
    if (lowerQuery.includes("biryani") || lowerQuery.includes("indian")) {
      questions.push("Which has the most authentic biryani?")
      questions.push("Which place has the best spice levels?")
    } else if (lowerQuery.includes("pizza") || lowerQuery.includes("italian")) {
      questions.push("Which has the best pizza?")
      questions.push("Which is good for a casual dinner?")
    } else if (lowerQuery.includes("sushi") || lowerQuery.includes("japanese")) {
      questions.push("Which has the freshest sushi?")
      questions.push("Which is best for a date night?")
    } else if (lowerQuery.includes("burger") || lowerQuery.includes("american")) {
      questions.push("Which has the best burgers?")
      questions.push("Which is most kid-friendly?")
    } else {
      questions.push(`Which has the best ${query.toLowerCase()}?`)
      questions.push("Which restaurant would you recommend?")
    }

    // Price-based questions
    questions.push("Show me cheaper options")
    questions.push("Which offers the best value?")

    // Occasion-based questions
    questions.push("Which is best for a date?")
    
    return questions.slice(0, 6) // Return top 6 questions
  }

  // Handle general follow-up questions about all restaurants
  const handleGeneralFollowUpQuestion = async (question: string) => {
    try {
      // Use AI to answer general questions about the restaurant set
      const response = await fetch('/api/restaurant-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurants: recommendations, // Use all current recommendations
          specificQuestion: question,
          searchContext: initialQuery,
          userLocation: selectedLocation?.address || selectedLocation?.city,
          isGeneralQuestion: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        const intelligentAnswer: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: data.intelligence.insights,
          timestamp: new Date(),
          followUpQuestions: data.intelligence.followUpQuestions || [],
        }

        setMessages((prev) => {
          const withoutThinking = prev.slice(0, -1)
          return [...withoutThinking, intelligentAnswer]
        })
      } else {
        throw new Error('Failed to get intelligent response')
      }
    } catch (error) {
      // Fallback response
      const fallbackAnswer: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: `That's a great question about "${question}". Let me search for more specific information to give you a better answer.`,
        timestamp: new Date(),
        followUpQuestions: [
          "Tell me more about the top-rated restaurant",
          "Which has the best reviews?",
          "Show me detailed comparisons",
          "Find restaurants with similar cuisine"
        ],
      }

      setMessages((prev) => {
        const withoutThinking = prev.slice(0, -1)
        return [...withoutThinking, fallbackAnswer]
      })
    }
  }

  const handleBackNavigation = () => {
    try {
      // Try to go back in browser history first
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back()
      } else {
        // Fallback to home page
        router.push("/")
      }
    } catch (error) {
      console.warn("Navigation error, falling back to home:", error)
      router.push("/")
    }
  }

  const handleRestaurantClick = async (restaurant: Restaurant) => {
    // Add a message showing interest in this restaurant
    const interestMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: `Tell me more about ${restaurant.name}`,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, interestMessage])

    // Add a loading message while researching
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: `Let me research ${restaurant.name} for you and gather some detailed insights...`,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, loadingMessage])

    try {
      // Call the restaurant intelligence API
      const response = await fetch('/api/restaurant-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant,
          searchContext: initialQuery,
          userLocation: selectedLocation?.address || selectedLocation?.city,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const intelligence = data.intelligence

        // Replace loading message with intelligent analysis (including follow-up questions)
        const intelligentResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant", 
          content: intelligence.insights,
          timestamp: new Date(),
          followUpQuestions: intelligence.followUpQuestions || [],
          isProactive: true,
        }

        setMessages((prev) => {
          // Remove the loading message and add the intelligent response
          const withoutLoading = prev.slice(0, -1)
          return [...withoutLoading, intelligentResponse]
        })

      } else {
        // Fallback if API fails
        const fallbackResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `${restaurant.name} is a ${restaurant.cuisine} restaurant with a ${restaurant.rating} star rating. ${restaurant.description} It's ${restaurant.distance} from you.

What would you like to know more about?
• Food quality and menu highlights
• Atmosphere and dining experience  
• Pricing and value for money
• Best dishes to order
• Reservation requirements`,
          timestamp: new Date(),
        }

        setMessages((prev) => {
          const withoutLoading = prev.slice(0, -1)
          return [...withoutLoading, fallbackResponse]
        })
      }

    } catch (error) {
      console.error('Failed to get restaurant intelligence:', error)
      
      // Fallback response on error
      const errorResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: `I'm having trouble getting detailed information about ${restaurant.name} right now, but I can tell you that it's a ${restaurant.cuisine} restaurant with a ${restaurant.rating} star rating, located ${restaurant.distance} from you.

What specific aspects would you like to know about? I can help with questions about the food, atmosphere, pricing, or anything else!`,
        timestamp: new Date(),
      }

      setMessages((prev) => {
        const withoutLoading = prev.slice(0, -1)
        return [...withoutLoading, errorResponse]
      })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">S</span>
              </div>
              <span className="text-foreground font-playfair text-lg font-semibold">savora</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LocationSelector
              onLocationSelect={setSelectedLocation}
              currentLocation={selectedLocation}
              className="w-48"
            />
            <Button variant="outline" size="sm" onClick={() => setShowPreferences(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Let's find your perfect restaurant!</h2>
              <p className="text-muted-foreground">
                Ask me anything about restaurants, cuisines, or dining preferences.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-3xl ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === "user" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  {message.type === "user" ? (
                    <User className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <Utensils className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                <div className={`space-y-2 ${message.type === "user" ? "text-right" : "text-left"}`}>
                  <Card
                    className={`p-4 ${
                      message.type === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </Card>

                  {message.restaurants && message.restaurants.length > 0 && (
                    <div className="grid gap-3 mt-4">
                      {message.restaurants.map((restaurant) => (
                        <Card
                          key={restaurant.id}
                          className="p-4 hover:bg-muted/50 cursor-pointer transition-all border-l-4 border-l-primary/20 hover:border-l-primary/60 hover:shadow-md"
                          onClick={() => handleRestaurantClick(restaurant)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{restaurant.name}</h3>
                              <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                                Click for details
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span className="text-primary font-medium">{restaurant.rating}</span>
                              <span>★</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{restaurant.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {restaurant.distance}
                              </span>
                              <span>{restaurant.priceRange}</span>
                              <span>{restaurant.cuisine}</span>
                            </div>
                            <span className="text-primary font-medium">{restaurant.matchScore}% match</span>
                          </div>
                          {restaurant.whyRecommended && (
                            <p className="text-xs text-primary mt-2 font-medium">{restaurant.whyRecommended}</p>
                          )}
                          <div className="mt-3 pt-2 border-t border-border/20">
                            <p className="text-xs text-muted-foreground italic">
                              💡 I can tell you about the food quality, atmosphere, pricing, and more!
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Quick questions:</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-1">
                        {message.followUpQuestions.slice(0, 4).map((question, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="justify-start h-auto p-3 text-left hover:bg-primary/5 hover:border-primary/30 hover:text-primary text-sm"
                            onClick={() => handleFollowUpQuestionClick(question)}
                          >
                            <MessageSquare className="w-3 h-3 mr-2 flex-shrink-0" />
                            <span className="text-left">{question}</span>
                          </Button>
                        ))}
                      </div>
                      {message.followUpQuestions.length > 4 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          +{message.followUpQuestions.length - 4} more questions - just ask me anything!
                        </p>
                      )}
                    </div>
                  )}

                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Utensils className="w-4 h-4 text-muted-foreground" />
              </div>
              <Card className="p-4 bg-muted">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Finding restaurants...</span>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about restaurants, refine your search, or get recommendations..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={!currentMessage.trim() || isLoading} size="sm">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Try: "Show me cheaper options", "Find something closer", "I want vegetarian food instead"
          </p>
        </div>
      </div>

      <PreferenceModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        onSave={savePreferences}
        initialPreferences={preferences}
      />
    </div>
  )
}
