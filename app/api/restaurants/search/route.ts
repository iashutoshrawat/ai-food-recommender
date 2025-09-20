export async function POST(req: Request) {
  try {
    const { query, location, radius = 5, priceRange, cuisine, dietaryRestrictions } = await req.json()

    // In a real app, you would integrate with restaurant APIs like:
    // - Google Places API
    // - Yelp Fusion API
    // - Foursquare Places API
    // - Zomato API

    // For this demo, we'll generate realistic restaurant data based on the search parameters
    const mockRestaurants = generateMockRestaurants(query, location, radius, priceRange, cuisine, dietaryRestrictions)

    return Response.json({
      restaurants: mockRestaurants,
      totalResults: mockRestaurants.length,
      searchParams: {
        query,
        location,
        radius,
        priceRange,
        cuisine,
        dietaryRestrictions,
      },
    })
  } catch (error) {
    console.error("Restaurant search error:", error)
    return Response.json({ error: "Failed to search restaurants" }, { status: 500 })
  }
}

function generateMockRestaurants(
  query: string,
  location: any,
  radius: number,
  priceRange?: number[],
  cuisine?: string,
  dietaryRestrictions?: string[],
) {
  const cuisineTypes = [
    "Italian",
    "Japanese",
    "Mexican",
    "Chinese",
    "Indian",
    "Thai",
    "French",
    "American",
    "Mediterranean",
    "Korean",
  ]
  const restaurantNames = {
    Italian: ["Bella Vista", "Nonna's Kitchen", "Il Giardino", "Pasta Palace", "Roma Trattoria"],
    Japanese: ["Sakura Sushi", "Ramen House", "Tokyo Garden", "Sushi Zen", "Miso Happy"],
    Mexican: ["Casa Miguel", "El Corazón", "Taco Libre", "Azteca Grill", "Fiesta Cantina"],
    Chinese: ["Golden Dragon", "Panda Garden", "Szechuan Palace", "Lucky Bamboo", "Great Wall"],
    Indian: ["Spice Route", "Taj Mahal", "Curry House", "Bombay Palace", "Saffron Kitchen"],
    Thai: ["Thai Basil", "Bangkok Garden", "Pad Thai Palace", "Lemongrass", "Spicy Orchid"],
    French: ["Le Petit Bistro", "Café Paris", "Brasserie Lyon", "Chez Pierre", "La Maison"],
    American: ["The Burger Joint", "Main Street Diner", "Liberty Grill", "All-American Eats", "Stars & Stripes"],
    Mediterranean: ["Olive Branch", "Santorini", "Mediterranean Breeze", "Aegean Sea", "Cyprus Garden"],
    Korean: ["Seoul Kitchen", "Kimchi House", "BBQ Seoul", "Gangnam Style", "K-Town Grill"],
  }

  const restaurants = []
  const targetCuisines = cuisine ? [cuisine] : cuisineTypes
  const numRestaurants = Math.min(12, Math.max(6, Math.floor(Math.random() * 8) + 6))

  for (let i = 0; i < numRestaurants; i++) {
    const selectedCuisine = targetCuisines[Math.floor(Math.random() * targetCuisines.length)]
    const names = restaurantNames[selectedCuisine as keyof typeof restaurantNames] || restaurantNames.American
    const name = names[Math.floor(Math.random() * names.length)]

    // Generate location near the search location
    const lat = location.latitude + (Math.random() - 0.5) * 0.1
    const lng = location.longitude + (Math.random() - 0.5) * 0.1
    const distance = (Math.random() * radius).toFixed(1)

    // Generate price level
    let priceLevel = Math.floor(Math.random() * 4) + 1
    if (priceRange && priceRange.length === 2) {
      priceLevel = Math.floor(Math.random() * (priceRange[1] - priceRange[0] + 1)) + priceRange[0]
    }

    // Generate dietary options
    const allDietaryOptions = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Halal", "Kosher"]
    const dietaryOptions = []

    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      // Ensure some restaurants match the dietary restrictions
      if (Math.random() > 0.3) {
        dietaryOptions.push(...dietaryRestrictions.slice(0, Math.floor(Math.random() * 2) + 1))
      }
    }

    // Add random dietary options
    const additionalOptions = allDietaryOptions.filter((opt) => !dietaryOptions.includes(opt))
    const numAdditional = Math.floor(Math.random() * 3)
    for (let j = 0; j < numAdditional; j++) {
      if (additionalOptions.length > 0) {
        const randomOption = additionalOptions.splice(Math.floor(Math.random() * additionalOptions.length), 1)[0]
        dietaryOptions.push(randomOption)
      }
    }

    restaurants.push({
      id: `restaurant-${i + 1}`,
      name: `${name} ${i > 4 ? i - 4 : ""}`.trim(),
      cuisine: selectedCuisine,
      description: generateRestaurantDescription(selectedCuisine, name),
      priceLevel,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
      reviewCount: Math.floor(Math.random() * 2000) + 50,
      address: generateAddress(location.city || "City"),
      phone: generatePhoneNumber(),
      website: `https://${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      hours: generateHours(),
      specialties: generateSpecialties(selectedCuisine),
      dietaryOptions,
      ambiance: generateAmbiance(),
      bestFor: generateBestFor(),
      estimatedWaitTime: Math.random() > 0.5 ? `${Math.floor(Math.random() * 30) + 5} min` : undefined,
      distance: `${distance} mi`,
      coordinates: { lat, lng },
      imageUrl: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(name)}`,
    })
  }

  return restaurants.sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance))
}

function generateRestaurantDescription(cuisine: string, name: string): string {
  const descriptions = {
    Italian: `Authentic Italian cuisine featuring handmade pasta, wood-fired pizzas, and traditional recipes passed down through generations.`,
    Japanese: `Fresh sushi, authentic ramen, and traditional Japanese dishes prepared with the finest ingredients and time-honored techniques.`,
    Mexican: `Vibrant Mexican flavors with fresh ingredients, house-made salsas, and traditional recipes from various regions of Mexico.`,
    Chinese: `Traditional Chinese cuisine featuring wok-fired dishes, dim sum, and regional specialties prepared with authentic techniques.`,
    Indian: `Aromatic Indian cuisine with rich curries, tandoor specialties, and a perfect blend of traditional spices and flavors.`,
    Thai: `Authentic Thai dishes balancing sweet, sour, salty, and spicy flavors with fresh herbs and traditional cooking methods.`,
    French: `Classic French cuisine with elegant presentations, fine wines, and traditional techniques in a sophisticated atmosphere.`,
    American: `Contemporary American fare featuring locally sourced ingredients, comfort food classics, and innovative seasonal dishes.`,
    Mediterranean: `Fresh Mediterranean cuisine with olive oils, herbs, and healthy ingredients inspired by coastal European traditions.`,
    Korean: `Traditional Korean flavors featuring BBQ, kimchi, and authentic dishes prepared with fermented ingredients and bold spices.`,
  }

  return (
    descriptions[cuisine as keyof typeof descriptions] ||
    "Delicious cuisine prepared with fresh ingredients and authentic flavors."
  )
}

function generateAddress(city: string): string {
  const streetNumbers = Math.floor(Math.random() * 9999) + 1
  const streetNames = [
    "Main St",
    "Oak Ave",
    "Park Blvd",
    "First St",
    "Broadway",
    "Market St",
    "Union Ave",
    "Central Blvd",
  ]
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)]
  return `${streetNumbers} ${streetName}, ${city}`
}

function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 800) + 200
  const exchange = Math.floor(Math.random() * 800) + 200
  const number = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `(${areaCode}) ${exchange}-${number}`
}

function generateHours(): string {
  const hours = [
    "Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-9pm",
    "Daily 11am-10pm",
    "Mon-Sat 5pm-11pm, Sun Closed",
    "Daily 12pm-9pm",
    "Mon-Thu 11:30am-9:30pm, Fri-Sat 11:30am-10:30pm, Sun 12pm-9pm",
  ]
  return hours[Math.floor(Math.random() * hours.length)]
}

function generateSpecialties(cuisine: string): string[] {
  const specialties = {
    Italian: ["Margherita Pizza", "Carbonara", "Osso Buco", "Tiramisu", "Risotto"],
    Japanese: ["Omakase", "Tonkotsu Ramen", "Chirashi Bowl", "Miso Soup", "Tempura"],
    Mexican: ["Tacos al Pastor", "Mole Poblano", "Ceviche", "Churros", "Guacamole"],
    Chinese: ["Peking Duck", "Kung Pao Chicken", "Dim Sum", "Hot Pot", "Fried Rice"],
    Indian: ["Butter Chicken", "Biryani", "Naan Bread", "Samosas", "Tandoori"],
    Thai: ["Pad Thai", "Tom Yum Soup", "Green Curry", "Mango Sticky Rice", "Som Tam"],
    French: ["Coq au Vin", "Bouillabaisse", "Crème Brûlée", "Escargot", "Ratatouille"],
    American: ["Burgers", "BBQ Ribs", "Mac and Cheese", "Apple Pie", "Buffalo Wings"],
    Mediterranean: ["Hummus", "Grilled Octopus", "Baklava", "Falafel", "Greek Salad"],
    Korean: ["Korean BBQ", "Kimchi", "Bibimbap", "Bulgogi", "Korean Fried Chicken"],
  }

  const cuisineSpecialties = specialties[cuisine as keyof typeof specialties] || specialties.American
  const numSpecialties = Math.floor(Math.random() * 3) + 2
  return cuisineSpecialties.slice(0, numSpecialties)
}

function generateAmbiance(): string {
  const ambiances = [
    "Casual and family-friendly",
    "Upscale and elegant",
    "Cozy and intimate",
    "Modern and trendy",
    "Traditional and authentic",
    "Lively and energetic",
    "Quiet and romantic",
    "Rustic and charming",
  ]
  return ambiances[Math.floor(Math.random() * ambiances.length)]
}

function generateBestFor(): string[] {
  const occasions = [
    "Date Night",
    "Family Dinner",
    "Business Lunch",
    "Casual Dining",
    "Special Occasions",
    "Quick Bite",
    "Group Dining",
    "Solo Dining",
  ]
  const numOccasions = Math.floor(Math.random() * 3) + 1
  const shuffled = occasions.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, numOccasions)
}
