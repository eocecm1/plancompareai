-- Database schema for PlanCompareAI
-- Run this script in PostgreSQL to create the required tables

-- Create database (run this first if database doesn't exist)
-- CREATE DATABASE plancompareai;

-- Use the database
-- \c plancompareai;

-- Table for storing prepaid plans (ENHANCED with scraping metadata)
CREATE TABLE IF NOT EXISTS prepaid_plans (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    data_allowance VARCHAR(100),
    data_limit VARCHAR(100), -- Alias for data_allowance for compatibility
    talk_time VARCHAR(100),
    validity VARCHAR(100),
    description TEXT, -- Plan description
    combo_offers TEXT[], -- Array of combo offers
    features JSONB, -- Additional features as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- NEW: Dynamic data tracking columns
    scraped_at TIMESTAMP, -- When this plan was scraped from website
    source_url VARCHAR(500), -- URL where plan was scraped from
    scraping_session_id UUID, -- Links to scraping session
    data_freshness VARCHAR(20) DEFAULT 'static', -- fresh, recent, stale, static
    -- Constraints
    UNIQUE(provider, name) -- Prevent duplicate plans
);

-- Table for storing comparison results
CREATE TABLE IF NOT EXISTS plan_comparisons (
    id SERIAL PRIMARY KEY,
    comparison_criteria JSONB,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing AI recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    input_criteria JSONB,
    recommendation JSONB,
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Table for tracking scraping activity and sessions
CREATE TABLE IF NOT EXISTS scraping_logs (
    id SERIAL PRIMARY KEY,
    session_id UUID DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_plans_found INTEGER DEFAULT 0,
    successful_providers INTEGER DEFAULT 0,
    failed_providers INTEGER DEFAULT 0,
    details JSONB, -- Full scraping results
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'completed' -- running, completed, failed
);

-- NEW: Table for tracking provider-specific scraping status
CREATE TABLE IF NOT EXISTS provider_scraping_status (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    last_successful_scrape TIMESTAMP,
    last_attempt TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    failure_reason TEXT,
    plans_found_last_scrape INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider)
);

-- Insert sample data (mix of static and simulated scraped data)
-- STATIC DATA (original sample plans)
INSERT INTO prepaid_plans (provider, name, price, data_allowance, talk_time, validity, combo_offers, features, data_freshness) VALUES
('T-Mobile', 'Unlimited Essentials (Sample)', 50.00, 'Unlimited', 'Unlimited', '30 days', ARRAY['Netflix Basic'], '{"hotspot": "3G speeds", "international": false}', 'static'),
('AT&T', 'Prepaid Unlimited Plus (Sample)', 65.00, 'Unlimited', 'Unlimited', '30 days', ARRAY['HBO MAX'], '{"hotspot": "10GB LTE", "international": false}', 'static'),
('Verizon', 'Unlimited Welcome (Sample)', 65.00, 'Unlimited', 'Unlimited', '30 days', ARRAY[]::TEXT[], '{"hotspot": "none", "international": false}', 'static')
ON CONFLICT DO NOTHING;

-- SIMULATED SCRAPED DATA (examples of what scraped data looks like)
INSERT INTO prepaid_plans (provider, name, price, data_allowance, talk_time, validity, combo_offers, features, scraped_at, source_url, data_freshness) VALUES
('T-Mobile', 'Magenta (Live)', 70.00, 'Unlimited', 'Unlimited', '30 days', ARRAY['Netflix Standard', '5GB Hotspot'], '{"hotspot": "LTE speeds", "international": true}', NOW() - INTERVAL '2 hours', 'https://www.t-mobile.com/cell-phone-plans/prepaid', 'fresh'),
('Sprint', 'Unlimited Basic (Legacy)', 60.00, 'Unlimited', 'Unlimited', '30 days', ARRAY['Hulu'], '{"hotspot": "500MB", "international": false}', NOW() - INTERVAL '1 day', 'legacy_data', 'recent')
ON CONFLICT DO NOTHING;

-- Insert initial provider scraping status
INSERT INTO provider_scraping_status (provider, last_successful_scrape, last_attempt, consecutive_failures, is_active, plans_found_last_scrape) VALUES
('T-Mobile', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', 0, true, 2),
('AT&T', NULL, NOW() - INTERVAL '1 day', 1, true, 0),
('Verizon', NULL, NOW() - INTERVAL '1 day', 1, true, 0),
('Sprint', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 0, true, 1)
ON CONFLICT (provider) DO NOTHING;

-- Insert sample scraping log
INSERT INTO scraping_logs (timestamp, total_plans_found, successful_providers, failed_providers, details, status) VALUES
(NOW() - INTERVAL '2 hours', 3, 2, 2, '{"note": "Initial sample scraping session", "providers": ["T-Mobile", "Sprint"]}', 'completed')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance (ENHANCED)
CREATE INDEX IF NOT EXISTS idx_prepaid_plans_provider ON prepaid_plans(provider);
CREATE INDEX IF NOT EXISTS idx_prepaid_plans_price ON prepaid_plans(price);
CREATE INDEX IF NOT EXISTS idx_prepaid_plans_scraped_at ON prepaid_plans(scraped_at); -- NEW
CREATE INDEX IF NOT EXISTS idx_prepaid_plans_data_freshness ON prepaid_plans(data_freshness); -- NEW
CREATE INDEX IF NOT EXISTS idx_plan_comparisons_created_at ON plan_comparisons(created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_timestamp ON scraping_logs(timestamp); -- NEW
CREATE INDEX IF NOT EXISTS idx_scraping_logs_session_id ON scraping_logs(session_id); -- NEW