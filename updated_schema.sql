-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;

-- Create wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID
);

-- Create assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  price_spot DECIMAL NOT NULL DEFAULT 0,
  amount DECIMAL NOT NULL DEFAULT 0,
  is_reference BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_id, asset_symbol)
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('buy', 'sell')),
  amount DECIMAL NOT NULL,
  price_per_unit DECIMAL NOT NULL,
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX assets_wallet_id_idx ON assets(wallet_id);
CREATE INDEX transactions_wallet_id_idx ON transactions(wallet_id);
CREATE INDEX transactions_asset_id_idx ON transactions(asset_id);
CREATE INDEX transactions_date_idx ON transactions(transaction_date);

-- Create RLS policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo purposes
CREATE POLICY "Allow anonymous access to wallets" ON wallets
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to assets" ON assets
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to transactions" ON transactions
  FOR ALL USING (true);

-- Create function to calculate total value
CREATE OR REPLACE FUNCTION calculate_total_value(amount DECIMAL, price_spot DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  RETURN amount * price_spot;
END;
$$ LANGUAGE plpgsql;

-- Create a demo wallet with default assets
INSERT INTO wallets (id, name, description) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Demo Wallet', 'A sample wallet with default assets');

-- Add default assets to the demo wallet
INSERT INTO assets (wallet_id, asset_symbol, name, price_spot, amount, is_reference) 
VALUES
  ('00000000-0000-0000-0000-000000000001', 'USD', 'US Dollar', 1.00, 10000.00, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'BTC', 'Bitcoin', 62500.00, 0.25, FALSE),
  ('00000000-0000-0000-0000-000000000001', 'ETH', 'Ethereum', 3400.00, 5.0, FALSE),
  ('00000000-0000-0000-0000-000000000001', 'SOL', 'Solana', 160.00, 50.0, FALSE),
  ('00000000-0000-0000-0000-000000000001', 'ABC', 'Alpha Blockchain', 2.50, 1000.0, FALSE);

-- Create trigger function to add default assets to new wallets
CREATE OR REPLACE FUNCTION add_default_assets()
RETURNS TRIGGER AS $$
BEGIN
  -- Add default assets
  INSERT INTO assets (wallet_id, asset_symbol, name, price_spot, amount, is_reference) 
  VALUES
    (NEW.id, 'USD', 'US Dollar', 1.00, 0.00, TRUE),
    (NEW.id, 'BTC', 'Bitcoin', 62500.00, 0.00, FALSE),
    (NEW.id, 'ETH', 'Ethereum', 3400.00, 0.00, FALSE),
    (NEW.id, 'SOL', 'Solana', 160.00, 0.00, FALSE),
    (NEW.id, 'ABC', 'Alpha Blockchain', 2.50, 0.00, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add default assets to new wallets
CREATE TRIGGER add_default_assets_trigger
AFTER INSERT ON wallets
FOR EACH ROW
EXECUTE FUNCTION add_default_assets();