-- Database Optimization Script
-- This script improves the efficiency and naming consistency of the database

BEGIN;

-- 1. Rename tables for consistency (add prefix where missing)
ALTER TABLE assets RENAME TO trading_assets;
ALTER TABLE transactions RENAME TO trading_transactions;
ALTER TABLE wallets RENAME TO trading_wallets;

-- 2. Rename columns for consistency
-- Standardize ID references with _id suffix
ALTER TABLE experiment_participants RENAME COLUMN participant_id TO participant_code;
ALTER TABLE experiment_group_assignments RENAME COLUMN is_control_group TO is_control;
ALTER TABLE scenario_asset_prices RENAME COLUMN asset_symbol TO asset_code;
ALTER TABLE trading_assets RENAME COLUMN asset_symbol TO asset_code;

-- 3. Add missing indices for foreign keys and frequently queried columns
CREATE INDEX IF NOT EXISTS experiments_status_idx ON experiments(status);
CREATE INDEX IF NOT EXISTS experiment_participants_status_idx ON experiment_participants(status);
CREATE INDEX IF NOT EXISTS experiment_scenarios_rounds_idx ON experiment_scenarios(rounds);
CREATE INDEX IF NOT EXISTS scenario_templates_rounds_idx ON scenario_templates(rounds);
CREATE INDEX IF NOT EXISTS trading_transactions_transaction_type_idx ON trading_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS trading_transactions_amount_idx ON trading_transactions(amount);

-- 4. Add constraints to ensure data integrity
-- Set default values where appropriate
ALTER TABLE experiment_participants ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE experiments ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE trading_assets ALTER COLUMN is_reference SET DEFAULT false;
ALTER TABLE scenario_templates ALTER COLUMN is_active SET DEFAULT true;

-- 5. Add NOT NULL constraints where missing but logically required
ALTER TABLE trading_assets ALTER COLUMN wallet_id SET NOT NULL;
ALTER TABLE experiment_scenarios ALTER COLUMN wallet_id SET NOT NULL;
ALTER TABLE experiment_scenarios ALTER COLUMN scenario_template_id SET NOT NULL;
ALTER TABLE experiment_scenarios ALTER COLUMN round_duration SET NOT NULL;
ALTER TABLE experiment_scenarios ALTER COLUMN rounds SET NOT NULL;
ALTER TABLE scenario_templates ALTER COLUMN wallet_id SET NOT NULL;
ALTER TABLE scenario_templates ALTER COLUMN round_duration SET NOT NULL;

-- 6. Add missing foreign key constraints
ALTER TABLE experiment_participants 
  ADD CONSTRAINT experiment_participants_experiment_id_fkey 
  FOREIGN KEY (experiment_id) REFERENCES experiments(id);

-- 7. Create views for frequently accessed data combinations
CREATE OR REPLACE VIEW experiment_participant_summary AS
SELECT 
  ep.id,
  ep.experiment_id,
  e.title as experiment_title,
  ep.participant_code,
  ep.status,
  ep.started_at,
  ep.completed_at,
  ep.created_at
FROM 
  experiment_participants ep
JOIN 
  experiments e ON ep.experiment_id = e.id;

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

CREATE OR REPLACE VIEW experiment_scenario_details AS
SELECT 
  es.id,
  es.experiment_id,
  e.title as experiment_title,
  es.title as scenario_title,
  es.description,
  es.wallet_id,
  tw.name as wallet_name,
  es.scenario_template_id,
  st.title as template_title,
  es.rounds,
  es.round_duration,
  es.order_index
FROM 
  experiment_scenarios es
JOIN 
  experiments e ON es.experiment_id = e.id
JOIN 
  trading_wallets tw ON es.wallet_id = tw.id
JOIN 
  scenario_templates st ON es.scenario_template_id = st.id;

-- 8. Create functions for common operations
CREATE OR REPLACE FUNCTION calculate_wallet_value(wallet_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_value NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount * price_spot), 0)
  INTO total_value
  FROM trading_assets
  WHERE wallet_id = wallet_uuid AND price_spot IS NOT NULL;
  
  RETURN total_value;
END;
$$ LANGUAGE plpgsql;

-- 9. Add table comments for documentation
COMMENT ON TABLE trading_assets IS 'Stores information about assets held in wallets';
COMMENT ON TABLE trading_transactions IS 'Records all transactions related to assets';
COMMENT ON TABLE trading_wallets IS 'Contains wallet information for users and scenarios';
COMMENT ON TABLE experiments IS 'Defines experiments that can be run with participants';
COMMENT ON TABLE experiment_scenarios IS 'Scenarios that make up an experiment';
COMMENT ON TABLE experiment_participants IS 'Participants in experiments with their status';

-- 10. Update table triggers for automatic timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update timestamp triggers for all tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_timestamp ON %I;
      CREATE TRIGGER update_timestamp
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    ', t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11. Create partitioning for transactions table (if it grows large)
-- This creates a partitioned table for future transactions
CREATE TABLE trading_transactions_partitioned (
  id UUID PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES trading_wallets(id),
  asset_id UUID NOT NULL REFERENCES trading_assets(id),
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
) PARTITION BY RANGE (transaction_date);

-- Create partitions (adjust date ranges as needed)
CREATE TABLE trading_transactions_2024 PARTITION OF trading_transactions_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE trading_transactions_2025 PARTITION OF trading_transactions_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- 12. Update references in existing code (views, functions, procedures)
-- The existing code references will need to be updated with the new table/column names

COMMIT;

-- Migration steps for application code:
/*
1. Update all queries referencing the renamed tables:
   - assets -> trading_assets
   - transactions -> trading_transactions
   - wallets -> trading_wallets

2. Update all queries referencing the renamed columns:
   - participant_id -> participant_code in experiment_participants
   - is_control_group -> is_control in experiment_group_assignments
   - asset_symbol -> asset_code in scenario_asset_prices and trading_assets

3. Consider using the new views for common queries:
   - experiment_participant_summary
   - asset_balances
   - experiment_scenario_details

4. Use the calculate_wallet_value function instead of manually summing asset values

5. Consider migrating to the partitioned transactions table for better performance
*/