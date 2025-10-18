// Helper functions and constants for PlanCompareAI
// Comprehensive formatting and utility functions

// Format plan for consistent output
exports.formatPlan = (plan) => {
  return {
    id: plan.id,
    provider: plan.provider,
    name: plan.name,
    price: `$${plan.price.toFixed(2)}`,
    dataAllowance: plan.data_allowance || 'N/A',
    talkTime: plan.talk_time || 'N/A',
    validity: plan.validity || 'N/A',
    comboOffers: plan.combo_offers || [],
    features: plan.features || {},
    valueScore: plan.valueScore || 0
  };
};

// Convert plans array to markdown table
exports.plansToMarkdown = (plans) => {
  if (!plans || plans.length === 0) {
    return 'No plans available.';
  }

  let markdown = '# Prepaid Plan Comparison\n\n';
  markdown += '| Provider | Plan Name | Price | Data | Talk Time | Validity | Value Score |\n';
  markdown += '|----------|-----------|-------|------|-----------|----------|-------------|\n';

  plans.forEach(plan => {
    const formatted = this.formatPlan(plan);
    markdown += `| ${formatted.provider} | ${formatted.name} | ${formatted.price} | ${formatted.dataAllowance} | ${formatted.talkTime} | ${formatted.validity} | ${formatted.valueScore} |\n`;
  });

  // Add combo offers section
  markdown += '\n## Combo Offers\n\n';
  plans.forEach(plan => {
    if (plan.combo_offers && plan.combo_offers.length > 0) {
      markdown += `**${plan.provider} - ${plan.name}**: ${plan.combo_offers.join(', ')}\n\n`;
    }
  });

  return markdown;
};

// Convert plans to table data (for frontend tables)
exports.plansToTable = (plans) => {
  if (!plans || plans.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = ['Provider', 'Plan Name', 'Price', 'Data', 'Talk Time', 'Validity', 'Value Score', 'Combo Offers'];
  
  const rows = plans.map(plan => {
    const formatted = this.formatPlan(plan);
    return [
      formatted.provider,
      formatted.name,
      formatted.price,
      formatted.dataAllowance,
      formatted.talkTime,
      formatted.validity,
      formatted.valueScore,
      formatted.comboOffers.join(', ') || 'None'
    ];
  });

  return { headers, rows };
};

// Convert suggestions to markdown format
exports.suggestionsToMarkdown = (suggestions) => {
  let markdown = '# Personalized Plan Suggestions\n\n';
  
  if (suggestions.aiRecommendation && suggestions.aiRecommendation.aiResponse) {
    markdown += '## AI Recommendation\n\n';
    markdown += suggestions.aiRecommendation.aiResponse + '\n\n';
  }

  markdown += '## Top Suggested Plans\n\n';
  if (suggestions.suggestedPlans && suggestions.suggestedPlans.length > 0) {
    markdown += this.plansToMarkdown(suggestions.suggestedPlans);
  }

  return markdown;
};

// Convert recommendations to markdown report
exports.recommendationsToMarkdown = (recommendations) => {
  let markdown = '# T-Mobile New Plan Recommendations\n\n';
  
  markdown += `**Analysis Date**: ${recommendations.recommendedAt}\n\n`;
  markdown += `**Current T-Mobile Plans**: ${recommendations.currentTMobilePlans}\n\n`;
  markdown += `**Competitor Plans Analyzed**: ${recommendations.competitorPlansAnalyzed}\n\n`;
  
  if (recommendations.recommendation && recommendations.recommendation.aiResponse) {
    markdown += '## AI Strategic Recommendations\n\n';
    markdown += recommendations.recommendation.aiResponse + '\n\n';
  }

  return markdown;
};

// Price formatting utilities
exports.formatPrice = (price) => {
  if (typeof price !== 'number') return 'N/A';
  return `$${price.toFixed(2)}`;
};

// Data allowance formatting
exports.formatDataAllowance = (data) => {
  if (!data) return 'N/A';
  if (data.toLowerCase().includes('unlimited')) return 'Unlimited';
  return data;
};

// Calculate savings between plans
exports.calculateSavings = (currentPrice, newPrice) => {
  if (typeof currentPrice !== 'number' || typeof newPrice !== 'number') {
    return null;
  }
  
  const savings = currentPrice - newPrice;
  const percentageSavings = ((savings / currentPrice) * 100).toFixed(1);
  
  return {
    amount: savings,
    percentage: percentageSavings,
    formatted: savings > 0 ? `Save $${savings.toFixed(2)} (${percentageSavings}%)` : `$${Math.abs(savings).toFixed(2)} more (${Math.abs(percentageSavings)}%)`
  };
};

// Generate comparison summary
exports.generateComparisonSummary = (plans) => {
  if (!plans || plans.length === 0) {
    return { message: 'No plans to compare' };
  }

  const prices = plans.map(p => p.price).filter(p => typeof p === 'number');
  const cheapest = plans.find(p => p.price === Math.min(...prices));
  const mostExpensive = plans.find(p => p.price === Math.max(...prices));
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  return {
    totalPlans: plans.length,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: parseFloat(avgPrice.toFixed(2))
    },
    cheapestPlan: cheapest ? this.formatPlan(cheapest) : null,
    mostExpensivePlan: mostExpensive ? this.formatPlan(mostExpensive) : null,
    providers: [...new Set(plans.map(p => p.provider))]
  };
};

// Validate environment configuration
exports.validateConfig = () => {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const optional = ['OPENAI_API_KEY', 'N8N_WEBHOOK_URL'];
  
  const missing = required.filter(key => !process.env[key]);
  const warnings = optional.filter(key => !process.env[key]);
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    message: missing.length > 0 ? `Missing required environment variables: ${missing.join(', ')}` : 'Configuration is valid'
  };
};

// Convert scraping results to markdown summary
exports.scrapingResultsToMarkdown = (results) => {
  let markdown = '# Plan Data Scraping Results\n\n';
  
  markdown += `**Scraping Completed**: ${results.timestamp}\n\n`;
  markdown += `**Total Plans Found**: ${results.totalPlans}\n\n`;
  markdown += `**Successful Providers**: ${results.successful.length}\n\n`;
  markdown += `**Failed Providers**: ${results.failed.length}\n\n`;
  
  if (results.successful.length > 0) {
    markdown += '## ✅ Successfully Scraped\n\n';
    results.successful.forEach(provider => {
      markdown += `- **${provider.provider}**: ${provider.plansFound} plans\n`;
    });
    markdown += '\n';
  }
  
  if (results.failed.length > 0) {
    markdown += '## ❌ Failed to Scrape\n\n';
    results.failed.forEach(provider => {
      markdown += `- **${provider.provider}**: ${provider.error}\n`;
    });
    markdown += '\n';
  }
  
  markdown += '## Data Freshness\n\n';
  markdown += 'All scraped data is now available in the database and will be used for comparisons.\n\n';
  markdown += '_Note: Data is scraped from official carrier websites and may take time to reflect the latest changes._';
  
  return markdown;
};

// Constants
exports.PROVIDERS = {
  TMOBILE: 'T-Mobile',
  ATT: 'AT&T',
  VERIZON: 'Verizon',
  SPRINT: 'Sprint'
};

exports.OUTPUT_FORMATS = {
  JSON: 'json',
  MARKDOWN: 'markdown',
  TABLE: 'table'
};

exports.ANALYSIS_TYPES = {
  GENERAL: 'general',
  PRICING: 'pricing',
  FEATURES: 'features',
  COMPETITIVE: 'competitive'
};

// Scraping status constants
exports.SCRAPING_STATUS = {
  FRESH: 'fresh',
  RECENT: 'recent', 
  STALE: 'stale',
  STATIC: 'static'
};
