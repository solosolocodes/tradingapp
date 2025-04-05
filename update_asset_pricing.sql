-- IMPORTANT: This table stores the price for each asset for each round of each scenario
-- This is what will be displayed to users when doing experiments
-- Structure:
--   scenario_id: Links to a scenario_template
--   asset_symbol: The asset code (BTC, ETH, etc.)
--   round_number: The round number (1, 2, 3, etc.)
--   price: The price for this asset in this specific round
--
-- Example: BTC price = $50,000 in Round 1, $48,000 in Round 2, $52,000 in Round 3
CREATE TABLE IF NOT EXISTS scenario_asset_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenario_templates(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  asset_name TEXT,
  round_number INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id, asset_symbol, round_number)
);

-- Create indexes for asset prices (if they don't already exist)
CREATE INDEX IF NOT EXISTS scenario_asset_prices_scenario_id_idx ON scenario_asset_prices(scenario_id);
CREATE INDEX IF NOT EXISTS scenario_asset_prices_asset_symbol_idx ON scenario_asset_prices(asset_symbol);
CREATE INDEX IF NOT EXISTS scenario_asset_prices_round_number_idx ON scenario_asset_prices(round_number);

-- Sample asset data for testing if no data exists in the scenarios
DO $$
DECLARE
  scenario_count INTEGER;
  scenario_id UUID;
BEGIN
  -- Check if scenario_templates table has any records
  SELECT COUNT(*) INTO scenario_count FROM scenario_templates;
  
  -- If there are scenarios but no asset prices, add sample data
  IF scenario_count > 0 THEN
    -- Check if there are any price records
    SELECT COUNT(*) INTO scenario_count FROM scenario_asset_prices;
    
    IF scenario_count = 0 THEN
      -- Get the first scenario ID to add sample data
      SELECT id INTO scenario_id FROM scenario_templates LIMIT 1;
      
      -- Add some sample asset prices for testing
      INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
      VALUES
        (scenario_id, 'BTC', 'Bitcoin', 1, 50000),
        (scenario_id, 'ETH', 'Ethereum', 1, 3000),
        (scenario_id, 'SOL', 'Solana', 1, 150),
        (scenario_id, 'BTC', 'Bitcoin', 2, 48000),
        (scenario_id, 'ETH', 'Ethereum', 2, 2900),
        (scenario_id, 'SOL', 'Solana', 2, 145),
        (scenario_id, 'BTC', 'Bitcoin', 3, 52000),
        (scenario_id, 'ETH', 'Ethereum', 3, 3100),
        (scenario_id, 'SOL', 'Solana', 3, 155);
    END IF;
  END IF;
END;
$$;

-- Ensure experiment scenarios have the wallet_id field populated
-- This is important for asset display in the experiment
DO $$
BEGIN
  -- Copy wallet_id from scenario_templates to experiment_scenarios where missing
  UPDATE experiment_scenarios es
  SET wallet_id = st.wallet_id
  FROM scenario_templates st
  WHERE es.scenario_template_id = st.id
  AND es.wallet_id IS NULL
  AND st.wallet_id IS NOT NULL;
END;
$$;

-- Add sample wallet and assets if they don't exist (for testing)
DO $$
DECLARE
  wallet_id UUID;
  wallet_count INTEGER;
BEGIN
  -- Check if wallets table exists and has any records
  SELECT COUNT(*) INTO wallet_count FROM wallets;
  
  -- If no wallets exist, create a sample wallet and assets
  IF wallet_count = 0 THEN
    -- Create a demo wallet
    INSERT INTO wallets (name, description)
    VALUES ('Demo Wallet', 'Sample wallet for trading scenarios')
    RETURNING id INTO wallet_id;
    
    -- Add some assets to the wallet
    INSERT INTO assets (wallet_id, asset_symbol, name, price_spot, amount)
    VALUES
      (wallet_id, 'BTC', 'Bitcoin', 50000, 0.5),
      (wallet_id, 'ETH', 'Ethereum', 3000, 5),
      (wallet_id, 'SOL', 'Solana', 150, 20),
      (wallet_id, 'USDT', 'Tether', 1, 10000);
  END IF;
END;
$$;