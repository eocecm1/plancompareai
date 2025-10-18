// Request validation logic for incoming API requests
// Comprehensive validation and sanitization for all endpoints

// Validate compare plans request
exports.validateCompareRequest = (req, res, next) => {
  const { provider, minPrice, maxPrice, outputFormat } = req.body;
  const errors = [];

  // Validate provider if provided
  if (provider && typeof provider !== 'string') {
    errors.push('Provider must be a string');
  }

  // Validate price range
  if (minPrice !== undefined) {
    const min = parseFloat(minPrice);
    if (isNaN(min) || min < 0) {
      errors.push('minPrice must be a non-negative number');
    }
  }

  if (maxPrice !== undefined) {
    const max = parseFloat(maxPrice);
    if (isNaN(max) || max < 0) {
      errors.push('maxPrice must be a non-negative number');
    }
  }

  if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
    errors.push('minPrice cannot be greater than maxPrice');
  }

  // Validate output format
  if (outputFormat && !['json', 'markdown', 'table'].includes(outputFormat)) {
    errors.push('outputFormat must be one of: json, markdown, table');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate recommend plans request
exports.validateRecommendRequest = (req, res, next) => {
  const { marketAnalysis, targetSegment, outputFormat } = req.body;
  const errors = [];

  // Validate marketAnalysis if provided
  if (marketAnalysis && typeof marketAnalysis !== 'object') {
    errors.push('marketAnalysis must be an object');
  }

  // Validate targetSegment if provided
  if (targetSegment && typeof targetSegment !== 'string') {
    errors.push('targetSegment must be a string');
  }

  // Validate output format
  if (outputFormat && !['json', 'markdown'].includes(outputFormat)) {
    errors.push('outputFormat must be one of: json, markdown');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate AI analysis request
exports.validateAIAnalysisRequest = (req, res, next) => {
  const { planIds, analysisType } = req.body;
  const errors = [];

  // Validate planIds
  if (!planIds) {
    errors.push('planIds is required');
  } else if (!Array.isArray(planIds)) {
    errors.push('planIds must be an array');
  } else if (planIds.length === 0) {
    errors.push('planIds cannot be empty');
  } else if (planIds.some(id => !Number.isInteger(id) || id <= 0)) {
    errors.push('All planIds must be positive integers');
  }

  // Validate analysisType if provided
  const validAnalysisTypes = ['general', 'pricing', 'features', 'competitive'];
  if (analysisType && !validAnalysisTypes.includes(analysisType)) {
    errors.push(`analysisType must be one of: ${validAnalysisTypes.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// General input sanitization
exports.sanitizeInput = (req, res, next) => {
  // Remove potentially harmful characters from string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>"';&]/g, '').trim();
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body and query
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Validate bulk add plans request
exports.validateBulkAddRequest = (req, res, next) => {
  const { plans } = req.body;
  const errors = [];

  if (!plans) {
    errors.push('plans array is required');
  } else if (!Array.isArray(plans)) {
    errors.push('plans must be an array');
  } else if (plans.length === 0) {
    errors.push('plans array cannot be empty');
  } else if (plans.length > 50) {
    errors.push('plans array cannot contain more than 50 items');
  } else {
    // Validate each plan object
    plans.forEach((plan, index) => {
      if (!plan.provider || typeof plan.provider !== 'string') {
        errors.push(`Plan ${index + 1}: provider is required and must be a string`);
      }
      if (!plan.name || typeof plan.name !== 'string') {
        errors.push(`Plan ${index + 1}: name is required and must be a string`);
      }
      if (!plan.price || typeof plan.price !== 'number' || plan.price <= 0) {
        errors.push(`Plan ${index + 1}: price is required and must be a positive number`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Bulk add validation failed',
      details: errors
    });
  }

  next();
};

// Rate limiting helper (basic implementation)
exports.rateLimitCheck = (req, res, next) => {
  // Basic rate limiting - in production, use redis or similar
  const clientIP = req.ip || req.connection.remoteAddress;
  const rateLimit = parseInt(process.env.API_RATE_LIMIT) || 100;
  
  // This is a simplified implementation
  // In production, implement proper rate limiting with time windows
  req.rateLimitInfo = {
    clientIP,
    limit: rateLimit,
    remaining: rateLimit - 1
  };
  
  next();
};
