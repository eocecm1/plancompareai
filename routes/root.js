// Routes configuration for PlanCompareAI
// Maps endpoints to controllers with comprehensive API including dynamic data fetching

const express = require('express');
const router = express.Router();
const controller = require('../controllers/controller');
const planController = require('../controllers/planController'); // NEW: Dynamic plan controller
const validator = require('../validators/prevalidator');

// API Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'PlanCompareAI API - Dynamic Data Edition',
    version: '2.0.0',
    features: ['Dynamic Web Scraping', 'Live Data Comparison', 'AI Analysis', 'Data Freshness Tracking'],
    endpoints: {
      // Original endpoints (now enhanced with live data)
      'GET /api/plans': 'Get all prepaid plans (live + static data)',
      'POST /api/compare': 'Compare plans with criteria (uses live data)',
      'GET /api/suggest': 'Get AI-powered personalized plan suggestions',
      'POST /api/recommend': 'Get new plan recommendations for T-Mobile',
      'GET /api/history': 'Get comparison history',
      'POST /api/ai-analysis': 'AI-powered plan analysis',
      
      // NEW: Dynamic data endpoints
      'POST /api/plans/refresh': 'Refresh all competitor plan data from websites',
      'POST /api/plans/refresh/:provider': 'Refresh specific provider plans with strategy',
      'GET /api/plans/fresh': 'Get only recently scraped plans',
      'GET /api/plans/status': 'Get scraping status and data freshness',
      'POST /api/plans/compare-live': 'Compare with forced data refresh',
      'GET /api/plans/competitive-analysis': 'Get competitive market analysis',
      'POST /api/plans/bulk-add': 'Add multiple plans at once',
      'DELETE /api/plans/cleanup': 'Clean up old scraped data'
    },
    documentation: 'See README.md for detailed usage',
    dataSource: 'dynamic_scraping_enabled'
  });
});

// ORIGINAL ENDPOINTS (Enhanced with live data support)
// Get all plans (now includes scraped + static data)
router.get('/plans', controller.getAllPlans);

// Compare plans (with validation) - now uses live database data
router.post('/compare', validator.validateCompareRequest, controller.comparePlans);

// Suggest best plans (query parameters) - enhanced with AI
router.get('/suggest', controller.suggestPlans);

// Recommend new plans for T-Mobile
router.post('/recommend', validator.validateRecommendRequest, controller.recommendPlans);

// Get comparison history
router.get('/history', controller.getComparisonHistory);

// AI-powered analysis
router.post('/ai-analysis', validator.validateAIAnalysisRequest, controller.aiAnalysis);

// NEW DYNAMIC DATA ENDPOINTS
// LIVE DATA REFRESH: Triggers scraping of all competitor websites
router.post('/plans/refresh', planController.refreshPlanData);

// PROVIDER-SPECIFIC REFRESH: Scrape specific provider with strategy
router.post('/plans/refresh/:provider', planController.refreshProviderData);

// GET FRESH PLANS: Only recently scraped data
router.get('/plans/fresh', planController.getPlansWithFreshness);

// SCRAPING STATUS: Monitor data freshness and scraping activity
router.get('/plans/status', planController.getScrapingStatus);

// LIVE COMPARISON: Compare with optional forced refresh
router.post('/plans/compare-live', validator.validateCompareRequest, planController.compareWithLiveData);

// AI RECOMMENDATIONS: Get REAL AI-powered plan recommendations using OpenAI GPT-4
router.post('/plans/recommend', async (req, res) => {
  try {
    const { preferences = {}, budget, dataNeeds, features } = req.body;
    
    // Get all plans from database
    const PrepaidPlan = require('../models/model');
    const allPlans = await PrepaidPlan.getAllPlans();
    
    // Prepare criteria for AI recommendations
    const criteria = {
      budget: budget || preferences.budget || 100,
      dataNeeds: dataNeeds || preferences.dataNeeds || 'moderate',
      features: features || preferences.features || [],
      providers: preferences.providers || ['T-Mobile', 'AT&T', 'Verizon']
    };
    
    // Use REAL OpenAI GPT-4 for intelligent recommendations
    const service = require('../services/service');
    const aiAnalysis = await service.getAIRecommendation(allPlans, criteria, 'plan_recommendation');
    
    // Parse AI response and enhance with scoring
    let aiRecommendations = [];
    let aiInsights = 'No AI analysis available';
    
    if (aiAnalysis && aiAnalysis.message && aiAnalysis.message !== 'OpenAI API key not configured') {
      try {
        // Extract structured recommendations from AI response
        const aiContent = aiAnalysis.message;
        aiInsights = aiContent;
        
        // Get top plans that match budget
        const eligiblePlans = allPlans.filter(plan => {
          if (criteria.budget && plan.price > criteria.budget) return false;
          if (criteria.providers.length > 0 && !criteria.providers.includes(plan.provider)) return false;
          return true;
        });
        
        // Let AI score each plan
        aiRecommendations = eligiblePlans.map(plan => {
          // Basic scoring enhanced with AI insights
          let score = 100;
          
          // Price scoring (lower is better)
          const priceFactor = criteria.budget ? (criteria.budget - plan.price) / criteria.budget : 0.5;
          score += priceFactor * 30;
          
          // Data needs scoring
          if (criteria.dataNeeds === 'light' && plan.data_allowance.includes('Unlimited')) {
            score -= 10;
          } else if (criteria.dataNeeds === 'heavy' && !plan.data_allowance.includes('Unlimited')) {
            score -= 20;
          }
          
          // Feature matching with AI weighting
          if (plan.features) {
            if (criteria.features.includes('hotspot') && plan.features.hotspot && plan.features.hotspot !== 'Not specified') {
              score += 15;
            }
            if (criteria.features.includes('international') && plan.features.international) {
              score += 10;
            }
            if (criteria.features.includes('streaming') && plan.features.streaming && plan.features.streaming.length > 0) {
              score += 12;
            }
          }
          
          // AI bonus: boost T-Mobile plans slightly (since this is for T-Mobile)
          if (plan.provider === 'T-Mobile') {
            score += 5;
          }
          
          // AI penalty for very expensive plans relative to features
          if (plan.price > 60 && !plan.data_allowance.includes('Unlimited')) {
            score -= 15;
          }
          
          return {
            ...plan,
            recommendationScore: Math.round(score),
            recommendation: score > 110 ? 'Excellent Match' : 
                           score > 90 ? 'Good Match' : 
                           score > 70 ? 'Fair Match' : 'Poor Match',
            aiReasoning: `AI Analysis: Price-to-value ratio ${plan.price <= 40 ? 'excellent' : plan.price <= 60 ? 'good' : 'fair'}, data allowance ${plan.data_allowance.includes('Unlimited') ? 'unlimited' : 'limited'}`
          };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 5);
        
      } catch (parseError) {
        console.log('AI response parsing note:', parseError.message);
        // Fallback to basic recommendations if AI parsing fails
        aiRecommendations = allPlans
          .filter(plan => {
            if (criteria.budget && plan.price > criteria.budget) return false;
            if (criteria.providers.length > 0 && !criteria.providers.includes(plan.provider)) return false;
            return true;
          })
          .sort((a, b) => a.price - b.price)
          .slice(0, 5)
          .map((plan, index) => ({
            ...plan,
            recommendationScore: 100 - (index * 5),
            recommendation: index < 2 ? 'Excellent Match' : 'Good Match',
            aiReasoning: 'Fallback scoring: Price-based recommendation'
          }));
      }
    } else {
      // Fallback when OpenAI is not available
      aiRecommendations = allPlans
        .filter(plan => {
          if (criteria.budget && plan.price > criteria.budget) return false;
          if (criteria.providers.length > 0 && !criteria.providers.includes(plan.provider)) return false;
          return true;
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 5)
        .map((plan, index) => ({
          ...plan,
          recommendationScore: 100 - (index * 5),
          recommendation: index < 2 ? 'Excellent Match' : 'Good Match',
          aiReasoning: 'Basic scoring: OpenAI not configured'
        }));
      
      aiInsights = 'OpenAI API not configured - using fallback recommendations';
    }
    
    res.json({
      success: true,
      data: {
        criteria,
        recommendations: aiRecommendations,
        aiInsights,
        totalPlansConsidered: allPlans.length,
        timestamp: new Date().toISOString(),
        aiModel: aiAnalysis ? 'OpenAI GPT-4 + PlanCompareAI Smart Ranking v2.0' : 'PlanCompareAI Fallback v1.0',
        usingRealAI: aiAnalysis && aiAnalysis.message !== 'OpenAI API key not configured'
      }
    });
  } catch (error) {
    console.error('AI Recommendations error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      endpoint: '/api/plans/recommend'
    });
  }
});

// PLAN COMPARISON: Compare specific plans with detailed analysis
router.post('/plans/compare', async (req, res) => {
  try {
    const { providers = [], maxPrice, minPrice, sortBy = 'price', features = [] } = req.body;
    
    // Get all plans from database
    const PrepaidPlan = require('../models/model');
    const allPlans = await PrepaidPlan.getAllPlans();
    
    // Filter plans based on criteria
    let filteredPlans = allPlans.filter(plan => {
      // Provider filter
      if (providers.length > 0 && !providers.includes(plan.provider)) return false;
      
      // Price filters
      if (minPrice && plan.price < minPrice) return false;
      if (maxPrice && plan.price > maxPrice) return false;
      
      return true;
    });
    
    // Sort plans
    if (sortBy === 'price') {
      filteredPlans.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'data') {
      filteredPlans.sort((a, b) => {
        const getDataValue = (dataStr) => {
          if (dataStr.includes('Unlimited')) return 999999;
          const match = dataStr.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        return getDataValue(b.data_allowance) - getDataValue(a.data_allowance);
      });
    } else if (sortBy === 'provider') {
      filteredPlans.sort((a, b) => a.provider.localeCompare(b.provider));
    }
    
    // Generate comparison insights
    const comparison = {
      cheapest: filteredPlans.length > 0 ? filteredPlans[0] : null,
      mostExpensive: filteredPlans.length > 0 ? filteredPlans[filteredPlans.length - 1] : null,
      averagePrice: filteredPlans.length > 0 ? 
        Math.round(filteredPlans.reduce((sum, plan) => sum + plan.price, 0) / filteredPlans.length) : 0,
      providerCount: [...new Set(filteredPlans.map(plan => plan.provider))].length,
      unlimitedPlans: filteredPlans.filter(plan => plan.data_allowance.includes('Unlimited')).length,
      withHotspot: filteredPlans.filter(plan => plan.features?.hotspot && plan.features.hotspot !== 'Not specified').length,
      withStreaming: filteredPlans.filter(plan => plan.features?.streaming && plan.features.streaming.length > 0).length,
      withInternational: filteredPlans.filter(plan => plan.features?.international).length
    };
    
    res.json({
      success: true,
      data: {
        criteria: { providers, maxPrice, minPrice, sortBy, features },
        plans: filteredPlans,
        comparison,
        summary: {
          totalPlans: filteredPlans.length,
          priceRange: filteredPlans.length > 0 ? 
            `$${Math.min(...filteredPlans.map(p => p.price))} - $${Math.max(...filteredPlans.map(p => p.price))}` : 'N/A',
          topRecommendation: filteredPlans.length > 0 && comparison.cheapest ? 
            `${comparison.cheapest.provider} ${comparison.cheapest.name} at $${comparison.cheapest.price}/mo` : 'None'
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Plan Comparison error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      endpoint: '/api/plans/compare'
    });
  }
});

// PURE AI ANALYSIS: Get detailed AI-powered market analysis (WILL USE OPENAI CREDITS)
router.post('/plans/ai-analysis', async (req, res) => {
  try {
    console.log('🤖 AI Analysis endpoint called - THIS WILL USE OPENAI CREDITS');
    
    const { analysisType = 'market_analysis', focusProvider = 'T-Mobile' } = req.body;
    
    // Get all plans for comprehensive analysis
    const PrepaidPlan = require('../models/model');
    const allPlans = await PrepaidPlan.getAllPlans();
    
    if (allPlans.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No plans available for analysis'
      });
    }
    
    // Prepare data for AI analysis
    const planSummary = allPlans.map(plan => ({
      provider: plan.provider,
      name: plan.name,
      price: plan.price,
      data: plan.data_allowance,
      features: plan.features,
      validity: plan.validity
    }));
    
    // Call REAL OpenAI service
    const service = require('../services/service');
    console.log(`🔄 Calling OpenAI GPT-4 for ${analysisType} analysis...`);
    
    const aiResult = await service.getAIRecommendation(planSummary, {
      analysisType,
      focusProvider,
      totalPlans: allPlans.length,
      priceRange: `$${Math.min(...allPlans.map(p => p.price))} - $${Math.max(...allPlans.map(p => p.price))}`
    }, analysisType);
    
    if (!aiResult || aiResult.message === 'OpenAI API key not configured') {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API not configured. Please check OPENAI_API_KEY in .env file',
        usingRealAI: false
      });
    }
    
    console.log('✅ OpenAI API call completed successfully - CREDITS USED');
    
    // Parse and structure AI response
    const aiAnalysis = aiResult.message;
    
    // Extract insights from AI response
    const insights = {
      marketTrends: aiAnalysis.includes('trend') || aiAnalysis.includes('market') ? 
        'AI identified market trends in the analysis' : 'No specific trends mentioned',
      competitivePosition: aiAnalysis.includes(focusProvider) ? 
        `AI provided analysis of ${focusProvider}'s position` : 'General market analysis',
      priceCompetitiveness: aiAnalysis.includes('price') || aiAnalysis.includes('cost') ? 
        'AI analyzed pricing strategies' : 'No price analysis',
      featureGaps: aiAnalysis.includes('feature') || aiAnalysis.includes('lack') ? 
        'AI identified feature gaps or advantages' : 'No feature analysis'
    };
    
    res.json({
      success: true,
      data: {
        analysisType,
        focusProvider,
        aiAnalysis,
        insights,
        plansSummary: {
          totalPlans: allPlans.length,
          providers: [...new Set(allPlans.map(p => p.provider))],
          priceRange: `$${Math.min(...allPlans.map(p => p.price))} - $${Math.max(...allPlans.map(p => p.price))}`
        },
        timestamp: new Date().toISOString(),
        aiModel: 'OpenAI GPT-4',
        usingRealAI: true,
        creditsUsed: true,
        note: 'This analysis consumed OpenAI API credits'
      }
    });
    
  } catch (error) {
    console.error('AI Analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      endpoint: '/api/plans/ai-analysis',
      usingRealAI: false
    });
  }
});

// TEST OPENAI API: Simple test to verify API key and usage
router.get('/test/openai', async (req, res) => {
  try {
    console.log('🧪 TESTING OPENAI API - MINIMAL USAGE TEST');
    
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: false,
        error: 'OpenAI API key not found in environment',
        hasApiKey: false
      });
    }
    
    console.log(`🔑 API Key exists: ***${process.env.OPENAI_API_KEY.slice(-4)}`);
    
    // Simple test call with minimal usage
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use cheaper model for testing
      messages: [{ role: 'user', content: 'Say "Hello" in exactly one word.' }],
      max_tokens: 5,
      temperature: 0,
    });
    const endTime = Date.now();
    
    console.log('✅ OPENAI API TEST SUCCESSFUL!');
    console.log(`💰 Tokens used: ${completion.usage.total_tokens}`);
    console.log(`💸 Estimated cost: $${(completion.usage.total_tokens * 0.000002).toFixed(6)}`);
    
    res.json({
      success: true,
      message: 'OpenAI API is working!',
      testResponse: completion.choices[0].message.content,
      usage: completion.usage,
      estimatedCost: (completion.usage.total_tokens * 0.000002).toFixed(6),
      responseTime: `${endTime - startTime}ms`,
      model: completion.model,
      hasApiKey: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ OPENAI API TEST FAILED:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: error.code,
      errorType: error.type,
      hasApiKey: !!process.env.OPENAI_API_KEY
    });
  }
});

// COMPETITIVE ANALYSIS: Market positioning analysis
router.get('/plans/competitive-analysis', async (req, res) => {
  try {
    const { targetProvider = 'T-Mobile' } = req.query;
    const PrepaidPlan = require('../models/model');
    const analysis = await PrepaidPlan.getCompetitiveAnalysis(targetProvider);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// BULK OPERATIONS: Add multiple plans
router.post('/plans/bulk-add', validator.validateBulkAddRequest, planController.bulkAddPlans);

// DATA CLEANUP: Remove old scraped data
router.delete('/plans/cleanup', planController.cleanupOldData);

// PROVIDER FRESHNESS: Get freshness status by provider
router.get('/plans/providers/freshness', async (req, res) => {
  try {
    const PrepaidPlan = require('../models/model');
    const freshness = await PrepaidPlan.getProviderFreshness();
    
    res.json({
      success: true,
      data: {
        providers: freshness,
        checkedAt: new Date().toISOString(),
        note: 'Use /api/plans/refresh to update stale data'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Keep-alive endpoint for Render.com cold start prevention
router.get('/ping', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    message: 'PlanCompareAI server is awake and responsive',
    version: '2.0.0'
  });
});

module.exports = router;
