export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = Number.parseFloat(searchParams.get("lat") || "0")
    const lng = Number.parseFloat(searchParams.get("lng") || "0")

    if (!lat || !lng) {
      return Response.json({ error: "Latitude and longitude parameters are required" }, { status: 400 })
    }

    // In a real app, you would use a reverse geocoding service
    // For this demo, we'll simulate reverse geocoding based on coordinates
    let city = "Unknown City"
    let state = "Unknown State"
    let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`

    // Simple coordinate-based city detection (very basic simulation)
    if (lat >= 40.4 && lat <= 40.9 && lng >= -74.3 && lng <= -73.7) {
      city = "New York"
      state = "NY"
      address = "New York, NY, USA"
    } else if (lat >= 33.7 && lat <= 34.3 && lng >= -118.7 && lng <= -117.9) {
      city = "Los Angeles"
      state = "CA"
      address = "Los Angeles, CA, USA"
    } else if (lat >= 41.6 && lat <= 42.0 && lng >= -87.9 && lng <= -87.3) {
      city = "Chicago"
      state = "IL"
      address = "Chicago, IL, USA"
    } else if (lat >= 37.4 && lat <= 37.8 && lng >= -122.5 && lng <= -122.3) {
      city = "San Francisco"
      state = "CA"
      address = "San Francisco, CA, USA"
    }

    return Response.json({
      address,
      city,
      state,
      country: "USA",
      postalCode: "00000",
    })
  } catch (error) {
    console.error("Reverse geocoding error:", error)
    return Response.json({ error: "Failed to reverse geocode coordinates" }, { status: 500 })
  }
}
