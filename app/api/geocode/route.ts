import { TomTomService } from "@/lib/tomtom-service"
import { NextRequest } from "next/server"

// Force this route to be dynamic since it uses search parameters
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const address = searchParams.get("address")

    if (!address) {
      return Response.json({ error: "Address parameter is required" }, { status: 400 })
    }

    // Check if TomTom API key is available
    const tomtomApiKey = process.env.TOMTOM_API_KEY
    
    if (!tomtomApiKey || tomtomApiKey === 'your_tomtom_api_key_here') {
      console.warn("TomTom API key not configured, falling back to mock data")
      return getMockGeocodingResult(address)
    }

    try {
      // Use TomTom API for real geocoding with international search enabled
      const tomtomService = new TomTomService(tomtomApiKey, {
        countrySet: '', // Enable international search
        limit: 5,
      })
      const results = await tomtomService.searchAddress({
        query: address,
        limit: 5,
      })

      if (results.length > 0) {
        // Return the best match (first result)
        return Response.json(results[0])
      } else {
        // No results found
        return Response.json({
          error: "Location not found",
          message: `No results found for "${address}"`
        }, { status: 404 })
      }
    } catch (tomtomError) {
      console.error("TomTom API error:", tomtomError)
      
      // Fallback to mock data if TomTom API fails
      console.warn("Falling back to mock geocoding due to API error")
      return getMockGeocodingResult(address)
    }
  } catch (error) {
    console.error("Geocoding error:", error)
    return Response.json({ error: "Failed to geocode address" }, { status: 500 })
  }
}

// Fallback mock geocoding function
function getMockGeocodingResult(address: string) {
  const mockLocations: Record<string, any> = {
    // US Cities
    "new york": {
      latitude: 40.7128,
      longitude: -74.006,
      address: "New York, NY, USA",
      city: "New York",
      state: "NY",
      country: "USA",
      postalCode: "10001",
    },
    "los angeles": {
      latitude: 34.0522,
      longitude: -118.2437,
      address: "Los Angeles, CA, USA",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      postalCode: "90001",
    },
    chicago: {
      latitude: 41.8781,
      longitude: -87.6298,
      address: "Chicago, IL, USA",
      city: "Chicago",
      state: "IL",
      country: "USA",
      postalCode: "60601",
    },
    "san francisco": {
      latitude: 37.7749,
      longitude: -122.4194,
      address: "San Francisco, CA, USA",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94102",
    },
    miami: {
      latitude: 25.7617,
      longitude: -80.1918,
      address: "Miami, FL, USA",
      city: "Miami",
      state: "FL",
      country: "USA",
      postalCode: "33101",
    },
    
    // International Cities - India
    delhi: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "New Delhi, Delhi, India",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      postalCode: "110001",
    },
    "new delhi": {
      latitude: 28.7041,
      longitude: 77.1025,
      address: "New Delhi, Delhi, India",
      city: "New Delhi",
      state: "Delhi",
      country: "India",
      postalCode: "110001",
    },
    mumbai: {
      latitude: 19.0760,
      longitude: 72.8777,
      address: "Mumbai, Maharashtra, India",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400001",
    },
    bangalore: {
      latitude: 12.9716,
      longitude: 77.5946,
      address: "Bangalore, Karnataka, India",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      postalCode: "560001",
    },
    kolkata: {
      latitude: 22.5726,
      longitude: 88.3639,
      address: "Kolkata, West Bengal, India",
      city: "Kolkata",
      state: "West Bengal",
      country: "India",
      postalCode: "700001",
    },
    hyderabad: {
      latitude: 17.3850,
      longitude: 78.4867,
      address: "Hyderabad, Telangana, India",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500001",
    },

    // International Cities - Europe
    london: {
      latitude: 51.5074,
      longitude: -0.1278,
      address: "London, England, United Kingdom",
      city: "London",
      state: "England",
      country: "United Kingdom",
      postalCode: "SW1A 1AA",
    },
    paris: {
      latitude: 48.8566,
      longitude: 2.3522,
      address: "Paris, Île-de-France, France",
      city: "Paris",
      state: "Île-de-France",
      country: "France",
      postalCode: "75001",
    },
    berlin: {
      latitude: 52.5200,
      longitude: 13.4050,
      address: "Berlin, Germany",
      city: "Berlin",
      state: "Berlin",
      country: "Germany",
      postalCode: "10115",
    },
    rome: {
      latitude: 41.9028,
      longitude: 12.4964,
      address: "Rome, Lazio, Italy",
      city: "Rome",
      state: "Lazio",
      country: "Italy",
      postalCode: "00100",
    },
    madrid: {
      latitude: 40.4168,
      longitude: -3.7038,
      address: "Madrid, Community of Madrid, Spain",
      city: "Madrid",
      state: "Community of Madrid",
      country: "Spain",
      postalCode: "28001",
    },

    // International Cities - Asia Pacific
    tokyo: {
      latitude: 35.6762,
      longitude: 139.6503,
      address: "Tokyo, Japan",
      city: "Tokyo",
      state: "Tokyo",
      country: "Japan",
      postalCode: "100-0001",
    },
    seoul: {
      latitude: 37.5665,
      longitude: 126.9780,
      address: "Seoul, South Korea",
      city: "Seoul",
      state: "Seoul",
      country: "South Korea",
      postalCode: "04524",
    },
    singapore: {
      latitude: 1.3521,
      longitude: 103.8198,
      address: "Singapore, Singapore",
      city: "Singapore",
      state: "Singapore",
      country: "Singapore",
      postalCode: "018989",
    },
    sydney: {
      latitude: -33.8688,
      longitude: 151.2093,
      address: "Sydney, NSW, Australia",
      city: "Sydney",
      state: "NSW",
      country: "Australia",
      postalCode: "2000",
    },
    
    // International Cities - Middle East & Africa
    dubai: {
      latitude: 25.2048,
      longitude: 55.2708,
      address: "Dubai, United Arab Emirates",
      city: "Dubai",
      state: "Dubai",
      country: "United Arab Emirates",
      postalCode: "00000",
    },
    cairo: {
      latitude: 30.0444,
      longitude: 31.2357,
      address: "Cairo, Egypt",
      city: "Cairo",
      state: "Cairo",
      country: "Egypt",
      postalCode: "11511",
    },
    
    // International Cities - Americas
    toronto: {
      latitude: 43.6532,
      longitude: -79.3832,
      address: "Toronto, ON, Canada",
      city: "Toronto",
      state: "ON",
      country: "Canada",
      postalCode: "M5H 2N2",
    },
    "mexico city": {
      latitude: 19.4326,
      longitude: -99.1332,
      address: "Mexico City, Mexico",
      city: "Mexico City",
      state: "CDMX",
      country: "Mexico",
      postalCode: "01000",
    },
    "são paulo": {
      latitude: -23.5505,
      longitude: -46.6333,
      address: "São Paulo, SP, Brazil",
      city: "São Paulo",
      state: "SP",
      country: "Brazil",
      postalCode: "01310-100",
    },
    "sao paulo": {
      latitude: -23.5505,
      longitude: -46.6333,
      address: "São Paulo, SP, Brazil",
      city: "São Paulo",
      state: "SP",
      country: "Brazil",
      postalCode: "01310-100",
    },
  }

  const searchKey = address.toLowerCase().trim()
  const location = mockLocations[searchKey]

  if (location) {
    return Response.json(location)
  }

  // If not found in mock data, return a generic location
  return Response.json({
    latitude: 40.7128,
    longitude: -74.006,
    address: address,
    city: "Unknown",
    state: "Unknown",
    country: "USA",
  })
}
