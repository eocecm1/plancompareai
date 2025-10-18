// Plan Controller for Dynamic Data Management
// Handles plan fetching, updating, and scraping operations
// Maintains separation between web scraping logic and business logic

const scraperService = require('../services/scraperService');
const service = require('../services/service');
const PrepaidPlan = require('../models/model');
const utility = require('../utils/utility');

// Refresh data for a specific provider with strategy selection
// ENHANCED DATA MANAGEMENT: Allows choosing different update strategies
exports.refreshProviderData = async (req, res) => {
  try {
    const { provider } = req.params;
    const { strategy = 'smart-update' } = req.body;
    
    console.log(`🔄 Refreshing ${provider} data with ${strategy} strategy...`);
    
    // Validate provider
    const validProviders = ['T-Mobile', 'AT&T', 'Verizon', 'Sprint'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
      });
    }
    
    // Validate strategy
    const validStrategies = ['smart-update', 'replace-static', 'replace-all'];
    if (!validStrategies.includes(strategy)) {
      return res.status(400).json({
        success: false,
        error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`
      });
    }
    
    const result = await scraperService.refreshProviderData(provider, strategy);
    
    if (result.success) {
      res.json({
        success: true,
        message: `${provider} data refreshed successfully`,
        ...result,
        refreshedAt: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to refresh ${provider} data`,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error in refreshProviderData:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Trigger manual data refresh from all competitor websites
// DYNAMIC DATA CONTROLLER: This endpoint refreshes all plan data from live sources
exports.refreshPlanData = async (req, res) => {
  try {
    console.log('🔄 Manual plan data refresh triggered...');
    
    // Start the scraping process
    const scrapingResults = await scraperService.scrapeAllCompetitorPlans();
    
    // Get updated plan counts from database
    const updatedPlans = await PrepaidPlan.getAllPlans();
    
    // Format response based on requested output format
    const { outputFormat = 'json' } = req.query;
    let response = {
      success: true,
      message: 'Plan data refresh completed',
      scrapingResults,
      totalPlansInDatabase: updatedPlans.length,
      refreshedAt: new Date().toISOString(),
      dataSource: 'live_scraping' // Indicates data is from live sources
    };
    
    if (outputFormat === 'markdown') {
      response.markdownSummary = utility.scrapingResultsToMarkdown(scrapingResults);
    }
    
    // Trigger n8n workflow for business intelligence on data refresh
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await service.triggerN8nWorkflow({
          type: 'plan_data_refresh',
          results: scrapingResults,
          timestamp: new Date().toISOString()
        });
      } catch (n8nError) {
        console.warn('n8n webhook failed:', n8nError.message);
      }
    }
    
    res.json(response);
  } catch (error) {
    console.error('Plan data refresh failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh plan data',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get scraping status and data freshness information
exports.getScrapingStatus = async (req, res) => {
  try {
    const status = await scraperService.getScrapingStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        apiEndpoint: '/api/plans/refresh',
        lastChecked: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting scraping status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Scrape specific provider plans
exports.refreshProviderPlans = async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider parameter is required'
      });
    }
    
    console.log(`🔄 Refreshing ${provider} plans...`);
    
    let scraperFunction;
    switch (provider.toLowerCase()) {
      case 't-mobile':
      case 'tmobile':
        scraperFunction = scraperService.scrapeTMobilePlans;
        break;
      case 'att':
      case 'at&t':
        scraperFunction = scraperService.scrapeATTPlans;
        break;
      case 'verizon':
        scraperFunction = scraperService.scrapeVerizonPlans;
        break;
      case 'sprint':
        scraperFunction = scraperService.scrapeSprintPlans;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Provider '${provider}' not supported. Available: t-mobile, att, verizon, sprint`
        });
    }
    
    // Run the specific scraper
    const plans = await scraperFunction();
    
    // Store plans in database
    let storedCount = 0;
    for (const planData of plans) {
      try {
        await scraperService.storePlanInDatabase(planData);
        storedCount++;
      } catch (storeError) {
        console.error(`Failed to store ${provider} plan:`, storeError.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        provider: provider,
        plansFound: plans.length,
        plansStored: storedCount,
        plans: plans,
        refreshedAt: new Date().toISOString(),
        dataSource: 'live_scraping'
      }
    });
  } catch (error) {
    console.error(`Error refreshing ${req.params.provider} plans:`, error.message);
    res.status(500).json({
      success: false,
      error: `Failed to refresh ${req.params.provider} plans`,
      details: error.message
    });
  }
};

// Get plans with data freshness indicators
// LIVE DATA COMPARISON: Always works with fresh data from database
exports.getPlansWithFreshness = async (req, res) => {
  try {
    const { provider, includeFreshness = 'true' } = req.query;
    
    let plans;
    if (provider) {
      plans = await PrepaidPlan.getPlansByProvider(provider);
    } else {
      plans = await PrepaidPlan.getAllPlans();
    }
    
    // Add freshness indicators to each plan
    const plansWithFreshness = plans.map(plan => {
      const planData = { ...plan };
      
      if (includeFreshness === 'true') {
        const scrapedAt = plan.scraped_at;
        if (scrapedAt) {
          const ageInHours = (new Date() - new Date(scrapedAt)) / (1000 * 60 * 60);
          planData.dataFreshness = {
            scrapedAt: scrapedAt,
            ageInHours: Math.round(ageInHours * 100) / 100,
            status: ageInHours < 24 ? 'fresh' : ageInHours < 168 ? 'recent' : 'stale',
            sourceUrl: plan.source_url || 'unknown'
          };
        } else {
          planData.dataFreshness = {
            status: 'static',
            note: 'This is sample/static data - use /api/plans/refresh to get live data'
          };
        }
      }
      
      return planData;
    });
    
    res.json({
      success: true,
      data: {
        plans: plansWithFreshness,
        totalPlans: plansWithFreshness.length,
        dataSource: 'database_with_live_updates',
        note: 'Use /api/plans/refresh to update with latest data from competitor websites'
      }
    });
  } catch (error) {
    console.error('Error getting plans with freshness:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Enhanced comparison with live data
// DYNAMIC COMPARISON: Uses fresh data from database, not static arrays
exports.compareWithLiveData = async (req, res) => {
  try {
    const { provider, minPrice, maxPrice, outputFormat = 'json', forceRefresh = 'false' } = req.body;
    
    // Optionally refresh data before comparison if requested
    if (forceRefresh === 'true') {
      console.log('🔄 Force refresh requested, updating plan data...');
      await scraperService.scrapeAllCompetitorPlans();
    }
    
    // Use the existing comparison service which now works with live database data
    const criteria = { provider, minPrice, maxPrice };
    const comparison = await service.comparePlans(criteria);
    
    // Add data freshness information to the response
    const freshestPlan = comparison.plans.reduce((newest, plan) => {
      if (!plan.scraped_at) return newest;
      if (!newest.scraped_at) return plan;
      return new Date(plan.scraped_at) > new Date(newest.scraped_at) ? plan : newest;
    }, {});
    
    let response = {
      ...comparison,
      dataFreshness: {
        latestScrapeTime: freshestPlan.scraped_at || null,
        totalLivePlans: comparison.plans.filter(p => p.scraped_at).length,
        dataSource: 'live_database_with_scraping'
      }
    };
    
    // Format output based on request
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
    console.error('Live data comparison error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Clean up old scraped data
exports.cleanupOldData = async (req, res) => {
  try {
    const { daysOld = 7 } = req.query;
    const cleanedCount = await scraperService.cleanupOldPlans(parseInt(daysOld));
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old plans`,
      daysOld: parseInt(daysOld),
      cleanedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up old data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Bulk plan operations (add multiple plans)
exports.bulkAddPlans = async (req, res) => {
  try {
    const { plans } = req.body;
    
    if (!plans || !Array.isArray(plans)) {
      return res.status(400).json({
        success: false,
        error: 'Plans array is required'
      });
    }
    
    let addedCount = 0;
    let errors = [];
    
    for (const planData of plans) {
      try {
        await scraperService.storePlanInDatabase({
          ...planData,
          scraped_at: new Date(),
          source_url: 'manual_bulk_add'
        });
        addedCount++;
      } catch (error) {
        errors.push({
          plan: planData.name || 'Unknown',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        totalPlansProvided: plans.length,
        plansAdded: addedCount,
        errors: errors,
        addedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Bulk add plans error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};