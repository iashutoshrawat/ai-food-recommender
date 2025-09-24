import { TomTomService } from "@/lib/tomtom-service"
import { NextRequest } from "next/server"

// Force this route to be dynamic since it uses search parameters
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const lat = Number.parseFloat(searchParams.get("lat") || "0")
    const lng = Number.parseFloat(searchParams.get("lng") || "0")

    if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return Response.json({ error: "Valid latitude and longitude parameters are required" }, { status: 400 })
    }

    // Check if TomTom API key is available
    const tomtomApiKey = process.env.TOMTOM_API_KEY
    
    if (!tomtomApiKey || tomtomApiKey === 'your_tomtom_api_key_here') {
      console.warn("TomTom API key not configured, falling back to mock data")
      return getMockReverseGeocodingResult(lat, lng)
    }

    try {
      // Use TomTom API for real reverse geocoding with international support
      const tomtomService = new TomTomService(tomtomApiKey, {
        countrySet: '', // Enable international reverse geocoding
      })
      const result = await tomtomService.reverseGeocode({
        lat,
        lon: lng,
        radius: 100, // 100 meter radius
      })

      if (result) {
        return Response.json({
          address: result.address,
          city: result.city,
          state: result.state,
          country: result.country,
          postalCode: result.postalCode,
        })
      } else {
        // No address found for these coordinates
        return Response.json({
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          city: "Unknown Location",
          state: "",
          country: "",
          postalCode: "",
        })
      }
    } catch (tomtomError) {
      console.error("TomTom reverse geocoding API error:", tomtomError)
      
      // Fallback to mock data if TomTom API fails
      console.warn("Falling back to mock reverse geocoding due to API error")
      return getMockReverseGeocodingResult(lat, lng)
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error)
    return Response.json({ error: "Failed to reverse geocode coordinates" }, { status: 500 })
  }
}

// Fallback mock reverse geocoding function with international support
function getMockReverseGeocodingResult(lat: number, lng: number) {
  let city = "Unknown City"
  let state = "Unknown State"
  let country = "Unknown Country"
  let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  let postalCode = "00000"

  // Enhanced coordinate-based city detection with international cities
  if (lat >= 40.4 && lat <= 40.9 && lng >= -74.3 && lng <= -73.7) {
    city = "New York"
    state = "NY"
    country = "USA"
    address = "New York, NY, USA"
    postalCode = "10001"
  } else if (lat >= 33.7 && lat <= 34.3 && lng >= -118.7 && lng <= -117.9) {
    city = "Los Angeles"
    state = "CA"
    country = "USA"
    address = "Los Angeles, CA, USA"
    postalCode = "90001"
  } else if (lat >= 41.6 && lat <= 42.0 && lng >= -87.9 && lng <= -87.3) {
    city = "Chicago"
    state = "IL"
    country = "USA"
    address = "Chicago, IL, USA"
    postalCode = "60601"
  } else if (lat >= 37.4 && lat <= 37.8 && lng >= -122.5 && lng <= -122.3) {
    city = "San Francisco"
    state = "CA"
    country = "USA"
    address = "San Francisco, CA, USA"
    postalCode = "94102"
  } else if (lat >= 25.4 && lat <= 25.9 && lng >= -80.4 && lng <= -79.9) {
    city = "Miami"
    state = "FL"
    country = "USA"
    address = "Miami, FL, USA"
    postalCode = "33101"
  }
  // International Cities
  else if (lat >= 28.4 && lat <= 29.0 && lng >= 76.8 && lng <= 77.4) {
    city = "New Delhi"
    state = "Delhi"
    country = "India"
    address = "New Delhi, Delhi, India"
    postalCode = "110001"
  } else if (lat >= 18.8 && lat <= 19.3 && lng >= 72.6 && lng <= 73.1) {
    city = "Mumbai"
    state = "Maharashtra"
    country = "India"
    address = "Mumbai, Maharashtra, India"
    postalCode = "400001"
  } else if (lat >= 51.3 && lat <= 51.7 && lng >= -0.4 && lng <= 0.2) {
    city = "London"
    state = "England"
    country = "United Kingdom"
    address = "London, England, United Kingdom"
    postalCode = "SW1A 1AA"
  } else if (lat >= 48.7 && lat <= 49.0 && lng >= 2.1 && lng <= 2.6) {
    city = "Paris"
    state = "Île-de-France"
    country = "France"
    address = "Paris, Île-de-France, France"
    postalCode = "75001"
  } else if (lat >= 35.4 && lat <= 35.9 && lng >= 139.4 && lng <= 139.9) {
    city = "Tokyo"
    state = "Tokyo"
    country = "Japan"
    address = "Tokyo, Japan"
    postalCode = "100-0001"
  } else if (lat >= 1.1 && lat <= 1.6 && lng >= 103.6 && lng <= 104.1) {
    city = "Singapore"
    state = "Singapore"
    country = "Singapore"
    address = "Singapore, Singapore"
    postalCode = "018989"
  }

  return Response.json({
    address,
    city,
    state,
    country,
    postalCode,
  })
}
