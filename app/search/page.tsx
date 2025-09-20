"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, ArrowLeft, MapPin, Settings, Bot, User } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePreferences } from "@/hooks/use-preferences"
import { useAIRecommendations, type Restaurant } from "@/hooks/use-ai-recommendations"
import LocationSelector from "@/components/location-selector"
import PreferenceModal from "@/components/preference-modal"
import type { LocationData } from "@/hooks/use-location"

interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  restaurants?: Restaurant[]
  timestamp: Date
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
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

  useEffect(() => {
    if (initialQuery) {
      handleInitialSearch(initialQuery)
    }
  }, [initialQuery])

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
      setMessages((prev) => [...prev, assistantMessage])
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
    setCurrentMessage("")

    // Check if this is a refinement request or new search
    if (
      currentMessage.toLowerCase().includes("different") ||
      currentMessage.toLowerCase().includes("other") ||
      currentMessage.toLowerCase().includes("more") ||
      currentMessage.toLowerCase().includes("cheaper") ||
      currentMessage.toLowerCase().includes("closer")
    ) {
      // This is a refinement - use the original query with modifications
      const refinedQuery = `${initialQuery} but ${currentMessage}`
      await getRecommendations(refinedQuery, selectedLocation || undefined)
    } else {
      // This is a new search
      await getRecommendations(currentMessage, selectedLocation || undefined)
    }
  }

  const handleRestaurantClick = (restaurant: Restaurant) => {
    // Add a message showing interest in this restaurant
    const interestMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: `Tell me more about ${restaurant.name}`,
      timestamp: new Date(),
    }

    const responseMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: `${restaurant.name} is a great choice! ${restaurant.description} It has a ${restaurant.rating} star rating and is ${restaurant.distance} away. ${restaurant.whyRecommended}`,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, interestMessage, responseMessage])
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
              onClick={() => router.push("/")}
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
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
                    <Bot className="w-4 h-4 text-muted-foreground" />
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
                          className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleRestaurantClick(restaurant)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{restaurant.name}</h3>
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
                        </Card>
                      ))}
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
                <Bot className="w-4 h-4 text-muted-foreground" />
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
