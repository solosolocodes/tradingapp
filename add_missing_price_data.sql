-- Add price data for the specific scenario ID 6001e434-f641-430d-b600-6e7d3655e998
-- This script specifically targets the scenario that's showing the warning message

-- Create a function to avoid variable ambiguity issues
CREATE OR REPLACE FUNCTION add_missing_scenario_prices()
RETURNS void AS $$
DECLARE
  v_scenario_id UUID := '6001e434-f641-430d-b600-6e7d3655e998'::UUID;
  v_wallet_id UUID;
  v_wallet_exists BOOLEAN;
  v_asset RECORD;
  v_round INT;
  v_price_fluctuation DECIMAL;
  v_new_price DECIMAL;
BEGIN
  -- First check if this scenario exists
  SELECT EXISTS(SELECT 1 FROM scenario_templates WHERE id = v_scenario_id) INTO v_wallet_exists;
  
  IF NOT v_wallet_exists THEN
    -- Also check experiment_scenarios table
    SELECT EXISTS(SELECT 1 FROM experiment_scenarios WHERE id = v_scenario_id) INTO v_wallet_exists;
  END IF;
  
  IF v_wallet_exists THEN
    RAISE NOTICE 'Scenario found with ID: %', v_scenario_id;
    
    -- Delete any existing price data for this scenario
    DELETE FROM scenario_asset_prices WHERE scenario_id = v_scenario_id;
    RAISE NOTICE 'Deleted existing price data for scenario';
    
    -- Try to get wallet ID from scenario_templates
    SELECT wallet_id INTO v_wallet_id FROM scenario_templates WHERE id = v_scenario_id;
    
    -- If no wallet found in templates, try experiment_scenarios
    IF v_wallet_id IS NULL THEN
      SELECT wallet_id INTO v_wallet_id FROM experiment_scenarios WHERE id = v_scenario_id;
    END IF;
    
    -- If we found a wallet
    IF v_wallet_id IS NOT NULL THEN
      RAISE NOTICE 'Found wallet ID: % for scenario', v_wallet_id;
      
      -- Loop through all assets in the wallet
      FOR v_asset IN 
        SELECT asset_symbol, name, price_spot 
        FROM assets 
        WHERE wallet_id = v_wallet_id
      LOOP
        RAISE NOTICE 'Processing asset: %', v_asset.asset_symbol;
        
        -- For each round (1-3)
        FOR v_round IN 1..3
        LOOP
          -- Generate a random price fluctuation 
          IF v_round = 1 THEN
            v_price_fluctuation := 1.0; -- No change in round 1
          ELSIF v_round = 2 THEN
            v_price_fluctuation := 0.85 + (random() * 0.3); -- -15% to +15%
          ELSE
            v_price_fluctuation := 0.8 + (random() * 0.4); -- -20% to +20%
          END IF;
          
          -- Calculate new price based on spot price and fluctuation
          v_new_price := v_asset.price_spot * v_price_fluctuation;
          
          -- Insert the price data
          INSERT INTO scenario_asset_prices (
            scenario_id, 
            asset_symbol, 
            asset_name, 
            round_number, 
            price
          ) VALUES (
            v_scenario_id,
            v_asset.asset_symbol,
            v_asset.name,
            v_round,
            v_new_price
          );
          
          RAISE NOTICE 'Added price for scenario %, asset %, round %: %', 
            v_scenario_id, v_asset.asset_symbol, v_round, v_new_price;
        END LOOP;
      END LOOP;
    ELSE
      -- No wallet found for this scenario, create sample pricing data
      RAISE NOTICE 'No wallet found for scenario ID: %, creating sample price data', v_scenario_id;
      
      -- Add price data for common cryptocurrencies
      FOR v_asset IN 
        SELECT unnest(ARRAY['BTC', 'ETH', 'SOL', 'USDT', 'XRP']) AS asset_symbol,
               unnest(ARRAY['Bitcoin', 'Ethereum', 'Solana', 'Tether', 'Ripple']) AS name,
               unnest(ARRAY[48000, 2800, 135, 1, 0.55]) AS price_spot
      LOOP
        -- For each round (1-3)
        FOR v_round IN 1..3
        LOOP
          -- Generate a random price fluctuation
          IF v_round = 1 THEN
            v_price_fluctuation := 1.0; -- No change in round 1
          ELSIF v_round = 2 THEN
            v_price_fluctuation := 0.85 + (random() * 0.3); -- -15% to +15%
          ELSE
            v_price_fluctuation := 0.8 + (random() * 0.4); -- -20% to +20%
          END IF;
          
          -- Calculate new price
          v_new_price := v_asset.price_spot * v_price_fluctuation;
          
          -- Insert the price data
          INSERT INTO scenario_asset_prices (
            scenario_id, 
            asset_symbol, 
            asset_name, 
            round_number, 
            price
          ) VALUES (
            v_scenario_id,
            v_asset.asset_symbol,
            v_asset.name,
            v_round,
            v_new_price
          );
          
          RAISE NOTICE 'Added sample price for scenario %, asset %, round %: %', 
            v_scenario_id, v_asset.asset_symbol, v_round, v_new_price;
        END LOOP;
      END LOOP;
    END IF;
    
    -- Output a count of prices
    RAISE NOTICE 'Generated price data complete for scenario %. Total price records: %', 
      v_scenario_id, (SELECT COUNT(*) FROM scenario_asset_prices WHERE scenario_id = v_scenario_id);
  ELSE
    RAISE NOTICE 'No scenario found with ID: %', v_scenario_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Call the function to add the missing prices
SELECT add_missing_scenario_prices();