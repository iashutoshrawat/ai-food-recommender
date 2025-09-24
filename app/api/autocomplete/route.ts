import { TomTomService } from "@/lib/tomtom-service"
import type { LocationData } from "@/hooks/use-location"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const query = searchParams.get("q")
    const limit = parseInt(searchParams.get("limit") || "5")

    if (!query || query.trim().length < 2) {
      return Response.json({ 
        error: "Query parameter 'q' is required and must be at least 2 characters" 
      }, { status: 400 })
    }

    // Check if TomTom API key is available
    const tomtomApiKey = process.env.TOMTOM_API_KEY
    
    if (!tomtomApiKey || tomtomApiKey === 'your_tomtom_api_key_here') {
      console.warn("TomTom API key not configured, falling back to mock autocomplete")
      return getMockAutocompleteResults(query, limit)
    }

    try {
      // Use TomTom API for real autocomplete
      const tomtomService = new TomTomService(tomtomApiKey, {
        countrySet: '', // Enable international search
        limit,
      })
      
      const results = await tomtomService.autocomplete({
        query: query.trim(),
        limit,
      })

      return Response.json({
        query: query.trim(),
        results,
        source: 'tomtom'
      })
    } catch (tomtomError) {
      console.error("TomTom autocomplete API error:", tomtomError)
      
      // Fallback to mock data if TomTom API fails
      console.warn("Falling back to mock autocomplete due to API error")
      return getMockAutocompleteResults(query, limit)
    }
  } catch (error) {
    console.error("Autocomplete error:", error)
    return Response.json({ error: "Failed to get autocomplete suggestions" }, { status: 500 })
  }
}

// Fallback mock autocomplete function
function getMockAutocompleteResults(query: string, limit: number = 5) {
  const mockLocations: LocationData[] = [
    // US Cities
    {
      latitude: 40.7128,
      longitude: -74.006,
      address: "New York, NY, USA",
      city: "New York",
      state: "NY",
      country: "USA",
      postalCode: "10001",
    },
    {
      latitude: 34.0522,
      longitude: -118.2437,
      address: "Los Angeles, CA, USA",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      postalCode: "90001",
    },
    {
      latitude: 41.8781,
      longitude: -87.6298,
      address: "Chicago, IL, USA",
      city: "Chicago",
      state: "IL",
      country: "USA",
      postalCode: "60601",
    },
    {
      latitude: 37.7749,
      longitude: -122.4194,
      address: "San Francisco, CA, USA",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94102",
    },
    {
      latitude: 25.7617,
      longitude: -80.1918,
      address: "Miami, FL, USA",
      city: "Miami",
      state: "FL",
      country: "USA",
      postalCode: "33101",
    },
    
    // International Cities - India
    {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "New Delhi, Delhi, India",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      postalCode: "110001",
    },
    {
      latitude: 19.0760,
      longitude: 72.8777,
      address: "Mumbai, Maharashtra, India",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400001",
    },
    {
      latitude: 12.9716,
      longitude: 77.5946,
      address: "Bangalore, Karnataka, India",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      postalCode: "560001",
    },
    {
      latitude: 22.5726,
      longitude: 88.3639,
      address: "Kolkata, West Bengal, India",
      city: "Kolkata",
      state: "West Bengal",
      country: "India",
      postalCode: "700001",
    },
    {
      latitude: 17.3850,
      longitude: 78.4867,
      address: "Hyderabad, Telangana, India",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500001",
    },

    // International Cities - Europe
    {
      latitude: 51.5074,
      longitude: -0.1278,
      address: "London, England, United Kingdom",
      city: "London",
      state: "England",
      country: "United Kingdom",
      postalCode: "SW1A 1AA",
    },
    {
      latitude: 48.8566,
      longitude: 2.3522,
      address: "Paris, Île-de-France, France",
      city: "Paris",
      state: "Île-de-France",
      country: "France",
      postalCode: "75001",
    },
    {
      latitude: 52.5200,
      longitude: 13.4050,
      address: "Berlin, Germany",
      city: "Berlin",
      state: "Berlin",
      country: "Germany",
      postalCode: "10115",
    },
    {
      latitude: 41.9028,
      longitude: 12.4964,
      address: "Rome, Lazio, Italy",
      city: "Rome",
      state: "Lazio",
      country: "Italy",
      postalCode: "00100",
    },
    {
      latitude: 40.4168,
      longitude: -3.7038,
      address: "Madrid, Community of Madrid, Spain",
      city: "Madrid",
      state: "Community of Madrid",
      country: "Spain",
      postalCode: "28001",
    },

    // International Cities - Asia Pacific
    {
      latitude: 35.6762,
      longitude: 139.6503,
      address: "Tokyo, Japan",
      city: "Tokyo",
      state: "Tokyo",
      country: "Japan",
      postalCode: "100-0001",
    },
    {
      latitude: 37.5665,
      longitude: 126.9780,
      address: "Seoul, South Korea",
      city: "Seoul",
      state: "Seoul",
      country: "South Korea",
      postalCode: "04524",
    },
    {
      latitude: 1.3521,
      longitude: 103.8198,
      address: "Singapore, Singapore",
      city: "Singapore",
      state: "Singapore",
      country: "Singapore",
      postalCode: "018989",
    },
    {
      latitude: -33.8688,
      longitude: 151.2093,
      address: "Sydney, NSW, Australia",
      city: "Sydney",
      state: "NSW",
      country: "Australia",
      postalCode: "2000",
    },
    
    // International Cities - Middle East & Africa
    {
      latitude: 25.2048,
      longitude: 55.2708,
      address: "Dubai, United Arab Emirates",
      city: "Dubai",
      state: "Dubai",
      country: "United Arab Emirates",
      postalCode: "00000",
    },
    {
      latitude: 30.0444,
      longitude: 31.2357,
      address: "Cairo, Egypt",
      city: "Cairo",
      state: "Cairo",
      country: "Egypt",
      postalCode: "11511",
    },
    
    // International Cities - Americas
    {
      latitude: 43.6532,
      longitude: -79.3832,
      address: "Toronto, ON, Canada",
      city: "Toronto",
      state: "ON",
      country: "Canada",
      postalCode: "M5H 2N2",
    },
    {
      latitude: 19.4326,
      longitude: -99.1332,
      address: "Mexico City, Mexico",
      city: "Mexico City",
      state: "CDMX",
      country: "Mexico",
      postalCode: "01000",
    },
    {
      latitude: -23.5505,
      longitude: -46.6333,
      address: "São Paulo, SP, Brazil",
      city: "São Paulo",
      state: "SP",
      country: "Brazil",
      postalCode: "01310-100",
    },
  ]

  const normalizedQuery = query.toLowerCase().trim()
  
  // Filter locations that match the query
  const filtered = mockLocations.filter(location => {
    return (
      location.city?.toLowerCase().includes(normalizedQuery) ||
      location.address?.toLowerCase().includes(normalizedQuery) ||
      location.country?.toLowerCase().includes(normalizedQuery) ||
      location.state?.toLowerCase().includes(normalizedQuery)
    )
  })

  // Sort by relevance (exact matches first, then partial matches)
  const sorted = filtered.sort((a, b) => {
    const aCity = a.city?.toLowerCase() || ''
    const bCity = b.city?.toLowerCase() || ''
    
    // Exact city name matches first
    if (aCity.startsWith(normalizedQuery) && !bCity.startsWith(normalizedQuery)) return -1
    if (!aCity.startsWith(normalizedQuery) && bCity.startsWith(normalizedQuery)) return 1
    
    // Then by city name alphabetically
    return aCity.localeCompare(bCity)
  })

  return Response.json({
    query: query.trim(),
    results: sorted.slice(0, limit),
    source: 'mock'
  })
}