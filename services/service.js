// Service functions for plan comparison, suggestions, and integrations
// Reusable logic for controllers with database and AI integration

const PrepaidPlan = require('../models/model');
const OpenAI = require('openai');
const axios = require('axios');
const db = require('../config/database');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Compare plans based on criteria
exports.comparePlans = async (criteria = {}) => {
  try {
    let plans;
    
    // Get plans based on criteria
    if (criteria.provider) {
      plans = await PrepaidPlan.getPlansByProvider(criteria.provider);
    } else if (criteria.minPrice && criteria.maxPrice) {
      plans = await PrepaidPlan.getPlansByPriceRange(criteria.minPrice, criteria.maxPrice);
    } else {
      plans = await PrepaidPlan.getAllPlans();
    }

    // Add value scores to each plan
    const plansWithScores = plans.map(plan => ({
      ...plan,
      valueScore: plan.calculateValueScore()
    }));

    // Sort by value score (highest first)
    plansWithScores.sort((a, b) => b.valueScore - a.valueScore);

    // Store comparison result in database
    await db.query(
      'INSERT INTO plan_comparisons (comparison_criteria, results) VALUES ($1, $2)',
      [criteria, plansWithScores]
    );

    return {
      criteria,
      totalPlans: plansWithScores.length,
      plans: plansWithScores,
      comparedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Plan comparison failed: ${error.message}`);
  }
};

// Suggest best/compact plans using AI
exports.suggestPlans = async (userPreferences = {}) => {
  try {
    const allPlans = await PrepaidPlan.getAllPlans();
    
    // Get top 5 plans by value score
    const topPlans = allPlans
      .map(plan => ({ ...plan, valueScore: plan.calculateValueScore() }))
      .sort((a, b) => b.valueScore - a.valueScore)
      .slice(0, 5);

    // Use AI to generate personalized suggestions
    const aiSuggestion = await this.callAIModel({
      type: 'suggestion',
      userPreferences,
      topPlans: topPlans.slice(0, 3)
    });

    return {
      suggestedPlans: topPlans,
      aiRecommendation: aiSuggestion,
      suggestedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Plan suggestion failed: ${error.message}`);
  }
};

// Recommend new plans for T-Mobile using AI analysis
exports.recommendPlans = async (marketAnalysis = {}) => {
  try {
    const competitorPlans = await PrepaidPlan.getAllPlans();
    const tmobilePlans = await PrepaidPlan.getPlansByProvider('T-Mobile');
    
    // Use AI to analyze market gaps and suggest new plans
    const aiRecommendation = await this.callAIModel({
      type: 'new_plan_recommendation',
      competitorPlans: competitorPlans.slice(0, 10),
      tmobilePlans,
      marketAnalysis
    });

    // Store AI recommendation in database
    await db.query(
      'INSERT INTO ai_recommendations (input_criteria, recommendation, model_used) VALUES ($1, $2, $3)',
      [{ marketAnalysis, competitorCount: competitorPlans.length }, aiRecommendation, 'gpt-4']
    );

    return {
      currentTMobilePlans: tmobilePlans.length,
      competitorPlansAnalyzed: competitorPlans.length,
      recommendation: aiRecommendation,
      recommendedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Plan recommendation failed: ${error.message}`);
  }
};

// AI/LLM integration using OpenAI
exports.callAIModel = async (input) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { message: 'OpenAI API key not configured', type: 'warning' };
    }

    let prompt = '';
    
    if (input.type === 'suggestion') {
      prompt = `As a mobile plan expert, analyze these top prepaid plans and provide personalized suggestions:

User Preferences: ${JSON.stringify(input.userPreferences, null, 2)}

Top Plans: ${JSON.stringify(input.topPlans, null, 2)}

Provide a concise recommendation explaining which plan is best for this user and why.`;
    } else if (input.type === 'new_plan_recommendation') {
      prompt = `As a T-Mobile strategy consultant, analyze the competitive landscape and recommend new prepaid plans:

T-Mobile Current Plans: ${JSON.stringify(input.tmobilePlans, null, 2)}

Competitor Plans: ${JSON.stringify(input.competitorPlans, null, 2)}

Provide 2-3 specific new plan recommendations for T-Mobile with pricing, features, and market positioning rationale.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return {
      aiResponse: completion.choices[0].message.content,
      model: 'gpt-4',
      timestamp: new Date().toISOString(),
      tokensUsed: completion.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return {
      message: `AI integration error: ${error.message}`,
      type: 'error'
    };
  }
};

// AI-powered plan recommendation and analysis
exports.getAIRecommendation = async (plans, criteria, analysisType = 'recommendation') => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { message: 'OpenAI API key not configured', type: 'warning' };
    }

    let prompt = '';
    
    if (analysisType === 'plan_recommendation') {
      prompt = `As a mobile plan expert, analyze these prepaid plans and provide intelligent recommendations:

Available Plans: ${JSON.stringify(plans.slice(0, 10), null, 2)}

User Criteria: ${JSON.stringify(criteria, null, 2)}

Please provide:
1. Top 3 plan recommendations with reasoning
2. Best value analysis
3. Feature comparison insights
4. Price-to-value assessment

Keep it concise and practical.`;
    } else if (analysisType === 'market_analysis') {
      prompt = `As a telecommunications market analyst, provide a comprehensive analysis of this prepaid mobile plan data:

Plans Data: ${JSON.stringify(plans.slice(0, 15), null, 2)}

Analysis Focus: ${criteria.focusProvider || 'General Market'}
Price Range: ${criteria.priceRange || 'All ranges'}
Total Plans: ${criteria.totalPlans || plans.length}

Please provide:
1. Market positioning analysis
2. Competitive pricing insights  
3. Feature differentiation trends
4. Strategic recommendations for ${criteria.focusProvider || 'market players'}
5. Consumer value propositions

Provide actionable insights in a professional tone.`;
    } else {
      prompt = `Analyze these mobile plans and provide recommendations:

Plans: ${JSON.stringify(plans.slice(0, 8), null, 2)}
Criteria: ${JSON.stringify(criteria, null, 2)}

Provide clear recommendations with reasoning.`;
    }

    console.log(`🤖 Calling OpenAI GPT-4 for ${analysisType}...`);
    console.log(`🔑 Using API Key: ${process.env.OPENAI_API_KEY ? `***${process.env.OPENAI_API_KEY.slice(-4)}` : 'NOT SET'}`);
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });
    const endTime = Date.now();

    console.log(`✅ OpenAI API call SUCCESS!`);
    console.log(`💰 TOKENS USED: ${completion.usage?.total_tokens || 'unknown'} tokens`);
    console.log(`💸 COST ESTIMATE: ~$${((completion.usage?.total_tokens || 0) * 0.00003).toFixed(4)} USD`);
    console.log(`⏱️ Response time: ${endTime - startTime}ms`);
    console.log(`📊 Model used: ${completion.model || 'gpt-4'}`);
    console.log(`🎯 Response length: ${completion.choices[0].message.content.length} characters`);

    return {
      message: completion.choices[0].message.content,
      model: 'gpt-4',
      timestamp: new Date().toISOString(),
      tokensUsed: completion.usage?.total_tokens || 0,
      type: 'success'
    };
  } catch (error) {
    console.error('❌ OpenAI API ERROR DETAILS:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error type:', error.type);
    console.error('Full error:', error);
    
    // Check for specific error types
    if (error.code === 'invalid_api_key') {
      console.error('🔑 INVALID API KEY - Check your OPENAI_API_KEY in .env file');
    } else if (error.code === 'insufficient_quota') {
      console.error('💳 INSUFFICIENT QUOTA - Check your OpenAI billing');
    } else if (error.code === 'rate_limit_exceeded') {
      console.error('⏱️ RATE LIMIT EXCEEDED - Too many requests');
    }
    
    return {
      message: `AI analysis error: ${error.message}`,
      type: 'error',
      errorCode: error.code,
      errorType: error.type
    };
  }
};

// n8n automation integration
exports.triggerN8nWorkflow = async (data) => {
  try {
    if (!process.env.N8N_WEBHOOK_URL) {
      return { message: 'n8n webhook URL not configured', type: 'warning' };
    }

    const response = await axios.post(process.env.N8N_WEBHOOK_URL, {
      source: 'PlanCompareAI',
      timestamp: new Date().toISOString(),
      data
    });

    return {
      message: 'n8n workflow triggered successfully',
      webhookResponse: response.data,
      type: 'success'
    };
  } catch (error) {
    console.error('n8n webhook error:', error.message);
    return {
      message: `n8n integration error: ${error.message}`,
      type: 'error'
    };
  }
};

// Get comparison history from database
exports.getComparisonHistory = async (limit = 10) => {
  try {
    const result = await db.query(
      'SELECT * FROM plan_comparisons ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  } catch (error) {
    throw new Error(`Error fetching comparison history: ${error.message}`);
  }
};
