// Controller for handling business logic per route
// Each function maps to a route in root.js with database and AI integration

const service = require('../services/service');
const utility = require('../utils/utility');

// Compare prepaid plans
exports.comparePlans = async (req, res) => {
  try {
    const { provider, minPrice, maxPrice, outputFormat = 'json' } = req.body;
    
    // Validate price range if provided
    if (minPrice && maxPrice && minPrice > maxPrice) {
      return res.status(400).json({ error: 'Invalid price range: minPrice cannot be greater than maxPrice' });
    }

    const criteria = { provider, minPrice, maxPrice };
    const comparison = await service.comparePlans(criteria);

    // Format output based on request
    let response = comparison;
    if (outputFormat === 'markdown') {
      response.markdownTable = utility.plansToMarkdown(comparison.plans);
    } else if (outputFormat === 'table') {
      response.tableData = utility.plansToTable(comparison.plans);
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Compare plans error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Suggest best/compact plans for users
exports.suggestPlans = async (req, res) => {
  try {
    const { budget, dataNeeds, features, outputFormat = 'json' } = req.query;
    
    const userPreferences = {
      budget: budget ? parseFloat(budget) : null,
      dataNeeds,
      features: features ? features.split(',') : []
    };

    const suggestions = await service.suggestPlans(userPreferences);

    // Format output based on request
    let response = suggestions;
    if (outputFormat === 'markdown') {
      response.markdownSummary = utility.suggestionsToMarkdown(suggestions);
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Suggest plans error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Recommend new plans for T-Mobile
exports.recommendPlans = async (req, res) => {
  try {
    const { marketAnalysis, targetSegment, outputFormat = 'json' } = req.body;
    
    const analysisData = {
      marketAnalysis: marketAnalysis || {},
      targetSegment
    };

    const recommendations = await service.recommendPlans(analysisData);

    // Trigger n8n workflow for business intelligence
    if (process.env.N8N_WEBHOOK_URL) {
      await service.triggerN8nWorkflow({
        type: 'new_plan_recommendation',
        recommendations
      });
    }

    let response = recommendations;
    if (outputFormat === 'markdown') {
      response.markdownReport = utility.recommendationsToMarkdown(recommendations);
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Recommend plans error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all plans (simple endpoint)
exports.getAllPlans = async (req, res) => {
  try {
    const { outputFormat = 'json' } = req.query;
    const PrepaidPlan = require('../models/model');
    console.log('📊 Fetching all plans from database...');
    
    const plans = await PrepaidPlan.getAllPlans();
    console.log(`📱 Found ${plans ? plans.length : 0} plans in database`);
    console.log('🔍 First few plans:', plans ? plans.slice(0, 3).map(p => ({ provider: p.provider, name: p.name, price: p.price })) : 'No plans');

    let response = { plans };
    if (outputFormat === 'markdown') {
      response.markdownTable = utility.plansToMarkdown(plans);
    } else if (outputFormat === 'table') {
      response.tableData = utility.plansToTable(plans);
    }

    console.log('📤 Sending response with structure:', { success: true, dataKeys: Object.keys(response) });
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get all plans error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get comparison history
exports.getComparisonHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const history = await service.getComparisonHistory(parseInt(limit));

    res.json({
      success: true,
      data: {
        history,
        count: history.length
      }
    });
  } catch (error) {
    console.error('Get comparison history error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// AI-powered plan analysis
exports.aiAnalysis = async (req, res) => {
  try {
    const { planIds, analysisType = 'general' } = req.body;
    
    if (!planIds || !Array.isArray(planIds)) {
      return res.status(400).json({ error: 'planIds array is required' });
    }

    // Get specific plans for analysis
    const PrepaidPlan = require('../models/model');
    const allPlans = await PrepaidPlan.getAllPlans();
    const selectedPlans = allPlans.filter(plan => planIds.includes(plan.id));

    const aiAnalysis = await service.callAIModel({
      type: 'analysis',
      plans: selectedPlans,
      analysisType
    });

    res.json({
      success: true,
      data: {
        analyzedPlans: selectedPlans.length,
        analysis: aiAnalysis
      }
    });
  } catch (error) {
    console.error('AI analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
