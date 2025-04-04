-- Create scenarios table to handle reusable scenario templates
CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 300,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  rounds INTEGER NOT NULL DEFAULT 1,
  option_template JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for finding active scenarios
CREATE INDEX IF NOT EXISTS scenario_templates_is_active_idx ON scenario_templates(is_active);
CREATE INDEX IF NOT EXISTS scenario_templates_wallet_id_idx ON scenario_templates(wallet_id);

-- Create table for asset price rounds in scenarios
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

-- Create indexes for scenario asset prices
CREATE INDEX IF NOT EXISTS scenario_asset_prices_scenario_id_idx ON scenario_asset_prices(scenario_id);
CREATE INDEX IF NOT EXISTS scenario_asset_prices_asset_symbol_idx ON scenario_asset_prices(asset_symbol);

-- Enable RLS on new tables
ALTER TABLE scenario_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_asset_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access
CREATE POLICY "Allow anonymous access to scenario_templates" ON scenario_templates
  FOR ALL USING (true);
  
CREATE POLICY "Allow anonymous access to scenario_asset_prices" ON scenario_asset_prices
  FOR ALL USING (true);

-- Modify experiment_scenarios to reference scenario templates
ALTER TABLE experiment_scenarios
ADD COLUMN IF NOT EXISTS scenario_template_id UUID REFERENCES scenario_templates(id) ON DELETE SET NULL;

-- Create index for scenario template references
CREATE INDEX IF NOT EXISTS experiment_scenarios_template_id_idx ON experiment_scenarios(scenario_template_id);

-- Create function to copy scenario data from template when assigned to experiment
CREATE OR REPLACE FUNCTION copy_scenario_data_from_template()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if scenario_template_id is set
  IF NEW.scenario_template_id IS NOT NULL THEN
    -- Get data from template
    SELECT 
      title, 
      description, 
      duration, 
      wallet_id, 
      option_template
    INTO 
      NEW.title, 
      NEW.description, 
      NEW.duration, 
      NEW.wallet_id, 
      NEW.options
    FROM 
      scenario_templates
    WHERE 
      id = NEW.scenario_template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to copy scenario data
CREATE TRIGGER copy_scenario_data_from_template_trigger
BEFORE INSERT OR UPDATE ON experiment_scenarios
FOR EACH ROW
EXECUTE FUNCTION copy_scenario_data_from_template();

-- Create sample scenario templates
INSERT INTO scenario_templates (title, description, duration, rounds, option_template)
VALUES 
  ('Market Crash', 'The market has experienced a sudden 30% drop. How would you react?', 240, 3, 
   '[{"text": "Sell everything", "value": "A"}, {"text": "Hold and wait", "value": "B"}, {"text": "Buy more at discounted prices", "value": "C"}]'),
  ('Bull Market', 'Asset prices have been climbing steadily for 6 months. What would you do?', 240, 3, 
   '[{"text": "Take profits", "value": "A"}, {"text": "Hold positions", "value": "B"}, {"text": "Increase exposure", "value": "C"}]'),
  ('Sideways Market', 'The market has been trading in a range for months. How would you position yourself?', 240, 3, 
   '[{"text": "Stay in cash", "value": "A"}, {"text": "Use range-trading strategies", "value": "B"}, {"text": "Look for breakout opportunities", "value": "C"}]'),
  ('New Regulation', 'A major regulatory announcement affects your assets. What action would you take?', 300, 2, 
   '[{"text": "Sell affected assets", "value": "A"}, {"text": "Research implications before acting", "value": "B"}, {"text": "Buy assets others are panic-selling", "value": "C"}]'),
  ('Interest Rate Hike', 'The central bank has increased interest rates unexpectedly. How do you respond?', 300, 3, 
   '[{"text": "Move to safer assets", "value": "A"}, {"text": "Maintain current allocation", "value": "B"}, {"text": "Increase allocation to rate-sensitive sectors", "value": "C"}]')
ON CONFLICT DO NOTHING;

-- Assign wallets to scenarios (using existing wallets)
DO $$
DECLARE
  demo_wallet_id UUID;
  trading_wallet_id UUID;
  investment_wallet_id UUID;
BEGIN
  -- Get wallet IDs
  SELECT id INTO demo_wallet_id FROM wallets WHERE name = 'Demo Wallet' LIMIT 1;
  SELECT id INTO trading_wallet_id FROM wallets WHERE name = 'Trading Wallet' LIMIT 1;
  SELECT id INTO investment_wallet_id FROM wallets WHERE name = 'Investment Wallet' LIMIT 1;
  
  -- Only proceed if wallets exist
  IF demo_wallet_id IS NOT NULL AND trading_wallet_id IS NOT NULL AND investment_wallet_id IS NOT NULL THEN
    -- Assign wallets to scenarios
    UPDATE scenario_templates SET wallet_id = demo_wallet_id WHERE title = 'Market Crash';
    UPDATE scenario_templates SET wallet_id = trading_wallet_id WHERE title = 'Bull Market';
    UPDATE scenario_templates SET wallet_id = investment_wallet_id WHERE title = 'Sideways Market';
    UPDATE scenario_templates SET wallet_id = trading_wallet_id WHERE title = 'New Regulation';
    UPDATE scenario_templates SET wallet_id = investment_wallet_id WHERE title = 'Interest Rate Hike';
  END IF;
END;
$$;

-- Add asset prices for each scenario
DO $$
DECLARE
  market_crash_id UUID;
  bull_market_id UUID;
  sideways_market_id UUID;
  new_regulation_id UUID;
  interest_rate_id UUID;
BEGIN
  -- Get scenario IDs
  SELECT id INTO market_crash_id FROM scenario_templates WHERE title = 'Market Crash' LIMIT 1;
  SELECT id INTO bull_market_id FROM scenario_templates WHERE title = 'Bull Market' LIMIT 1;
  SELECT id INTO sideways_market_id FROM scenario_templates WHERE title = 'Sideways Market' LIMIT 1;
  SELECT id INTO new_regulation_id FROM scenario_templates WHERE title = 'New Regulation' LIMIT 1;
  SELECT id INTO interest_rate_id FROM scenario_templates WHERE title = 'Interest Rate Hike' LIMIT 1;
  
  -- Only add prices if scenarios exist
  IF market_crash_id IS NOT NULL THEN
    -- Market Crash scenario prices
    INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
    VALUES
      (market_crash_id, 'BTC', 'Bitcoin', 1, 60000),
      (market_crash_id, 'ETH', 'Ethereum', 1, 3000),
      (market_crash_id, 'SOL', 'Solana', 1, 150),
      (market_crash_id, 'BTC', 'Bitcoin', 2, 45000),
      (market_crash_id, 'ETH', 'Ethereum', 2, 2200),
      (market_crash_id, 'SOL', 'Solana', 2, 100),
      (market_crash_id, 'BTC', 'Bitcoin', 3, 42000),
      (market_crash_id, 'ETH', 'Ethereum', 3, 2000),
      (market_crash_id, 'SOL', 'Solana', 3, 90)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF bull_market_id IS NOT NULL THEN
    -- Bull Market scenario prices
    INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
    VALUES
      (bull_market_id, 'BTC', 'Bitcoin', 1, 50000),
      (bull_market_id, 'ETH', 'Ethereum', 1, 2500),
      (bull_market_id, 'SOL', 'Solana', 1, 120),
      (bull_market_id, 'BTC', 'Bitcoin', 2, 55000),
      (bull_market_id, 'ETH', 'Ethereum', 2, 2800),
      (bull_market_id, 'SOL', 'Solana', 2, 140),
      (bull_market_id, 'BTC', 'Bitcoin', 3, 62000),
      (bull_market_id, 'ETH', 'Ethereum', 3, 3200),
      (bull_market_id, 'SOL', 'Solana', 3, 165)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF sideways_market_id IS NOT NULL THEN
    -- Sideways Market scenario prices
    INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
    VALUES
      (sideways_market_id, 'BTC', 'Bitcoin', 1, 54000),
      (sideways_market_id, 'ETH', 'Ethereum', 1, 2700),
      (sideways_market_id, 'SOL', 'Solana', 1, 130),
      (sideways_market_id, 'BTC', 'Bitcoin', 2, 53500),
      (sideways_market_id, 'ETH', 'Ethereum', 2, 2750),
      (sideways_market_id, 'SOL', 'Solana', 2, 125),
      (sideways_market_id, 'BTC', 'Bitcoin', 3, 54200),
      (sideways_market_id, 'ETH', 'Ethereum', 3, 2680),
      (sideways_market_id, 'SOL', 'Solana', 3, 132)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF new_regulation_id IS NOT NULL THEN
    -- New Regulation scenario prices
    INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
    VALUES
      (new_regulation_id, 'BTC', 'Bitcoin', 1, 58000),
      (new_regulation_id, 'ETH', 'Ethereum', 1, 2900),
      (new_regulation_id, 'SOL', 'Solana', 1, 145),
      (new_regulation_id, 'BTC', 'Bitcoin', 2, 52000),
      (new_regulation_id, 'ETH', 'Ethereum', 2, 2600),
      (new_regulation_id, 'SOL', 'Solana', 2, 120)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF interest_rate_id IS NOT NULL THEN
    -- Interest Rate Hike scenario prices
    INSERT INTO scenario_asset_prices (scenario_id, asset_symbol, asset_name, round_number, price)
    VALUES
      (interest_rate_id, 'BTC', 'Bitcoin', 1, 56000),
      (interest_rate_id, 'ETH', 'Ethereum', 1, 2800),
      (interest_rate_id, 'SOL', 'Solana', 1, 140),
      (interest_rate_id, 'BTC', 'Bitcoin', 2, 53000),
      (interest_rate_id, 'ETH', 'Ethereum', 2, 2600),
      (interest_rate_id, 'SOL', 'Solana', 2, 125),
      (interest_rate_id, 'BTC', 'Bitcoin', 3, 51000),
      (interest_rate_id, 'ETH', 'Ethereum', 3, 2450),
      (interest_rate_id, 'SOL', 'Solana', 3, 115)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;