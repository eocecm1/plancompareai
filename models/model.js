// Data model for prepaid plans with database operations
// Defines schema and database interaction methods

const db = require('../config/database');

/**
 * PrepaidPlan Class
 * Represents a prepaid mobile plan with database operations
 */
class PrepaidPlan {
  constructor({ id, provider, name, price, data_allowance, talk_time, validity, combo_offers, features }) {
    this.id = id;
    this.provider = provider;
    this.name = name;
    this.price = parseFloat(price);
    this.data_allowance = data_allowance;
    this.talk_time = talk_time;
    this.validity = validity;
    this.combo_offers = combo_offers || [];
    this.features = features || {};
  }

  // Get all plans from database
  static async getAllPlans() {
    try {
      const result = await db.query('SELECT * FROM prepaid_plans ORDER BY price ASC');
      return result.rows.map(row => new PrepaidPlan(row));
    } catch (error) {
      throw new Error(`Error fetching plans: ${error.message}`);
    }
  }

  // Get plans by provider
  static async getPlansByProvider(provider) {
    try {
      const result = await db.query('SELECT * FROM prepaid_plans WHERE provider = $1 ORDER BY price ASC', [provider]);
      return result.rows.map(row => new PrepaidPlan(row));
    } catch (error) {
      throw new Error(`Error fetching plans for ${provider}: ${error.message}`);
    }
  }

  // Get plans within price range
  static async getPlansByPriceRange(minPrice, maxPrice) {
    try {
      const result = await db.query(
        'SELECT * FROM prepaid_plans WHERE price BETWEEN $1 AND $2 ORDER BY price ASC',
        [minPrice, maxPrice]
      );
      return result.rows.map(row => new PrepaidPlan(row));
    } catch (error) {
      throw new Error(`Error fetching plans in price range: ${error.message}`);
    }
  }

  // Save new plan to database
  async save() {
    try {
      const result = await db.query(
        `INSERT INTO prepaid_plans (provider, name, price, data_allowance, talk_time, validity, combo_offers, features)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [this.provider, this.name, this.price, this.data_allowance, this.talk_time, this.validity, this.combo_offers, this.features]
      );
      return new PrepaidPlan(result.rows[0]);
    } catch (error) {
      throw new Error(`Error saving plan: ${error.message}`);
    }
  }

  // Calculate value score (enhanced for scraped data)
  calculateValueScore() {
    let score = 0;
    
    // Base score from price (lower price = higher score)
    score += Math.max(0, 100 - this.price);
    
    // Bonus for unlimited data
    if (this.data_allowance && this.data_allowance.toLowerCase().includes('unlimited')) {
      score += 20;
    }
    
    // Bonus for combo offers
    score += this.combo_offers.length * 5;
    
    // Bonus for features
    if (this.features.hotspot && this.features.hotspot !== 'none') {
      score += 10;
    }
    if (this.features.international) {
      score += 15;
    }
    
    // Bonus for data freshness (scraped data is more valuable)
    if (this.scraped_at) {
      const hoursOld = (new Date() - new Date(this.scraped_at)) / (1000 * 60 * 60);
      if (hoursOld < 24) score += 5; // Fresh data bonus
    }
    
    return Math.round(score);
  }

  // DYNAMIC DATA METHODS: Enhanced model methods for scraped data
  
  // Get only fresh plans (scraped within specified hours)
  static async getFreshPlans(maxAgeHours = 24) {
    try {
      const result = await db.query(`
        SELECT * FROM prepaid_plans 
        WHERE scraped_at IS NOT NULL 
        AND scraped_at > NOW() - INTERVAL '${maxAgeHours} hours'
        ORDER BY scraped_at DESC, price ASC
      `);
      return result.rows.map(row => new PrepaidPlan(row));
    } catch (error) {
      throw new Error(`Error fetching fresh plans: ${error.message}`);
    }
  }

  // Get plans with data freshness indicators
  static async getPlansWithFreshness() {
    try {
      const result = await db.query(`
        SELECT *, 
        CASE 
          WHEN scraped_at IS NULL THEN 'static'
          WHEN scraped_at > NOW() - INTERVAL '24 hours' THEN 'fresh'
          WHEN scraped_at > NOW() - INTERVAL '168 hours' THEN 'recent'
          ELSE 'stale'
        END as freshness_status,
        EXTRACT(EPOCH FROM (NOW() - scraped_at))/3600 as age_hours
        FROM prepaid_plans 
        ORDER BY scraped_at DESC NULLS LAST, price ASC
      `);
      
      return result.rows.map(row => {
        const plan = new PrepaidPlan(row);
        plan.freshness_status = row.freshness_status;
        plan.age_hours = row.age_hours ? Math.round(row.age_hours * 100) / 100 : null;
        return plan;
      });
    } catch (error) {
      throw new Error(`Error fetching plans with freshness: ${error.message}`);
    }
  }

  // Get providers with their last scrape times
  static async getProviderFreshness() {
    try {
      const result = await db.query(`
        SELECT 
          provider,
          COUNT(*) as total_plans,
          COUNT(CASE WHEN scraped_at IS NOT NULL THEN 1 END) as scraped_plans,
          MAX(scraped_at) as last_scraped,
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(price) as avg_price
        FROM prepaid_plans 
        GROUP BY provider
        ORDER BY last_scraped DESC NULLS LAST
      `);
      
      return result.rows.map(row => ({
        provider: row.provider,
        totalPlans: parseInt(row.total_plans),
        scrapedPlans: parseInt(row.scraped_plans),
        lastScraped: row.last_scraped,
        priceRange: {
          min: parseFloat(row.min_price),
          max: parseFloat(row.max_price),
          average: parseFloat(row.avg_price).toFixed(2)
        },
        dataStatus: row.last_scraped ? 'dynamic' : 'static'
      }));
    } catch (error) {
      throw new Error(`Error fetching provider freshness: ${error.message}`);
    }
  }

  // Get competitive analysis data
  static async getCompetitiveAnalysis(targetProvider = 'T-Mobile') {
    try {
      const result = await db.query(`
        WITH provider_stats AS (
          SELECT 
            provider,
            COUNT(*) as plan_count,
            AVG(price) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price,
            MAX(scraped_at) as last_updated
          FROM prepaid_plans
          GROUP BY provider
        ),
        target_stats AS (
          SELECT * FROM provider_stats WHERE provider = $1
        )
        SELECT 
          ps.*,
          CASE 
            WHEN ps.avg_price < ts.avg_price THEN 'cheaper'
            WHEN ps.avg_price > ts.avg_price THEN 'more_expensive'
            ELSE 'similar'
          END as price_positioning
        FROM provider_stats ps
        CROSS JOIN target_stats ts
        ORDER BY ps.avg_price ASC
      `, [targetProvider]);

      return {
        targetProvider,
        analysis: result.rows,
        generatedAt: new Date(),
        dataSource: 'live_database'
      };
    } catch (error) {
      throw new Error(`Error getting competitive analysis: ${error.message}`);
    }
  }
}

module.exports = PrepaidPlan;
