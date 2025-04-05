-- Clean and reset database with fresh placeholder data
-- This script:
-- 1. Removes all existing data
-- 2. Creates new placeholder wallets, assets, scenarios and experiments
-- 3. Adds asset price data for all scenarios

-- 1. CLEAN ALL EXISTING DATA

-- First cascade delete participants and responses
DELETE FROM experiment_participants;
DELETE FROM experiment_scenario_responses;
DELETE FROM experiment_survey_responses;

-- Clear out experiment components
DELETE FROM experiment_intro_screens;
DELETE FROM experiment_scenarios;
DELETE FROM experiment_break_screens;
DELETE FROM experiment_survey_questions;

-- Clear all price data 
DELETE FROM scenario_asset_prices;

-- Clear scenario templates
DELETE FROM scenario_templates;

-- Clear experiments
DELETE FROM experiments;

-- Clear assets and wallets
DELETE FROM assets;
DELETE FROM wallets;

-- 2. CREATE NEW PLACEHOLDER DATA

-- Create three wallets with different characteristics
INSERT INTO wallets (id, name, description) 
VALUES 
  ('e5efd3d0-5053-4a1e-91a2-bce611db3cb1', 'Conservative Portfolio', 'Low-risk portfolio with stable assets'),
  ('f7a80f25-69bf-4a12-b699-05446ddb638d', 'Balanced Portfolio', 'Moderate risk with diversified assets'),
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'Aggressive Portfolio', 'High-risk, high-reward crypto assets');

-- Add assets to Conservative Portfolio
INSERT INTO assets (wallet_id, asset_symbol, name, price_spot, amount)
VALUES
  ('e5efd3d0-5053-4a1e-91a2-bce611db3cb1', 'BTC', 'Bitcoin', 48000, 0.2),
  ('e5efd3d0-5053-4a1e-91a2-bce611db3cb1', 'ETH', 'Ethereum', 2800, 1.5),
  ('e5efd3d0-5053-4a1e-91a2-bce611db3cb1', 'USDT', 'Tether', 1, 20000),
  ('e5efd3d0-5053-4a1e-91a2-bce611db3cb1', 'USDC', 'USD Coin', 1, 10000);

-- Add assets to Balanced Portfolio
INSERT INTO assets (wallet_id, asset_symbol, name, price_spot, amount)
VALUES
  ('f7a80f25-69bf-4a12-b699-05446ddb638d', 'BTC', 'Bitcoin', 48000, 0.5),
  ('f7a80f25-69bf-4a12-b699-05446ddb638d', 'ETH', 'Ethereum', 2800, 5),
  ('f7a80f25-69bf-4a12-b699-05446ddb638d', 'SOL', 'Solana', 135, 15),
  ('f7a80f25-69bf-4a12-b699-05446ddb638d', 'USDT', 'Tether', 1, 8000),
  ('f7a80f25-69bf-4a12-b699-05446ddb638d', 'MATIC', 'Polygon', 0.85, 2000);

-- Add assets to Aggressive Portfolio
INSERT INTO assets (wallet_id, asset_symbol, name, price_spot, amount)
VALUES
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'BTC', 'Bitcoin', 48000, 0.3),
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'ETH', 'Ethereum', 2800, 2),
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'SOL', 'Solana', 135, 50),
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'AVAX', 'Avalanche', 38, 100),
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'ATOM', 'Cosmos', 11.5, 200),
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'DOT', 'Polkadot', 6.8, 300),
  ('b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 'USDT', 'Tether', 1, 2000);

-- Create scenario templates
INSERT INTO scenario_templates (id, title, description, duration, wallet_id, rounds, round_duration)
VALUES
  ('07cc0f85-5c26-431e-ba7f-3a7a2d9a7a4c', 'Market Crash', 'Crypto market experiences a dramatic price drop. How do you react?', 300, 'f7a80f25-69bf-4a12-b699-05446ddb638d', 3, 60),
  ('1e36a055-c71e-494d-a316-f8a193b91ae9', 'Bull Run', 'Prices are rising rapidly across the market. What actions do you take?', 300, 'b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 3, 60),
  ('3ca1301f-7b49-4f22-b912-86c9c1a352b4', 'Stablecoin Crisis', 'Major stablecoin loses its peg. How do you respond to the crisis?', 300, 'e5efd3d0-5053-4a1e-91a2-bce611db3cb1', 3, 60);

-- Create experiment
INSERT INTO experiments (id, title, description, status, scenario_count)
VALUES ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'Crypto Market Reactions', 'Study how traders respond to different market conditions', 'active', 3);

-- Add experiment sections
INSERT INTO experiment_intro_screens (experiment_id, title, content, order_index)
VALUES
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'Welcome', 'Welcome to the Crypto Market Reactions study. In this experiment, you will be presented with different market scenarios and asked to make trading decisions.', 0),
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'Instructions', 'For each scenario, you will see your portfolio assets changing in value across multiple rounds. Watch how prices evolve and consider what actions you would take.', 1);

-- Add scenarios to experiment
INSERT INTO experiment_scenarios (experiment_id, scenario_template_id, title, description, duration, wallet_id, rounds, round_duration, order_index)
VALUES
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', '07cc0f85-5c26-431e-ba7f-3a7a2d9a7a4c', 'Market Crash', 'Crypto market experiences a dramatic price drop. How do you react?', 300, 'f7a80f25-69bf-4a12-b699-05446ddb638d', 3, 60, 0),
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', '1e36a055-c71e-494d-a316-f8a193b91ae9', 'Bull Run', 'Prices are rising rapidly across the market. What actions do you take?', 300, 'b9c3ef1e-9c6b-4e22-8412-64fa72921fc8', 3, 60, 2),
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', '3ca1301f-7b49-4f22-b912-86c9c1a352b4', 'Stablecoin Crisis', 'Major stablecoin loses its peg. How do you respond to the crisis?', 300, 'e5efd3d0-5053-4a1e-91a2-bce611db3cb1', 3, 60, 4);

-- Add break screens
INSERT INTO experiment_break_screens (experiment_id, title, content, order_index)
VALUES
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'First Break', 'You have completed the first scenario. Take a moment to rest before continuing to the next one.', 1),
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'Second Break', 'You have completed the second scenario. Take a moment to rest before continuing to the final scenario.', 3);

-- Add survey questions
INSERT INTO experiment_survey_questions (experiment_id, question, type, options, order_index)
VALUES
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'Which scenario was most difficult to make decisions in?', 'multiple_choice', '["Market Crash", "Bull Run", "Stablecoin Crisis"]', 5),
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'How confident were you in your decision making?', 'multiple_choice', '["Not confident at all", "Somewhat unconfident", "Neutral", "Somewhat confident", "Very confident"]', 6),
  ('8a53c9a8-08d4-4b75-a34e-c12f08d09ff5', 'What strategies did you consider when prices were changing rapidly?', 'text', NULL, 7);

-- 3. GENERATE ASSET PRICE DATA FOR SCENARIOS

-- Market Crash scenario price data
DO $$
DECLARE
    scenario_id UUID := '07cc0f85-5c26-431e-ba7f-3a7a2d9a7a4c';
    wallet_id UUID := 'f7a80f25-69bf-4a12-b699-05446ddb638d';
    asset_rec RECORD;
BEGIN
    -- Loop through each asset in the wallet
    FOR asset_rec IN 
        SELECT asset_symbol, name, price_spot 
        FROM assets 
        WHERE wallet_id = wallet_id
    LOOP
        -- Round 1: Base prices
        INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
        VALUES (scenario_id, asset_rec.asset_symbol, asset_rec.name, 1, asset_rec.price_spot);
        
        -- Round 2: Prices drop 15-25%
        INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
        VALUES (
            scenario_id, 
            asset_rec.asset_symbol, 
            asset_rec.name, 
            2, 
            asset_rec.price_spot * (0.75 + random() * 0.1) -- 75-85% of original
        );
        
        -- Round 3: Prices drop further 10-20% from round 2
        INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
        VALUES (
            scenario_id, 
            asset_rec.asset_symbol, 
            asset_rec.name, 
            3, 
            asset_rec.price_spot * (0.6 + random() * 0.1) -- 60-70% of original
        );
    END LOOP;
    
    -- Stablecoins behave differently - they stay mostly stable but USDT loses some peg
    UPDATE scenario_asset_prices 
    SET price = price * 0.98
    WHERE scenario_id = scenario_id 
    AND asset_symbol = 'USDT'
    AND round_number = 3;
END;
$$;

-- Bull Run scenario price data
DO $$
DECLARE
    scenario_id UUID := '1e36a055-c71e-494d-a316-f8a193b91ae9';
    wallet_id UUID := 'b9c3ef1e-9c6b-4e22-8412-64fa72921fc8';
    asset_rec RECORD;
BEGIN
    -- Loop through each asset in the wallet
    FOR asset_rec IN 
        SELECT asset_symbol, name, price_spot 
        FROM assets 
        WHERE wallet_id = wallet_id
    LOOP
        -- Round 1: Base prices
        INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
        VALUES (scenario_id, asset_rec.asset_symbol, asset_rec.name, 1, asset_rec.price_spot);
        
        -- Round 2: Prices rise 10-30%
        INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
        VALUES (
            scenario_id, 
            asset_rec.asset_symbol, 
            asset_rec.name, 
            2, 
            asset_rec.price_spot * (1.1 + random() * 0.2) -- 110-130% of original
        );
        
        -- Round 3: Prices rise further 15-50% from round 1
        INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
        VALUES (
            scenario_id, 
            asset_rec.asset_symbol, 
            asset_rec.name, 
            3, 
            asset_rec.price_spot * (1.15 + random() * 0.35) -- 115-150% of original
        );
    END LOOP;
    
    -- Stablecoins remain stable
    UPDATE scenario_asset_prices 
    SET price = 1.0
    WHERE scenario_id = scenario_id 
    AND asset_symbol = 'USDT'
    AND (round_number = 2 OR round_number = 3);
END;
$$;

-- Stablecoin Crisis scenario price data
DO $$
DECLARE
    scenario_id UUID := '3ca1301f-7b49-4f22-b912-86c9c1a352b4';
    wallet_id UUID := 'e5efd3d0-5053-4a1e-91a2-bce611db3cb1';
    asset_rec RECORD;
BEGIN
    -- Loop through each asset in the wallet
    FOR asset_rec IN 
        SELECT asset_symbol, name, price_spot 
        FROM assets 
        WHERE wallet_id = wallet_id
    LOOP
        -- Round 1: Base prices
        INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
        VALUES (scenario_id, asset_rec.asset_symbol, asset_rec.name, 1, asset_rec.price_spot);
        
        -- For all assets except stablecoins, slight drop of 5-15%
        IF asset_rec.asset_symbol NOT IN ('USDT', 'USDC') THEN
            -- Round 2: Small drop
            INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
            VALUES (
                scenario_id, 
                asset_rec.asset_symbol, 
                asset_rec.name, 
                2, 
                asset_rec.price_spot * (0.85 + random() * 0.1) -- 85-95% of original
            );
            
            -- Round 3: Rebound slightly 
            INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
            VALUES (
                scenario_id, 
                asset_rec.asset_symbol, 
                asset_rec.name, 
                3, 
                asset_rec.price_spot * (0.9 + random() * 0.05) -- 90-95% of original
            );
        END IF;
    END LOOP;
    
    -- USDT specifically loses peg
    INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
    VALUES 
        ('3ca1301f-7b49-4f22-b912-86c9c1a352b4', 'USDT', 'Tether', 2, 0.92),
        ('3ca1301f-7b49-4f22-b912-86c9c1a352b4', 'USDT', 'Tether', 3, 0.85);
    
    -- USDC maintains peg
    INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
    VALUES 
        ('3ca1301f-7b49-4f22-b912-86c9c1a352b4', 'USDC', 'USD Coin', 2, 1.0),
        ('3ca1301f-7b49-4f22-b912-86c9c1a352b4', 'USDC', 'USD Coin', 3, 1.0);
END;
$$;

-- Copy asset price data to experiment scenarios
INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
SELECT 
    es.id, 
    sap.asset_symbol, 
    sap.asset_name, 
    sap.round_number, 
    sap.price
FROM scenario_asset_prices sap
JOIN experiment_scenarios es ON es.scenario_template_id = sap.scenario_id
WHERE NOT EXISTS (
    SELECT 1 
    FROM scenario_asset_prices 
    WHERE scenario_id = es.id 
    AND asset_symbol = sap.asset_symbol 
    AND round_number = sap.round_number
);

-- Update scenario count in experiment
UPDATE experiments
SET scenario_count = (SELECT COUNT(*) FROM experiment_scenarios WHERE experiment_id = experiments.id);

-- Output message for confirmation
DO $$
BEGIN
    RAISE NOTICE 'Database reset complete with fresh placeholder data';
    RAISE NOTICE 'Created % wallets', (SELECT COUNT(*) FROM wallets);
    RAISE NOTICE 'Created % assets', (SELECT COUNT(*) FROM assets);
    RAISE NOTICE 'Created % scenario templates', (SELECT COUNT(*) FROM scenario_templates);
    RAISE NOTICE 'Created % experiments', (SELECT COUNT(*) FROM experiments);
    RAISE NOTICE 'Created % asset price records', (SELECT COUNT(*) FROM scenario_asset_prices);
END;
$$;