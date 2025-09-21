// TomTom API Service Utility
import type {
  TomTomConfig,
  TomTomSearchParams,
  TomTomSearchResponse,
  TomTomReverseGeocodeParams,
  TomTomReverseGeocodeResponse,
  TomTomAutocompleteParams,
  TomTomAutocompleteResponse,
  TomTomError,
  TomTomSearchResult,
} from '@/types/tomtom'
import type { LocationData } from '@/hooks/use-location'

export class TomTomService {
  private config: Required<TomTomConfig>

  constructor(apiKey: string, options?: Partial<TomTomConfig>) {
    this.config = {
      apiKey,
      baseUrl: 'https://api.tomtom.com/search/2',
      language: 'en-US',
      countrySet: '', // Empty string enables international search
      limit: 10,
      ...options,
    }
  }

  /**
   * Search for addresses and places using TomTom Search API
   */
  async searchAddress(params: TomTomSearchParams): Promise<LocationData[]> {
    try {
      const searchParams = new URLSearchParams({
        key: this.config.apiKey,
        limit: String(params.limit || this.config.limit),
        language: params.language || this.config.language,
        countrySet: params.countrySet || this.config.countrySet,
      })

      // Add optional position bias
      if (params.lat && params.lon) {
        searchParams.append('lat', String(params.lat))
        searchParams.append('lon', String(params.lon))
      }

      // Add optional radius
      if (params.radius) {
        searchParams.append('radius', String(params.radius))
      }

      const url = `${this.config.baseUrl}/search/${encodeURIComponent(params.query)}.json?${searchParams.toString()}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData: TomTomError = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message || 
          errorData.errorText || 
          `TomTom API error: ${response.status} ${response.statusText}`
        )
      }

      const data: TomTomSearchResponse = await response.json()
      return this.transformSearchResults(data.results)
    } catch (error) {
      console.error('TomTom search error:', error)
      throw error
    }
  }

  /**
   * Reverse geocode coordinates to get address information
   */
  async reverseGeocode(params: TomTomReverseGeocodeParams): Promise<LocationData | null> {
    try {
      const searchParams = new URLSearchParams({
        key: this.config.apiKey,
        language: params.language || this.config.language,
      })

      // Add optional radius
      if (params.radius) {
        searchParams.append('radius', String(params.radius))
      }

      const url = `${this.config.baseUrl}/reverseGeocode/${params.lat},${params.lon}.json?${searchParams.toString()}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData: TomTomError = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message || 
          errorData.errorText || 
          `TomTom API error: ${response.status} ${response.statusText}`
        )
      }

      const data: TomTomReverseGeocodeResponse = await response.json()
      
      if (data.addresses && data.addresses.length > 0) {
        return this.transformReverseGeocodeResult(data.addresses[0], params.lat, params.lon)
      }
      
      return null
    } catch (error) {
      console.error('TomTom reverse geocode error:', error)
      throw error
    }
  }

  /**
   * Get autocomplete suggestions for partial addresses
   */
  async autocomplete(params: TomTomAutocompleteParams): Promise<LocationData[]> {
    try {
      const searchParams = new URLSearchParams({
        key: this.config.apiKey,
        limit: String(params.limit || 5),
        language: params.language || this.config.language,
        countrySet: params.countrySet || this.config.countrySet,
      })

      // Add optional position bias
      if (params.lat && params.lon) {
        searchParams.append('lat', String(params.lat))
        searchParams.append('lon', String(params.lon))
      }

      // Add optional radius
      if (params.radius) {
        searchParams.append('radius', String(params.radius))
      }

      const url = `${this.config.baseUrl}/autocomplete/${encodeURIComponent(params.query)}.json?${searchParams.toString()}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData: TomTomError = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message || 
          errorData.errorText || 
          `TomTom API error: ${response.status} ${response.statusText}`
        )
      }

      const data: TomTomAutocompleteResponse = await response.json()
      return this.transformAutocompleteResults(data.results)
    } catch (error) {
      console.error('TomTom autocomplete error:', error)
      throw error
    }
  }

  /**
   * Transform TomTom search results to LocationData format
   */
  private transformSearchResults(results: TomTomSearchResult[]): LocationData[] {
    return results.map(result => this.transformSearchResult(result))
  }

  /**
   * Transform a single TomTom search result to LocationData format
   */
  private transformSearchResult(result: TomTomSearchResult): LocationData {
    const address = result.address
    
    return {
      latitude: result.position.lat,
      longitude: result.position.lon,
      address: address.freeformAddress || this.buildAddressString(address),
      city: address.municipality || address.localName,
      state: address.countrySubdivision,
      country: address.country,
      postalCode: address.postalCode,
    }
  }

  /**
   * Transform TomTom reverse geocode result to LocationData format
   */
  private transformReverseGeocodeResult(
    result: { address: any }, 
    lat: number, 
    lon: number
  ): LocationData {
    const address = result.address
    
    return {
      latitude: lat,
      longitude: lon,
      address: address.freeformAddress || this.buildAddressString(address),
      city: address.municipality || address.localName,
      state: address.countrySubdivision,
      country: address.country,
      postalCode: address.postalCode,
    }
  }

  /**
   * Transform TomTom autocomplete results to LocationData format
   */
  private transformAutocompleteResults(results: any[]): LocationData[] {
    return results.map(result => {
      const address = result.address
      
      return {
        latitude: result.position?.lat || 0,
        longitude: result.position?.lon || 0,
        address: address.freeformAddress || this.buildAddressString(address),
        city: address.municipality || address.localName,
        state: address.countrySubdivision,
        country: address.country,
        postalCode: address.postalCode,
      }
    }).filter(location => location.latitude !== 0 && location.longitude !== 0)
  }

  /**
   * Build a formatted address string from TomTom address components
   */
  private buildAddressString(address: any): string {
    const parts: string[] = []
    
    // Street address
    if (address.streetNumber && address.streetName) {
      parts.push(`${address.streetNumber} ${address.streetName}`)
    } else if (address.streetName) {
      parts.push(address.streetName)
    }
    
    // City
    if (address.municipality || address.localName) {
      parts.push(address.municipality || address.localName)
    }
    
    // State/Region
    if (address.countrySubdivision) {
      parts.push(address.countrySubdivision)
    }
    
    // Country (only if not US to keep addresses concise)
    if (address.country && address.country !== 'United States') {
      parts.push(address.country)
    }
    
    return parts.join(', ')
  }

  /**
   * Check if the API key is valid (basic format check)
   */
  isValidApiKey(): boolean {
    return typeof this.config.apiKey === 'string' && 
           this.config.apiKey.length > 10 && 
           this.config.apiKey !== 'your_tomtom_api_key_here'
  }

  /**
   * Get the current configuration
   */
  getConfig(): TomTomConfig {
    return { ...this.config }
  }
}