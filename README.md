# PlanCompareAI 🚀

A comprehensive Node.js application for comparing T-Mobile prepaid plans with competitors (AT&T, Verizon, Sprint, and others). Features AI-powered recommendations, PostgreSQL database integration, and multiple output formats.

## ✨ Features

- **Plan Comparison**: Compare pricing, data, talk time, validity, and combo offers
- **AI-Powered Suggestions**: Personalized plan recommendations using OpenAI GPT-4
- **Strategic Recommendations**: AI-driven insights for new T-Mobile plan development
- **Advanced Plan Comparator**: Utility class for detailed plan analysis and scoring
- **Multiple Output Formats**: JSON, Markdown tables, and structured table data
- **Database Integration**: PostgreSQL for persistent data storage and analytics
- **API Rate Limiting**: Built-in request validation and rate limiting
- **n8n Automation**: Webhook integration for workflow automation
- **Comprehensive Logging**: Request tracking and comparison history
- **Automated Code Review**: GitHub workflows for security and quality checks

## 🏗️ Architecture

**Clean MVC Pattern with Service Layer:**

```
PlanCompareAI/
├── app.js                    # Application entry point
├── config/
│   └── database.js          # PostgreSQL connection setup
├── controllers/
│   └── controller.js        # Business logic per route
├── models/
│   └── model.js            # PrepaidPlan class with database operations
├── routes/
│   └── root.js             # API route definitions
├── services/
│   └── service.js          # Core business services (AI, comparison logic)
├── validators/
│   └── prevalidator.js     # Request validation and sanitization
├── utils/
│   └── utility.js          # Helper functions and formatting
├── database/
│   └── schema.sql          # Database schema and sample data
└── .env                    # Environment configuration
```

## ✨ NEW: Dynamic Data Scraping Features

**🆕 Version 2.0.0 - Live Data Integration**

- **Real-time Plan Data**: Scrapes competitor plans from official websites
- **Smart Retry Logic**: Handles website changes and temporary outages
- **Data Freshness Tracking**: Knows when data was last updated
- **Intelligent Comparison**: Always uses the most current data available
- **Automated Updates**: Schedule automatic data refreshes
- **Provider Status Monitoring**: Track scraping success/failure by carrier

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher) 
- OpenAI API key (for AI features)
- **NEW**: Web scraping capabilities (Cheerio, user-agents)

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

**Install PostgreSQL and pgAdmin:**
- Download PostgreSQL: https://www.postgresql.org/download/
- Install pgAdmin for database management

**Create Database:**
```sql
CREATE DATABASE plancompareai;
```

**Run Schema:**
```bash
psql -U postgres -d plancompareai -f database/schema.sql
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and update:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
# Database (local development)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plancompareai
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_AB_API_KEY=your_agent_builder_api_key_here
OPENAI_CHATKIT_WORKFLOW_ID=your_workflow_id_here
```

### 4. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## 📚 API Documentation

**Base URL:** `http://localhost:3000/api`

### Core Endpoints

#### GET `/api` - API Information
Returns API documentation and available endpoints.

#### GET `/api/plans` - Get All Plans
```bash
curl "http://localhost:3000/api/plans?outputFormat=json"
```

**Query Parameters:**
- `outputFormat`: `json` | `markdown` | `table`

#### POST `/api/compare` - Compare Plans
```bash
curl -X POST "http://localhost:3000/api/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "T-Mobile",
    "minPrice": 30,
    "maxPrice": 80,
    "outputFormat": "markdown"
  }'
```

**Request Body:**
```json
{
  "provider": "T-Mobile",      // Optional: Filter by provider
  "minPrice": 30,             // Optional: Minimum price
  "maxPrice": 80,             // Optional: Maximum price
  "outputFormat": "json"      // Optional: json|markdown|table
}
```

#### GET `/api/suggest` - Get Personalized Suggestions
```bash
curl "http://localhost:3000/api/suggest?budget=60&dataNeeds=unlimited&features=hotspot,international"
```

**Query Parameters:**
- `budget`: Maximum monthly budget
- `dataNeeds`: Data requirements (e.g., "unlimited", "5GB")
- `features`: Comma-separated features (e.g., "hotspot,international")
- `outputFormat`: `json` | `markdown`

#### POST `/api/recommend` - T-Mobile Strategic Recommendations
```bash
curl -X POST "http://localhost:3000/api/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "marketAnalysis": {
      "targetDemographic": "young professionals",
      "competitivePressure": "high"
    },
    "targetSegment": "budget-conscious users",
    "outputFormat": "markdown"
  }'
```

#### POST `/api/ai-analysis` - AI-Powered Plan Analysis
```bash
curl -X POST "http://localhost:3000/api/ai-analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "planIds": [1, 2, 3],
    "analysisType": "competitive"
  }'
```

#### GET `/api/history` - Comparison History
```bash
curl "http://localhost:3000/api/history?limit=5"
```

### 🆕 NEW: Dynamic Data Endpoints

#### POST `/api/plans/refresh` - Refresh All Competitor Data
**🔄 LIVE DATA SCRAPING**: Fetches fresh plan data from all competitor websites
```bash
curl -X POST "http://localhost:3000/api/plans/refresh?outputFormat=markdown"
```

#### POST `/api/plans/refresh/:provider` - Refresh Specific Provider
```bash
# Refresh only T-Mobile plans
curl -X POST "http://localhost:3000/api/plans/refresh/t-mobile"

# Refresh only AT&T plans  
curl -X POST "http://localhost:3000/api/plans/refresh/att"
```

#### GET `/api/plans/status` - Check Scraping Status
**Monitor data freshness and scraping activity**
```bash
curl "http://localhost:3000/api/plans/status"
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "lastScrape": "2025-09-27T14:30:00.000Z",
    "totalPlansFound": 12,
    "dataFreshness": "live",
    "currentPlanCounts": [
      {"provider": "T-Mobile", "plan_count": "3", "last_updated": "2025-09-27T14:30:00.000Z"},
      {"provider": "AT&T", "plan_count": "2", "last_updated": "2025-09-27T12:15:00.000Z"}
    ]
  }
}
```

#### GET `/api/plans/fresh` - Get Only Fresh Data
**Returns only recently scraped plans (within 24 hours by default)**
```bash
curl "http://localhost:3000/api/plans/fresh?includeFreshness=true"
```

#### POST `/api/plans/compare-live` - Compare with Live Data
**🔄 ENHANCED COMPARISON**: Forces data refresh before comparison**
```bash
curl -X POST "http://localhost:3000/api/plans/compare-live" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "T-Mobile",
    "forceRefresh": "true",
    "outputFormat": "markdown"
  }'
```

#### GET `/api/plans/competitive-analysis` - Market Analysis
**AI-powered competitive positioning analysis**
```bash
curl "http://localhost:3000/api/plans/competitive-analysis?targetProvider=T-Mobile"
```

#### GET `/api/plans/providers/freshness` - Provider Data Status
**Check when each provider's data was last updated**
```bash
curl "http://localhost:3000/api/plans/providers/freshness"
```

#### POST `/api/plans/bulk-add` - Add Multiple Plans
```bash
curl -X POST "http://localhost:3000/api/plans/bulk-add" \
  -H "Content-Type: application/json" \
  -d '{
    "plans": [
      {
        "provider": "NewCarrier",
        "name": "Budget Plan",
        "price": 35.99,
        "data_allowance": "5GB",
        "talk_time": "Unlimited",
        "validity": "30 days"
      }
    ]
  }'
```

## 🤖 AI Integration

The app uses OpenAI GPT-4 for:
- **Personalized Suggestions**: Analyzes user preferences and recommends optimal plans
- **Strategic Insights**: Provides market analysis and new plan recommendations
- **Competitive Analysis**: Deep-dive analysis of plan features and positioning

**AI Features:**
- Natural language plan explanations
- Market gap analysis
- Competitive positioning insights
- Customer segment recommendations

## 🗄️ Database Schema

**Tables:**
- `prepaid_plans`: Core plan data with pricing and features
- `plan_comparisons`: Historical comparison results and criteria
- `ai_recommendations`: AI-generated insights and recommendations

**Key Features:**
- JSONB columns for flexible feature storage
- Indexed queries for optimal performance
- Sample data for immediate testing

## 🔧 Development

### Available Scripts
```bash
npm start      # Start production server
npm run dev    # Start with nodemon (auto-restart)
npm test       # Run tests (when implemented)
```

### Project Structure Guidelines
- **Controllers**: Handle HTTP requests/responses, minimal business logic
- **Services**: Core business logic, AI integration, data processing
- **Models**: Database operations, data validation, business rules
- **Validators**: Input validation, sanitization, security checks
- **Utils**: Formatting, constants, helper functions

## 🔌 Integration Options

### n8n Automation
Set up webhook URL in `.env` for automated workflows:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/plancompare-analysis
```

### Future Enhancements
- **LangChain Integration**: Advanced AI prompt chaining
- **Real-time Plan Updates**: Web scraping for current pricing
- **Customer Analytics**: Usage pattern analysis
- **Mobile App API**: React Native/Flutter integration

## 📊 Sample API Responses

**Plan Comparison Response:**
```json
{
  "success": true,
  "data": {
    "criteria": { "provider": "T-Mobile" },
    "totalPlans": 2,
    "plans": [
      {
        "id": 1,
        "provider": "T-Mobile",
        "name": "Unlimited Essentials",
        "price": 50.00,
        "data_allowance": "Unlimited",
        "talk_time": "Unlimited",
        "validity": "30 days",
        "combo_offers": ["Netflix Basic"],
        "valueScore": 85
      }
    ],
    "comparedAt": "2025-09-27T10:30:00.000Z"
  }
}
```

## 🚀 Deployment

**Environment Variables for Production:**
```env
NODE_ENV=production
PORT=3000
# Database and API keys...
```

**Docker Support** (Future):
```dockerfile
# Dockerfile example for containerization
FROM node:16-alpine
# ... container setup
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

ISC License - see LICENSE file for details.

---

**Built with ❤️ for T-Mobile strategic analysis**

*For questions or support, please check the API documentation at `/api` endpoint.*
