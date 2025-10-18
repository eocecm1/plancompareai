// Data Management Strategy for PlanCompareAI
// Handles updating dummy data with live scraped data and manages data freshness

const db = require('./config/database');

class DataUpdateManager {
  
  // Strategy 1: Replace all dummy data with fresh scraped data
  static async replaceStaticWithLive(provider = null) {
    console.log('🔄 Strategy 1: Replacing static data with live scraped data...');
    
    try {
      let query = "DELETE FROM prepaid_plans WHERE data_freshness = 'static'";
      let params = [];
      
      if (provider) {
        query += " AND provider = $1";
        params = [provider];
      }
      
      const result = await db.query(query, params);
      console.log(`✅ Removed ${result.rowCount} static plans${provider ? ` for ${provider}` : ''}`);
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error replacing static data:', error.message);
      throw error;
    }
  }
  
  // Strategy 2: Update existing plans with fresh data based on name similarity
  static async updateExistingPlans(newPlans, provider) {
    console.log('🔄 Strategy 2: Updating existing plans with fresh data...');
    
    const results = {
      updated: 0,
      inserted: 0,
      skipped: 0
    };
    
    for (const newPlan of newPlans) {
      try {
        // Check for exact match first
        let existingPlan = await db.query(
          'SELECT id, name, price FROM prepaid_plans WHERE provider = $1 AND name = $2',
          [provider, newPlan.name]
        );
        
        // If no exact match, check for similar names (for plan name updates)
        if (existingPlan.rows.length === 0) {
          // Look for plans with similar names or same price point
          existingPlan = await db.query(`
            SELECT id, name, price 
            FROM prepaid_plans 
            WHERE provider = $1 
            AND (LOWER(name) LIKE LOWER($2) OR price = $3)
            AND data_freshness = 'static'
            LIMIT 1
          `, [provider, `%${newPlan.name.split(' ')[0]}%`, newPlan.price]);
        }
        
        if (existingPlan.rows.length > 0) {
          // Update existing plan
          await db.query(`
            UPDATE prepaid_plans 
            SET name = $3, price = $4, data_allowance = $5, talk_time = $6, validity = $7, 
                combo_offers = $8, features = $9, updated_at = $10, scraped_at = $11, 
                source_url = $12, data_freshness = 'fresh'
            WHERE id = $1 AND provider = $2
          `, [
            existingPlan.rows[0].id, provider, newPlan.name, newPlan.price, 
            newPlan.data_allowance, newPlan.talk_time, newPlan.validity,
            newPlan.combo_offers, JSON.stringify(newPlan.features), 
            new Date(), newPlan.scraped_at, newPlan.source_url
          ]);
          
          console.log(`🔄 Updated: "${existingPlan.rows[0].name}" → "${newPlan.name}" ($${newPlan.price})`);
          results.updated++;
        } else {
          // Insert new plan
          await db.query(`
            INSERT INTO prepaid_plans 
            (provider, name, price, data_allowance, talk_time, validity, combo_offers, features, scraped_at, source_url, data_freshness)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'fresh')
          `, [
            provider, newPlan.name, newPlan.price, newPlan.data_allowance,
            newPlan.talk_time, newPlan.validity, newPlan.combo_offers,
            JSON.stringify(newPlan.features), newPlan.scraped_at, newPlan.source_url
          ]);
          
          console.log(`➕ Inserted: "${newPlan.name}" ($${newPlan.price})`);
          results.inserted++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing plan "${newPlan.name}":`, error.message);
        results.skipped++;
      }
    }
    
    return results;
  }
  
  // Strategy 3: Archive old data and insert fresh data (keeps history)
  static async archiveAndRefresh(provider) {
    console.log('🔄 Strategy 3: Archiving old data and refreshing...');
    
    try {
      // Mark existing live data as 'stale' instead of deleting
      await db.query(`
        UPDATE prepaid_plans 
        SET data_freshness = 'stale', updated_at = NOW()
        WHERE provider = $1 AND data_freshness IN ('fresh', 'recent')
      `, [provider]);
      
      // Static data can be removed or kept as fallback
      const staticCount = await db.query(
        "SELECT COUNT(*) FROM prepaid_plans WHERE provider = $1 AND data_freshness = 'static'",
        [provider]
      );
      
      console.log(`✅ Archived existing live data for ${provider}`);
      console.log(`📚 Keeping ${staticCount.rows[0].count} static plans as fallback`);
      
      return true;
    } catch (error) {
      console.error('❌ Error archiving data:', error.message);
      throw error;
    }
  }
  
  // Strategy 4: Smart merge - keep best of both static and live data
  static async smartMerge(newPlans, provider) {
    console.log('🔄 Strategy 4: Smart merge of static and live data...');
    
    const results = {
      updated: 0,
      inserted: 0,
      kept_static: 0
    };
    
    // Get all existing plans for this provider
    const existingPlans = await db.query(
      'SELECT * FROM prepaid_plans WHERE provider = $1',
      [provider]
    );
    
    const existingPlanMap = new Map();
    existingPlans.rows.forEach(plan => {
      existingPlanMap.set(plan.name.toLowerCase(), plan);
    });
    
    for (const newPlan of newPlans) {
      const existing = existingPlanMap.get(newPlan.name.toLowerCase());
      
      if (existing) {
        // Update if the new plan has different/better data
        if (existing.price !== newPlan.price || existing.data_freshness === 'static') {
          await this.updateExistingPlan(existing.id, newPlan);
          results.updated++;
        } else {
          results.kept_static++;
        }
      } else {
        // Insert new plan
        await this.insertNewPlan(newPlan);
        results.inserted++;
      }
    }
    
    return results;
  }
  
  // Helper method to update a single plan
  static async updateExistingPlan(planId, newPlan) {
    await db.query(`
      UPDATE prepaid_plans 
      SET price = $2, data_allowance = $3, talk_time = $4, validity = $5, 
          combo_offers = $6, features = $7, updated_at = $8, scraped_at = $9, 
          source_url = $10, data_freshness = 'fresh'
      WHERE id = $1
    `, [
      planId, newPlan.price, newPlan.data_allowance, newPlan.talk_time, 
      newPlan.validity, newPlan.combo_offers, JSON.stringify(newPlan.features),
      new Date(), newPlan.scraped_at, newPlan.source_url
    ]);
  }
  
  // Helper method to insert a new plan
  static async insertNewPlan(newPlan) {
    await db.query(`
      INSERT INTO prepaid_plans 
      (provider, name, price, data_allowance, talk_time, validity, combo_offers, features, scraped_at, source_url, data_freshness)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'fresh')
    `, [
      newPlan.provider, newPlan.name, newPlan.price, newPlan.data_allowance,
      newPlan.talk_time, newPlan.validity, newPlan.combo_offers,
      JSON.stringify(newPlan.features), newPlan.scraped_at, newPlan.source_url
    ]);
  }
  
  // Data cleanup and maintenance
  static async cleanupOldData(daysOld = 7) {
    console.log('🧹 Cleaning up old data...');
    
    try {
      // Remove very old stale data
      const result = await db.query(`
        DELETE FROM prepaid_plans 
        WHERE data_freshness = 'stale' 
        AND updated_at < NOW() - INTERVAL '${daysOld} days'
      `);
      
      console.log(`🗑️ Removed ${result.rowCount} old stale plans`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error.message);
      throw error;
    }
  }
  
  // Get data freshness report
  static async getDataFreshnessReport() {
    try {
      const result = await db.query(`
        SELECT 
          provider,
          data_freshness,
          COUNT(*) as count,
          AVG(price) as avg_price,
          MIN(price) as min_price,
          MAX(price) as max_price,
          MAX(scraped_at) as last_scraped
        FROM prepaid_plans 
        GROUP BY provider, data_freshness
        ORDER BY provider, data_freshness
      `);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting freshness report:', error.message);
      throw error;
    }
  }
}

module.exports = DataUpdateManager;