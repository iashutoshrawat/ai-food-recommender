// Search Status Monitor for Development and Debugging
import type { SearchPerformanceMetrics, SearchAnalytics } from "@/types/restaurant-search"
import { restaurantSearchCache } from "@/lib/search-cache"

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    openaiSearch: 'up' | 'down' | 'degraded'
    cache: 'up' | 'down' | 'degraded'
    fallback: 'up' | 'down' | 'degraded'
  }
  performance: {
    averageResponseTime: number
    successRate: number
    errorRate: number
    cacheHitRate: number
  }
  lastUpdated: string
}

export class SearchStatusMonitor {
  private static instance: SearchStatusMonitor | null = null
  private metrics: Map<string, SearchPerformanceMetrics[]> = new Map()
  private analytics: SearchAnalytics[] = []
  private maxMetricsAge = 60 * 60 * 1000 // 1 hour
  private maxAnalyticsEntries = 1000

  private constructor() {
    // Cleanup old metrics every 5 minutes
    setInterval(() => this.cleanupOldData(), 5 * 60 * 1000)
  }

  static getInstance(): SearchStatusMonitor {
    if (!SearchStatusMonitor.instance) {
      SearchStatusMonitor.instance = new SearchStatusMonitor()
    }
    return SearchStatusMonitor.instance
  }

  /**
   * Record search performance metrics
   */
  recordSearchMetrics(sessionId: string, metrics: SearchPerformanceMetrics): void {
    if (!this.metrics.has(sessionId)) {
      this.metrics.set(sessionId, [])
    }
    
    const sessionMetrics = this.metrics.get(sessionId)!
    sessionMetrics.push({
      ...metrics,
      searchDuration: Date.now()
    })

    // Keep only recent metrics
    const cutoff = Date.now() - this.maxMetricsAge
    const recentMetrics = sessionMetrics.filter(m => m.searchDuration > cutoff)
    this.metrics.set(sessionId, recentMetrics)
  }

  /**
   * Record search analytics
   */
  recordSearchAnalytics(analytics: SearchAnalytics): void {
    this.analytics.push(analytics)
    
    // Keep only recent entries
    if (this.analytics.length > this.maxAnalyticsEntries) {
      this.analytics = this.analytics.slice(-this.maxAnalyticsEntries)
    }
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealth {
    const recentMetrics = this.getRecentMetrics()
    const cacheStats = restaurantSearchCache.getStats()
    
    // Calculate performance metrics
    const averageResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.searchDuration, 0) / recentMetrics.length
      : 0

    const successfulSearches = recentMetrics.filter(m => m.restaurantsReturned > 0)
    const successRate = recentMetrics.length > 0 
      ? (successfulSearches.length / recentMetrics.length) * 100 
      : 100

    const errorRate = 100 - successRate
    const cacheHitRate = cacheStats.hitRate

    // Determine service status
    const openaiStatus = this.determineOpenAIStatus(recentMetrics)
    const cacheStatus = this.determineCacheStatus(cacheStats)
    const fallbackStatus = this.determineFallbackStatus(recentMetrics)

    // Overall system health
    const overallStatus = this.determineOverallHealth({
      openaiStatus,
      cacheStatus,
      fallbackStatus,
      successRate,
      averageResponseTime
    })

    return {
      status: overallStatus,
      services: {
        openaiSearch: openaiStatus,
        cache: cacheStatus,
        fallback: fallbackStatus
      },
      performance: {
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100
      },
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get recent search trends
   */
  getSearchTrends(timeframeMs: number = 60 * 60 * 1000): {
    totalSearches: number
    popularQueries: Array<{ query: string; count: number }>
    popularLocations: Array<{ location: string; count: number }>
    dataSourceBreakdown: Record<string, number>
    qualityTrends: Array<{ timestamp: number; averageQuality: number }>
  } {
    const cutoff = Date.now() - timeframeMs
    const recentAnalytics = this.analytics.filter(a => a.timestamp > cutoff)

    // Count popular queries
    const queryCounts = new Map<string, number>()
    const locationCounts = new Map<string, number>()
    const dataSourceCounts = new Map<string, number>()

    for (const analytics of recentAnalytics) {
      // Query popularity
      const query = analytics.searchQuery.toLowerCase()
      queryCounts.set(query, (queryCounts.get(query) || 0) + 1)

      // Location popularity
      const location = analytics.location.city || 'Unknown'
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1)

      // Data source breakdown
      const dataSource = analytics.results.dataSource
      dataSourceCounts.set(dataSource, (dataSourceCounts.get(dataSource) || 0) + 1)
    }

    // Sort and limit results
    const popularQueries = Array.from(queryCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))

    const popularLocations = Array.from(locationCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }))

    const dataSourceBreakdown = Object.fromEntries(dataSourceCounts.entries())

    // Quality trends (hourly averages)
    const qualityTrends = this.calculateQualityTrends(recentAnalytics)

    return {
      totalSearches: recentAnalytics.length,
      popularQueries,
      popularLocations,
      dataSourceBreakdown,
      qualityTrends
    }
  }

  /**
   * Get detailed performance report
   */
  getPerformanceReport(): {
    summary: {
      totalSearches: number
      averageResponseTime: number
      p95ResponseTime: number
      errorRate: number
      cacheEfficiency: number
    }
    byDataSource: Record<string, {
      count: number
      averageResponseTime: number
      successRate: number
      averageQuality: number
    }>
    recommendations: string[]
  } {
    const allMetrics = Array.from(this.metrics.values()).flat()
    
    if (allMetrics.length === 0) {
      return {
        summary: {
          totalSearches: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          errorRate: 0,
          cacheEfficiency: 0
        },
        byDataSource: {},
        recommendations: ['No search data available yet']
      }
    }

    // Calculate summary stats
    const responseTimes = allMetrics.map(m => m.searchDuration).sort((a, b) => a - b)
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)]
    
    const successful = allMetrics.filter(m => m.restaurantsReturned > 0)
    const errorRate = ((allMetrics.length - successful.length) / allMetrics.length) * 100

    const cacheStats = restaurantSearchCache.getStats()
    const cacheEfficiency = cacheStats.hitRate

    // Group by data source
    const byDataSource: Record<string, any> = {}
    for (const metric of allMetrics) {
      if (!byDataSource[metric.dataSource]) {
        byDataSource[metric.dataSource] = {
          metrics: [],
          analytics: []
        }
      }
      byDataSource[metric.dataSource].metrics.push(metric)
    }

    // Calculate per-source stats
    for (const [source, data] of Object.entries(byDataSource)) {
      const metrics = data.metrics
      const avgResponseTime = metrics.reduce((sum: number, m: any) => sum + m.searchDuration, 0) / metrics.length
      const successfulCount = metrics.filter((m: any) => m.restaurantsReturned > 0).length
      const successRate = (successfulCount / metrics.length) * 100
      
      const relatedAnalytics = this.analytics.filter(a => a.results.dataSource === source)
      const avgQuality = relatedAnalytics.length > 0
        ? relatedAnalytics.reduce((sum, a) => sum + a.results.qualityScore, 0) / relatedAnalytics.length
        : 0

      byDataSource[source] = {
        count: metrics.length,
        averageResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        averageQuality: Math.round(avgQuality * 100) / 100
      }
    }

    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations({
      averageResponseTime,
      errorRate,
      cacheEfficiency,
      byDataSource
    })

    return {
      summary: {
        totalSearches: allMetrics.length,
        averageResponseTime: Math.round(averageResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        cacheEfficiency: Math.round(cacheEfficiency * 100) / 100
      },
      byDataSource,
      recommendations
    }
  }

  // Private helper methods

  private getRecentMetrics(timeframeMs: number = 60 * 60 * 1000): SearchPerformanceMetrics[] {
    const cutoff = Date.now() - timeframeMs
    return Array.from(this.metrics.values())
      .flat()
      .filter(m => m.searchDuration > cutoff)
  }

  private determineOpenAIStatus(metrics: SearchPerformanceMetrics[]): 'up' | 'down' | 'degraded' {
    if (metrics.length === 0) return 'up'
    
    const webSearchMetrics = metrics.filter(m => m.dataSource === 'web_search')
    if (webSearchMetrics.length === 0) return 'down'
    
    const successRate = webSearchMetrics.filter(m => m.restaurantsReturned > 0).length / webSearchMetrics.length
    
    if (successRate >= 0.9) return 'up'
    if (successRate >= 0.5) return 'degraded'
    return 'down'
  }

  private determineCacheStatus(cacheStats: any): 'up' | 'down' | 'degraded' {
    if (cacheStats.hitRate >= 30) return 'up'
    if (cacheStats.hitRate >= 10) return 'degraded'
    return 'down'
  }

  private determineFallbackStatus(metrics: SearchPerformanceMetrics[]): 'up' | 'down' | 'degraded' {
    const fallbackMetrics = metrics.filter(m => m.dataSource === 'fallback')
    if (fallbackMetrics.length === 0) return 'up' // No fallbacks needed
    
    const successRate = fallbackMetrics.filter(m => m.restaurantsReturned > 0).length / fallbackMetrics.length
    return successRate >= 0.95 ? 'up' : 'degraded'
  }

  private determineOverallHealth(params: {
    openaiStatus: string
    cacheStatus: string
    fallbackStatus: string
    successRate: number
    averageResponseTime: number
  }): 'healthy' | 'degraded' | 'unhealthy' {
    const { openaiStatus, successRate, averageResponseTime } = params
    
    if (successRate < 50) return 'unhealthy'
    if (averageResponseTime > 10000) return 'unhealthy'
    if (openaiStatus === 'down') return 'degraded'
    if (successRate < 80) return 'degraded'
    if (averageResponseTime > 5000) return 'degraded'
    
    return 'healthy'
  }

  private calculateQualityTrends(analytics: SearchAnalytics[]): Array<{ timestamp: number; averageQuality: number }> {
    // Group by hour and calculate average quality
    const hourlyGroups = new Map<number, number[]>()
    
    for (const item of analytics) {
      const hourKey = Math.floor(item.timestamp / (60 * 60 * 1000))
      if (!hourlyGroups.has(hourKey)) {
        hourlyGroups.set(hourKey, [])
      }
      hourlyGroups.get(hourKey)!.push(item.results.qualityScore)
    }
    
    return Array.from(hourlyGroups.entries())
      .map(([hourKey, qualities]) => ({
        timestamp: hourKey * 60 * 60 * 1000,
        averageQuality: qualities.reduce((a, b) => a + b, 0) / qualities.length
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  private generatePerformanceRecommendations(data: any): string[] {
    const recommendations: string[] = []
    
    if (data.averageResponseTime > 5000) {
      recommendations.push('Response times are slow. Consider optimizing API calls or increasing cache usage.')
    }
    
    if (data.errorRate > 10) {
      recommendations.push('Error rate is high. Review error handling and fallback mechanisms.')
    }
    
    if (data.cacheEfficiency < 20) {
      recommendations.push('Cache hit rate is low. Review cache key generation and TTL settings.')
    }
    
    const fallbackUsage = data.byDataSource['fallback']?.count || 0
    const totalSearches = Object.values(data.byDataSource).reduce((sum: number, source: any) => sum + source.count, 0)
    
    if (fallbackUsage / totalSearches > 0.3) {
      recommendations.push('High fallback usage detected. Check OpenAI API status and rate limits.')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performance looks good!')
    }
    
    return recommendations
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - this.maxMetricsAge
    
    // Clean up old metrics
    for (const [sessionId, sessionMetrics] of this.metrics.entries()) {
      const recentMetrics = sessionMetrics.filter(m => m.searchDuration > cutoff)
      if (recentMetrics.length === 0) {
        this.metrics.delete(sessionId)
      } else {
        this.metrics.set(sessionId, recentMetrics)
      }
    }
    
    // Clean up old analytics
    this.analytics = this.analytics.filter(a => a.timestamp > cutoff)
  }
}

// Export singleton instance
export const searchStatusMonitor = SearchStatusMonitor.getInstance()