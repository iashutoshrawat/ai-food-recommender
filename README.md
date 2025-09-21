# Savora - AI-Powered Interactive Restaurant Discovery

🍽️ **An intelligent restaurant recommendation system with conversational AI and proactive assistance**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ashcool14111996-gmailcoms-projects/v0-ai-food-recommender)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/uatPW2k14lm)

## ✨ Overview

Savora transforms restaurant discovery into an interactive, conversational experience. Instead of static search results, users engage with an AI assistant that proactively helps them explore restaurants, ask follow-up questions, and make informed dining decisions.

## 🚀 Key Features

### **Interactive Restaurant Discovery**
- **Conversational Search**: Natural language restaurant queries with location awareness
- **Proactive AI Assistant**: Anticipates user needs and offers helpful suggestions
- **Clickable Follow-up Questions**: Smart, contextual questions you can click to explore further
- **Deep Restaurant Analysis**: Comprehensive insights on atmosphere, menu, pricing, and more

### **Enhanced User Experience**
- **Visual Interaction Cues**: Clear "Click for details" prompts and interactive restaurant cards
- **Contextual Intelligence**: Questions adapt based on your search (e.g., biryani-specific questions for biryani searches)
- **Idle Time Assistance**: Proactive help if you're browsing without interacting
- **Multi-Restaurant Comparisons**: Ask questions comparing multiple restaurants

### **Smart Personalization**
- **Preference Learning**: Remembers your dining preferences and past interactions
- **Location-Aware**: Results tailored to your specific location
- **Occasion-Based Suggestions**: Different recommendations for dates, family dinners, business meals

## 🎯 How It Works

### **Example User Journey:**

1. **Search**: "Find biryani restaurants near me"
   - Returns real restaurants with enhanced interactive cards
   - AI provides immediate guidance on how to explore further

2. **Proactive Assistance**: 
   - "Want to know more? Click any restaurant above!"
   - Contextual follow-up buttons appear:
     - "Which has the most authentic biryani?"
     - "Compare the top 2 restaurants"  
     - "Which is best for a date?"

3. **Interactive Exploration**:
   - Click follow-up questions for instant AI analysis
   - Click restaurants for deep-dive research
   - Get comprehensive insights on food quality, atmosphere, value

4. **Intelligent Conversations**:
   - AI remembers context across the conversation
   - Provides specific recommendations based on your needs
   - Suggests next logical questions to ask

## 🛠 Technical Features

### **AI-Powered Intelligence**
- **OpenAI Integration**: GPT-4 powered restaurant analysis and recommendations
- **Real-time Web Search**: Finds actual restaurants using web search APIs
- **Contextual Memory**: Remembers conversation history and user preferences
- **Smart Intent Detection**: Understands follow-up questions and references

### **Enhanced Chat Interface**
- **Follow-up Question Buttons**: Clickable suggestions that feel natural
- **Visual Feedback**: Loading states, thinking indicators, and interaction hints  
- **Proactive Messaging**: AI offers help at appropriate moments
- **Multi-turn Conversations**: Maintains context across complex discussions

### **Restaurant Analysis Engine**
- **Deep Dive Research**: Comprehensive analysis of individual restaurants
- **Comparative Analysis**: Side-by-side restaurant comparisons  
- **Contextual Questions**: Generates relevant follow-up questions
- **Personalized Insights**: Tailored recommendations based on user preferences

## 🏗 Architecture

```
Frontend (Next.js + React)
├── Interactive Chat Interface
├── Enhanced Restaurant Cards  
├── Follow-up Question Buttons
└── Proactive Suggestion System

Backend APIs
├── /api/restaurant-intelligence - Deep restaurant analysis
├── /api/restaurants/search - Real restaurant data
├── /api/recommend - AI-powered recommendations
└── Smart context management

AI Services
├── OpenAI GPT-4 Integration
├── Web Search for Real Data
├── Contextual Question Generation
└── Personalization Engine
```

## 🎨 User Experience Highlights

### **Proactive AI Behaviors:**
- **Immediate Guidance**: Explains interaction options after showing results
- **Contextual Suggestions**: Offers relevant questions based on search context
- **Idle Assistance**: Helpful prompts if user seems to be just browsing
- **Smart Follow-ups**: Each response includes logical next questions

### **Interactive Elements:**
- **Enhanced Restaurant Cards**: Visual cues, hover effects, interaction hints
- **Clickable Questions**: No need to type - just click what you want to know
- **Loading Animations**: "Let me think about that..." while AI processes
- **Context Awareness**: AI knows what restaurants you've discussed

### **Intelligent Features:**
- **Search-Specific Questions**: Pizza searches get pizza questions, biryani gets biryani questions
- **Comparative Analysis**: "Which is better for dates?" across multiple restaurants
- **Practical Insights**: Parking, reservations, best times to visit
- **Value Assessments**: Honest opinions on price vs. quality

## 🚀 Getting Started

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your OpenAI API key and other required variables

# Run the development server
npm run dev
```

## 🌟 What Makes Savora Special

Unlike traditional restaurant apps that show static lists, Savora creates a **conversational discovery experience**:

- **Anticipates Your Questions**: Instead of wondering "Is this good for dates?", the AI suggests that question
- **Learns Your Preferences**: Remembers what types of restaurants and features you care about
- **Provides Deep Insights**: Goes beyond ratings to explain atmosphere, value, and suitability
- **Guides Decision Making**: Helps you choose between options with specific, actionable advice

## 🔮 Future Enhancements

- **Voice Interactions**: Ask questions using voice input
- **Photo Analysis**: Restaurant interior and food photos with AI analysis
- **Reservation Integration**: Direct booking through the chat interface  
- **Social Features**: Share recommendations and get opinions from friends
- **Advanced Personalization**: Machine learning for even better recommendations

---

**Live Demo**: [https://vercel.com/ashcool14111996-gmailcoms-projects/v0-ai-food-recommender](https://vercel.com/ashcool14111996-gmailcoms-projects/v0-ai-food-recommender)

**Continue Development**: [https://v0.app/chat/projects/uatPW2k14lm](https://v0.app/chat/projects/uatPW2k14lm)
