# Trading App

A trading application with experiment features for simulating market scenarios.

## Database Structure

The application uses a PostgreSQL database with the following main tables:

- `trading_wallets`: Stores wallet information
- `trading_assets`: Contains assets in wallets with their current spot prices
- `trading_transactions`: Records all asset transactions

For experiments, it uses additional tables:

- `experiments`: The main experiment definitions
- `experiment_scenarios`: Scenarios within experiments
- `scenario_asset_prices`: Asset price data for different rounds in scenarios

## Database Migration

The database schema was optimized for better naming consistency and performance:

- Renamed tables with a consistent `trading_` prefix for core financial entities
- Standardized column naming (e.g., `asset_code` instead of `asset_symbol`)
- Added proper indices and constraints
- Created database views for common data access patterns

See the [Migration Guide](migration_guide.md) for implementation details.

## Getting Started

### Database Setup

1. Run the SQL script to create the necessary tables:

```sql
-- Create tables
CREATE TABLE trading_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID
);

-- More table definitions...
```

2. Run the application:

```bash
cd crypto-tracker-simple-clean
npm install
npm run dev
```

## Understanding Asset Pricing

The system handles two types of asset prices:

1. **Spot Prices**: Current market prices stored in `trading_assets.price_spot`
2. **Scenario Prices**: Time-series prices for experiment rounds in `scenario_asset_prices`

See [Price Relationship](price_relationship.md) for more details.

## Contributing

1. Clone the repository
2. Create a feature branch
3. Submit a pull request