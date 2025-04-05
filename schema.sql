-- Create wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('buy', 'sell')),
  crypto_symbol TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  price_per_unit DECIMAL NOT NULL,
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX transactions_wallet_id_idx ON transactions(wallet_id);
CREATE INDEX transactions_date_idx ON transactions(transaction_date);

-- Create RLS policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo purposes
CREATE POLICY "Allow anonymous access to wallets" ON wallets
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to transactions" ON transactions
  FOR ALL USING (true);