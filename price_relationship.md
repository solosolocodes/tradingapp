# Understanding Asset Pricing in the Trading App

## Spot Prices vs. Scenario Prices

### Spot Prices
In the trading application, each asset in `trading_assets` has a `price_spot` value, which represents:

1. **Current Market Price**: The current value of the asset in the real world or simulated market
2. **Default Price**: Used when no specific scenario price is available
3. **Portfolio Valuation**: Used to calculate the total value of assets in a wallet

The `price_spot` is stored directly in the `trading_assets` table and is a single value per asset.

### Scenario Prices
In contrast, scenario prices are stored in the `scenario_asset_prices` table and represent:

1. **Time-series Data**: Different prices across multiple rounds within a scenario
2. **Simulation Values**: Prices designed for educational/experimental scenarios
3. **Round-specific**: Each price corresponds to a specific round number

## Relationship Between Prices

The relationship works as follows:

1. **Default Fallback**: 
   When displaying an asset in a scenario, the system first tries to get the price from `scenario_asset_prices` for the specific round. If no price is defined, it falls back to the asset's `price_spot`.

2. **Initial Seeding**:
   When creating a new scenario, the first round prices are often initialized with the spot prices, and then subsequent rounds are adjusted to simulate market movements.

3. **Portfolio Calculations**:
   When calculating portfolio values:
   - Outside scenarios: Always use `price_spot`
   - Within scenarios: Use the round-specific price or fall back to `price_spot`

## Code Implementation

The relationship is implemented in various functions, most notably in `assetHelpers.js`:

```javascript
// In calculateAssetValuesForRound function
const price = roundPrices[asset.asset_code] || Number(asset.price_spot) || 0;
```

This shows how the function first tries to get a price from the round-specific data, but falls back to the spot price if necessary.

## Database Schema

### trading_assets
- `id`: UUID
- `wallet_id`: UUID
- `asset_code`: TEXT
- `name`: TEXT
- `amount`: NUMERIC
- `price_spot`: NUMERIC
- `is_reference`: BOOLEAN

### scenario_asset_prices
- `id`: UUID
- `scenario_id`: UUID
- `asset_code`: TEXT
- `asset_name`: TEXT
- `round_number`: INTEGER
- `price`: NUMERIC

One `trading_assets` record can have many corresponding `scenario_asset_prices` records across different scenarios and rounds.