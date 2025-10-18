// New feature: Plan comparison utility functions
// This demonstrates GitHub automated review workflow

/**
 * Utility functions for mobile plan comparisons
 * @author PlanCompareAI Team
 * @version 1.0.0
 * @description Advanced plan comparison with scoring algorithm
 */

class PlanComparator {
    constructor() {
        this.comparisonHistory = [];
    }

    /**
     * Compare two mobile plans based on value proposition
     * @param {Object} plan1 - First plan to compare
     * @param {Object} plan2 - Second plan to compare
     * @returns {Object} Comparison result
     */
    comparePlans(plan1, plan2) {
        // Input validation
        if (!plan1 || !plan2) {
            throw new Error('Both plans are required for comparison');
        }

        const comparison = {
            timestamp: new Date().toISOString(),
            plans: [plan1, plan2],
            winner: null,
            analysis: {}
        };

        // Price comparison
        comparison.analysis.price = this.comparePrices(plan1.price, plan2.price);
        
        // Data allowance comparison
        comparison.analysis.data = this.compareData(plan1.data_limit, plan2.data_limit);
        
        // Feature comparison
        comparison.analysis.features = this.compareFeatures(plan1.features, plan2.features);

        // Determine overall winner
        comparison.winner = this.determineWinner(comparison.analysis);

        // Store in history
        this.comparisonHistory.push(comparison);

        return comparison;
    }

    /**
     * Compare prices with percentage calculation
     */
    comparePrices(price1, price2) {
        const difference = Math.abs(price1 - price2);
        const percentageDiff = ((difference / Math.min(price1, price2)) * 100).toFixed(2);
        
        return {
            cheaper: price1 < price2 ? 'plan1' : 'plan2',
            difference: difference,
            percentageDiff: `${percentageDiff}%`,
            analysis: price1 === price2 ? 'Equal pricing' : `${difference} cheaper`
        };
    }

    /**
     * Compare data allowances
     */
    compareData(data1, data2) {
        // Handle unlimited data
        if (data1 === 'Unlimited' && data2 === 'Unlimited') {
            return { winner: 'tie', analysis: 'Both offer unlimited data' };
        }
        
        if (data1 === 'Unlimited') return { winner: 'plan1', analysis: 'Plan 1 offers unlimited data' };
        if (data2 === 'Unlimited') return { winner: 'plan2', analysis: 'Plan 2 offers unlimited data' };

        // Parse numeric values
        const value1 = parseFloat(data1);
        const value2 = parseFloat(data2);

        return {
            winner: value1 > value2 ? 'plan1' : 'plan2',
            difference: Math.abs(value1 - value2),
            analysis: `${Math.abs(value1 - value2)}GB difference`
        };
    }

    /**
     * Compare plan features
     */
    compareFeatures(features1, features2) {
        const f1 = features1 || {};
        const f2 = features2 || {};
        
        const allFeatures = new Set([...Object.keys(f1), ...Object.keys(f2)]);
        const comparison = {};
        
        allFeatures.forEach(feature => {
            comparison[feature] = {
                plan1: f1[feature] || false,
                plan2: f2[feature] || false,
                winner: f1[feature] === f2[feature] ? 'tie' : (f1[feature] ? 'plan1' : 'plan2')
            };
        });

        return comparison;
    }

    /**
     * Determine overall winner based on analysis
     */
    determineWinner(analysis) {
        let score1 = 0;
        let score2 = 0;

        // Price winner gets 3 points
        if (analysis.price.cheaper === 'plan1') score1 += 3;
        else if (analysis.price.cheaper === 'plan2') score2 += 3;

        // Data winner gets 2 points
        if (analysis.data.winner === 'plan1') score1 += 2;
        else if (analysis.data.winner === 'plan2') score2 += 2;

        // Feature comparison (1 point per feature advantage)
        Object.values(analysis.features).forEach(feature => {
            if (feature.winner === 'plan1') score1 += 1;
            else if (feature.winner === 'plan2') score2 += 1;
        });

        if (score1 > score2) return 'plan1';
        if (score2 > score1) return 'plan2';
        return 'tie';
    }

    /**
     * Get comparison history
     */
    getHistory() {
        return this.comparisonHistory;
    }

    /**
     * Clear comparison history
     */
    clearHistory() {
        this.comparisonHistory = [];
    }
}

module.exports = PlanComparator;