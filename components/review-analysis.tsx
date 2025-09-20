"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  Clock,
  Utensils,
  Heart,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react"

interface ReviewAnalysis {
  overallSentiment: "positive" | "negative" | "mixed" | "neutral"
  sentimentScore: number
  keyStrengths: string[]
  keyWeaknesses: string[]
  foodQuality: {
    score: number
    highlights: string[]
    concerns: string[]
  }
  service: {
    score: number
    highlights: string[]
    concerns: string[]
  }
  ambiance: {
    score: number
    description: string
  }
  value: {
    score: number
    notes: string
  }
  popularDishes: string[]
  dietaryFriendliness: {
    vegetarian: boolean
    vegan: boolean
    glutenFree: boolean
    notes: string
  }
  bestTimes: string[]
  crowdType: string[]
  summary: string
  recommendationScore: number
}

interface ReviewAnalysisProps {
  restaurantName: string
  reviews: Array<{ rating: number; text: string }>
  onAnalysisComplete?: (analysis: ReviewAnalysis) => void
}

export default function ReviewAnalysisComponent({ restaurantName, reviews, onAnalysisComplete }: ReviewAnalysisProps) {
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeReviews = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/analyze-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantName,
          reviews,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze reviews")
      }

      const result = await response.json()
      setAnalysis(result)
      setIsExpanded(true)
      onAnalysisComplete?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setIsLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-400"
      case "negative":
        return "text-red-400"
      case "mixed":
        return "text-yellow-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-400"
    if (score >= 3) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <div className="space-y-4">
      {!analysis && !isLoading && (
        <Button
          onClick={analyzeReviews}
          variant="outline"
          className="glass-effect border-white/30 text-foreground hover:bg-white/20 w-full bg-transparent"
          disabled={reviews.length === 0}
        >
          <Star className="w-4 h-4 mr-2" />
          Analyze {reviews.length} Reviews with AI
        </Button>
      )}

      {isLoading && (
        <Card className="glass-effect border-white/30">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-foreground font-medium">Analyzing reviews with AI...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Processing {reviews.length} reviews to extract insights
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="glass-effect border-red-400/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card className="glass-effect border-white/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">AI Review Analysis</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {/* Quick Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Overall:</span>
                <span className={`font-medium capitalize ${getSentimentColor(analysis.overallSentiment)}`}>
                  {analysis.overallSentiment}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Recommendation:</span>
                <span className={`font-medium ${getScoreColor(analysis.recommendationScore / 20)}`}>
                  {analysis.recommendationScore}%
                </span>
              </div>
            </div>
          </CardHeader>

          {isExpanded && (
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <p className="text-foreground leading-relaxed">{analysis.summary}</p>
              </div>

              {/* Scores Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.foodQuality.score)}`}>
                    {analysis.foodQuality.score.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Food Quality</div>
                  <Progress value={analysis.foodQuality.score * 20} className="mt-2 h-2" />
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.service.score)}`}>
                    {analysis.service.score.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Service</div>
                  <Progress value={analysis.service.score * 20} className="mt-2 h-2" />
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.ambiance.score)}`}>
                    {analysis.ambiance.score.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Ambiance</div>
                  <Progress value={analysis.ambiance.score * 20} className="mt-2 h-2" />
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.value.score)}`}>
                    {analysis.value.score.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Value</div>
                  <Progress value={analysis.value.score * 20} className="mt-2 h-2" />
                </div>
              </div>

              <Separator className="bg-white/20" />

              {/* Strengths and Weaknesses */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    Key Strengths
                  </h4>
                  <div className="space-y-2">
                    {analysis.keyStrengths.map((strength, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Heart className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                        <span className="text-sm text-foreground">{strength}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    Areas for Improvement
                  </h4>
                  <div className="space-y-2">
                    {analysis.keyWeaknesses.map((weakness, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 text-red-400 mt-1 flex-shrink-0" />
                        <span className="text-sm text-foreground">{weakness}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-white/20" />

              {/* Popular Dishes */}
              {analysis.popularDishes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-primary" />
                    Popular Dishes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.popularDishes.map((dish, index) => (
                      <Badge key={index} variant="outline" className="border-primary/40 text-primary bg-primary/10">
                        {dish}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Times and Crowd */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Best Times to Visit
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.bestTimes.map((time, index) => (
                      <Badge key={index} variant="secondary" className="bg-secondary/80 text-secondary-foreground">
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Typical Crowd
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.crowdType.map((crowd, index) => (
                      <Badge key={index} variant="secondary" className="bg-secondary/80 text-secondary-foreground">
                        {crowd}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dietary Friendliness */}
              {analysis.dietaryFriendliness.notes && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Dietary Accommodations</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {analysis.dietaryFriendliness.vegetarian && (
                      <Badge variant="outline" className="border-green-400/40 text-green-400 bg-green-400/10">
                        Vegetarian Friendly
                      </Badge>
                    )}
                    {analysis.dietaryFriendliness.vegan && (
                      <Badge variant="outline" className="border-green-400/40 text-green-400 bg-green-400/10">
                        Vegan Options
                      </Badge>
                    )}
                    {analysis.dietaryFriendliness.glutenFree && (
                      <Badge variant="outline" className="border-green-400/40 text-green-400 bg-green-400/10">
                        Gluten-Free Options
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.dietaryFriendliness.notes}</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
