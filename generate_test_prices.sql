-- IMPORTANT: This script generates test price data for scenario_asset_prices table
-- It creates different prices for each round of each scenario to demonstrate price changes
-- Run this script to populate your database with test data for showing price changes

-- EACH SCENARIO & ROUND will have DIFFERENT PRICES:
-- Round 1: Base prices (from wallet spot prices)
-- Round 2: Prices fluctuate -15% to +15% from Round 1
-- Round 3: Prices fluctuate -20% to +20% from Round 1

-- This ensures visible price changes during the experiment
DO $$
DECLARE
  scenario_rec RECORD;
  wallet_rec RECORD;
  asset_rec RECORD;
  round INT;
  price_fluctuation DECIMAL;
  new_price DECIMAL;
BEGIN
  -- Loop through all scenario templates
  FOR scenario_rec IN SELECT id FROM scenario_templates
  LOOP
    -- Delete any existing price data for this scenario
    DELETE FROM scenario_asset_prices WHERE scenario_id = scenario_rec.id;
    
    -- Get the wallet assigned to this scenario
    SELECT wallet_id INTO wallet_rec FROM scenario_templates WHERE id = scenario_rec.id;
    
    -- If wallet exists
    IF wallet_rec.wallet_id IS NOT NULL THEN
      -- Loop through all assets in the wallet
      FOR asset_rec IN 
        SELECT asset_symbol, name, price_spot 
        FROM assets 
        WHERE wallet_id = wallet_rec.wallet_id
      LOOP
        -- For each round (1-3)
        FOR round IN 1..3
        LOOP
          -- Generate a random price fluctuation between -15% and +15%
          -- Different for each round to show price changes
          IF round = 1 THEN
            price_fluctuation := 1.0; -- No change in round 1
          ELSIF round = 2 THEN
            price_fluctuation := 0.85 + (random() * 0.3); -- -15% to +15%
          ELSE
            price_fluctuation := 0.8 + (random() * 0.4); -- -20% to +20%
          END IF;
          
          -- Calculate new price based on spot price and fluctuation
          new_price := asset_rec.price_spot * price_fluctuation;
          
          -- Insert the price data
          INSERT INTO scenario_asset_prices (
            scenario_id, 
            asset_symbol, 
            asset_name, 
            round_number, 
            price
          ) VALUES (
            scenario_rec.id,
            asset_rec.asset_symbol,
            asset_rec.name,
            round,
            new_price
          );
          
          -- Log the insertion
          RAISE NOTICE 'Added price for scenario %, asset %, round %: %', 
            scenario_rec.id, asset_rec.asset_symbol, round, new_price;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Output a count of prices
  RAISE NOTICE 'Generated price data complete. Total price records: %', 
    (SELECT COUNT(*) FROM scenario_asset_prices);
END;
$$;