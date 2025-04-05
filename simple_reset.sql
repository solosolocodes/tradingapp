-- Simple Reset Script with proper dollar quoting

-- Drop all existing tables
BEGIN;

DROP TABLE IF EXISTS experiment_scenario_responses CASCADE;
DROP TABLE IF EXISTS experiment_survey_responses CASCADE;
DROP TABLE IF EXISTS experiment_participants CASCADE;
DROP TABLE IF EXISTS experiment_scenarios CASCADE;
DROP TABLE IF EXISTS experiment_survey_questions CASCADE;
DROP TABLE IF EXISTS experiment_break_screens CASCADE;
DROP TABLE IF EXISTS experiment_intro_screens CASCADE;
DROP TABLE IF EXISTS experiment_group_assignments CASCADE;
DROP TABLE IF EXISTS experiment_participations CASCADE;
DROP TABLE IF EXISTS scenario_asset_prices CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS scenario_templates CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS participant_groups CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;

-- Create tables with correct naming from the start
CREATE TABLE trading_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID
);

CREATE TABLE trading_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES trading_wallets(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  price_spot NUMERIC,
  is_reference BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_id, asset_code)
);

CREATE TABLE trading_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES trading_wallets(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES trading_assets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price_per_unit NUMERIC,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample wallets and assets
INSERT INTO trading_wallets (id, name, description) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Demo Portfolio', 'Used for demonstrations and testing');

INSERT INTO trading_assets (wallet_id, asset_code, name, amount, price_spot, is_reference) 
VALUES
  ('11111111-1111-1111-1111-111111111111', 'USD', 'US Dollar', 10000, 1, true),
  ('11111111-1111-1111-1111-111111111111', 'BTC', 'Bitcoin', 1.5, 50000, false),
  ('11111111-1111-1111-1111-111111111111', 'ETH', 'Ethereum', 25, 3000, false),
  ('11111111-1111-1111-1111-111111111111', 'USDT', 'Tether', 5000, 1, true);

-- Add some transactions
INSERT INTO trading_transactions (wallet_id, asset_id, transaction_type, amount, price_per_unit, transaction_date) 
VALUES
  ('11111111-1111-1111-1111-111111111111', 
   (SELECT id FROM trading_assets WHERE wallet_id = '11111111-1111-1111-1111-111111111111' AND asset_code = 'BTC'),
   'buy', 1.0, 45000, NOW() - INTERVAL '30 days'),
  ('11111111-1111-1111-1111-111111111111', 
   (SELECT id FROM trading_assets WHERE wallet_id = '11111111-1111-1111-1111-111111111111' AND asset_code = 'BTC'),
   'buy', 0.5, 48000, NOW() - INTERVAL '15 days');

-- Create basic asset view
CREATE OR REPLACE VIEW asset_balances AS
SELECT 
  ta.id,
  ta.wallet_id,
  tw.name as wallet_name,
  ta.asset_code,
  ta.name as asset_name,
  ta.amount,
  ta.price_spot,
  (ta.amount * ta.price_spot) as total_value
FROM 
  trading_assets ta
JOIN 
  trading_wallets tw ON ta.wallet_id = tw.id
WHERE 
  ta.amount > 0;

COMMIT;