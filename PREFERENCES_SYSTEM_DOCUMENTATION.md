# How Preferences Are Used in the AI Food Recommender

## Overview

The AI Food Recommender features a comprehensive personalization system that captures user preferences and behavioral data to deliver highly tailored restaurant recommendations. The system combines explicit preference settings with implicit behavioral learning to create a sophisticated matching algorithm.

## 1. Preference Data Structure

### UserPreferences Interface

The application captures comprehensive user preferences through the `UserPreferences` interface defined in `hooks/use-preferences.ts`:

```typescript
interface UserPreferences {
  cuisines: string[]                // Favorite cuisine types (Italian, Japanese, Mexican, etc.)
  spiceLevel: number               // Numeric scale 1-5 for spice tolerance
  dietaryRestrictions: string[]    // Dietary needs (Vegetarian, Vegan, Gluten-Free, etc.)
  priceRange: number[]            // Array with min/max price levels [1-5]
  mealTiming: string[]            // Preferred dining occasions (Quick Bite, Romantic Dinner, etc.)
  diningStyle: string[]           // Preference for ambiance (Fine Dining, Casual, Street Food, etc.)
  favoriteIngredients: string[]   // Loved food items and ingredients
  dislikedIngredients: string[]   // Food aversions and ingredients to avoid
  lastUpdated: string            // ISO timestamp for preference freshness
}
```

**Available Options:**
- **Cuisines**: Italian, Japanese, Mexican, Chinese, Indian, Thai, French, Mediterranean, American, Korean, Vietnamese, Greek, Spanish, Lebanese, Ethiopian, Peruvian
- **Dietary Restrictions**: Vegetarian, Vegan, Gluten-Free, Dairy-Free, Nut-Free, Keto, Paleo, Halal, Kosher
- **Meal Timing**: Quick Bite, Leisurely Meal, Business Lunch, Romantic Dinner, Family Meal, Late Night
- **Dining Style**: Fine Dining, Casual, Fast Casual, Street Food, Food Truck, Buffet, Takeout
- **Common Ingredients**: Garlic, Onions, Tomatoes, Cheese, Mushrooms, Peppers, Herbs, Seafood, Beef, Chicken, Pork, Lamb, Tofu, Beans, Rice, Pasta

### UserBehavior Interface

The system tracks user behavior to enhance personalization:

```typescript
interface UserBehavior {
  searchHistory: string[]                                        // Last 50 search queries
  clickedRestaurants: string[]                                  // Recently viewed restaurant IDs (last 100)
  ratedRestaurants: { id: string; rating: number; timestamp: string }[]  // User ratings (last 200)
  favoriteRestaurants: string[]                                // Bookmarked establishments
  rejectedSuggestions: string[]                               // Explicitly dismissed restaurants (last 100)
}
```

## 2. Preference Collection Flow

### Initial Setup Process

**Automatic Modal Display:**
- Modal appears 3 seconds after app load if no preferences are set
- Only shows if `savora-preferences-dismissed` is not in localStorage
- Comprehensive 8-section form covering all preference categories

**Modal Interface (`components/preference-modal.tsx`):**
1. **Cuisine Preferences**: Grid of clickable badges for cuisine selection
2. **Spice Tolerance**: Interactive slider (1-5 scale: Mild → Extreme)
3. **Dietary Preferences**: Checkbox selection for dietary restrictions
4. **Price Range**: Dual-handle slider for min/max budget ($-$$$$$)
5. **Dining Occasions**: Badge selection for meal timing preferences
6. **Dining Style**: Grid selection for ambiance preferences
7. **Ingredient Preferences**: Dual-column selection (Love These / Avoid These)
   - Mutual exclusivity: selecting "love" removes from "avoid" and vice versa

### Preference Updates

**User-Initiated Changes:**
- Accessible via "preferences" button in navigation
- Changes immediately saved to localStorage with updated timestamp
- No server-side storage - full client-side control

## 3. AI-Powered Personalization

### Restaurant Recommendations (`/api/recommend/route.ts`)

**Context Building:**
The API receives comprehensive user context:

```typescript
const userContext = {
  preferences: {
    cuisines: preferences.cuisines || [],
    spiceLevel: preferences.spiceLevel || 3,
    dietaryRestrictions: preferences.dietaryRestrictions || [],
    priceRange: preferences.priceRange || [2, 4],
    mealTiming: preferences.mealTiming || [],
    diningStyle: preferences.diningStyle || [],
    favoriteIngredients: preferences.favoriteIngredients || [],
    dislikedIngredients: preferences.dislikedIngredients || []
  },
  behavior: {
    searchHistory: behavior?.searchHistory?.slice(0, 10) || [],
    favoriteRestaurants: behavior?.favoriteRestaurants || [],
    rejectedSuggestions: behavior?.rejectedSuggestions || [],
    recentRatings: behavior?.ratedRestaurants?.slice(0, 5) || []
  },
  location: location || "Current location"
}
```

**AI Prompt Construction:**
- Detailed preference profile sent to GPT-4o
- Formatted context including:
  - Favorite cuisines list
  - Spice tolerance (X/5 format)
  - Dietary restrictions
  - Price range ($ symbol visualization)
  - Dining style and meal timing preferences
  - Ingredient loves/avoids
  - Behavioral data summary

**Generated Recommendations:**
- 6-8 diverse restaurant suggestions
- Each includes match score (0-100) based on preference alignment
- Specific match reasons explaining preference fits
- Realistic details including wait times and distances

### Match Score Calculation

**Local Scoring Algorithm (`calculatePreferenceScore`):**
- **Cuisine Matching**: +20 points for matches, -5 for mismatches
- **Price Range**: +15 points for range match, -3 per level deviation  
- **Dietary Restrictions**: +10 for matches, -10 for conflicts
- **Behavioral Factors**:
  - Favorites: +25 points
  - Rejections: -30 points  
  - Previous ratings: ±10 points (based on 1-5 scale)

### Personalized Ranking (`/api/personalize/route.ts`)

**Secondary AI Analysis:**
- Post-recommendation personalization explanation
- Considers complete taste profile and context
- Generates conversational explanation of ranking decisions
- Helps users understand why restaurants are ordered specifically for them

## 4. Behavioral Data Tracking

### Real-time Learning System

**Search Tracking (`trackSearch`):**
- Every search query stored in searchHistory
- Maintains last 50 queries with deduplication
- Recent searches moved to front of array

**Restaurant Interactions:**
- **Click Tracking**: Records restaurant views (`trackRestaurantClick`)
- **Favorite System**: Heart button toggles favorite status (`toggleFavorite`)
- **Rejection System**: X button adds to rejection list (`rejectSuggestion`)
- **Rating System**: Star ratings with timestamps (`rateRestaurant`)

**Data Limits & Management:**
- Search history: 50 items
- Clicked restaurants: 100 items
- Rated restaurants: 200 items
- Rejected suggestions: 100 items
- All stored in localStorage with automatic pruning

### Behavioral Influence on Recommendations

**Preference Reinforcement:**
- Favorited restaurants get +25 match score boost
- Rejected restaurants get -30 penalty and are excluded
- User ratings influence scoring (±10 based on 1-5 scale)
- Search history influences AI understanding of current interests

## 5. User Interface Integration

### Homepage Display (`app/page.tsx`)

**Preference Preview:**
- Shows saved preferences when available: "Personalized for your taste: Italian, Japanese, Thai +2 more"
- Displays top 3 cuisines with count of additional preferences
- Appears in glass-effect container below main heading

**Search Enhancement:**
- Preferences automatically passed to all recommendation calls
- Search behavior tracked and stored
- Location + preferences combined for personalized results

### Results Display (`components/recommendation-results.tsx`)

**Match Score Visualization:**
- Prominent percentage display for each restaurant
- Color-coded match score in primary theme color
- Match reasons displayed as badge chips

**Interactive Elements:**
- **Heart Button**: Toggle favorite status (visual feedback with red fill)
- **X Button**: Reject suggestion (removes from future recommendations)  
- **Restaurant Click**: Tracks engagement for learning

**Personalization Explanation:**
- Highlighted box with AI-generated explanation
- Describes why restaurants are ranked for specific user
- Uses conversational tone explaining preference matches

### Real-time UI Feedback

**Behavioral Learning Indicators:**
- Heart button shows filled state for favorited restaurants
- Rejected restaurants removed from view immediately
- Match reasons update based on user's specific preferences
- Dietary badges prominently displayed when matching restrictions

## 6. Search and Discovery Enhancement

### Location-Based Integration

**Restaurant Search API (`/api/restaurants/search/route.ts`):**
- Preference-filtered search parameters
- Cuisine preferences passed to mock restaurant generation
- Price range and dietary restrictions used as filters
- Real restaurant data would be enhanced with preference context

**Search Parameter Enhancement:**
```typescript
{
  query: searchQuery,
  location: selectedLocation,
  radius: 10, // miles
  priceRange: preferences.priceRange,
  cuisine: preferences.cuisines.length > 0 ? preferences.cuisines[0] : undefined,
  dietaryRestrictions: preferences.dietaryRestrictions
}
```

### AI Recommendation Flow

**Multi-Stage Process:**
1. **Real Restaurant Search**: Location-based search with preference filters
2. **AI Enhancement**: GPT-4o generates/enhances recommendations with preference context
3. **Local Scoring**: JavaScript-based match score calculation
4. **Personalization**: Secondary AI call explains ranking rationale
5. **Behavioral Update**: Track search and prepare for user interactions

## 7. Data Persistence & Privacy

### Client-Side Storage Strategy

**localStorage Implementation:**
- All data stored in browser's localStorage
- Two key storage objects:
  - `savora-preferences`: UserPreferences object with timestamp
  - `savora-behavior`: UserBehavior tracking data
- No server-side user tracking or data collection

**Privacy Features:**
- User maintains full control over preference data
- Option to dismiss preference modal permanently
- No external data sharing or collection
- All personalization happens client-side or via anonymous API calls

### Data Management

**Automatic Cleanup:**
- Array-based data (search history, clicks, etc.) automatically pruned to limits
- Most recent items kept, older items removed
- Timestamps included for potential future cleanup strategies

## 8. Integration Architecture

### Hook-Based State Management

**`usePreferences` Hook:**
- Centralized preference and behavior management
- Provides all CRUD operations for preferences
- Behavioral tracking functions
- Local match score calculation
- Automatic localStorage synchronization

**`useAIRecommendations` Hook:**
- Integrates with preferences hook
- Passes full context to AI APIs
- Handles real restaurant search + AI enhancement
- Manages recommendation state and personalization

### API Integration Points

**Comprehensive Context Passing:**
- All AI endpoints receive full preference + behavior context
- Location data included when available
- Search query and user intent considered
- Historical data influences recommendations

**Response Enhancement:**
- Match scores calculated both locally and by AI
- Multiple explanation layers (match reasons + personalization)
- Behavioral learning feeds back into scoring

## 9. Personalization Examples

### Scenario: Italian Food Lover

**User Profile:**
- Cuisines: [Italian, Mediterranean]
- Price Range: [3, 4] ($$$ to $$$$)
- Dietary: [Vegetarian]
- Spice Level: 2/5
- Favorite Ingredients: [Cheese, Tomatoes, Herbs]
- Recent Searches: ["pasta", "pizza", "italian"]

**AI Personalization:**
- Italian restaurants get +20 match score boost
- Vegetarian options heavily prioritized (+10 per match)
- Higher-end restaurants ($$$ - $$$$) preferred
- Mild spice levels emphasized
- Cheese and tomato-heavy dishes highlighted
- Recent search patterns reinforce Italian preference

**Result Display:**
- Match reasons: "Matches Italian cuisine preference", "Vegetarian options available", "Within price range"
- Personalization explanation: "Based on your love for Italian food and vegetarian preferences, we've prioritized authentic Italian restaurants with excellent vegetarian pasta options..."

### Scenario: Adventurous Foodie

**User Profile:**
- Cuisines: [Thai, Korean, Vietnamese, Indian]
- Spice Level: 5/5 (Extreme)
- Price Range: [1, 3] ($ to $$$)
- Meal Timing: [Quick Bite, Late Night]
- Behavioral: High rating history, diverse search patterns

**AI Personalization:**
- Asian cuisine restaurants heavily weighted
- Spicy dishes and high spice tolerance emphasized  
- Budget-conscious options prioritized
- Quick service and late-night availability highlighted
- Adventurous/authentic options ranked higher

## 10. Future Enhancement Opportunities

### Advanced Learning Capabilities

**Time-Based Preferences:**
- Morning vs. evening preference differences
- Seasonal cuisine preferences
- Weekend vs. weekday dining patterns

**Social Integration:**
- Group dining preferences
- Occasion-based recommendations
- Sharing and social proof integration

**Enhanced Behavioral Analysis:**
- Dwell time on restaurant details
- External review reading patterns
- Reservation completion rates

This comprehensive preference system creates a deeply personalized dining discovery experience that learns and adapts to user tastes while maintaining complete transparency about recommendation reasoning and full user control over personal data.