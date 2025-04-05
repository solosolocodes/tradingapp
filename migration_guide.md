# Database Migration Guide

This guide explains how to implement the database optimization changes and update your application code to work with the improved schema.

## Overview of Changes

The database optimization includes:

1. **Table Renaming**
   - `assets` → `trading_assets`
   - `transactions` → `trading_transactions`
   - `wallets` → `trading_wallets`

2. **Column Renaming**
   - `experiment_participants.participant_id` → `participant_code`
   - `experiment_group_assignments.is_control_group` → `is_control`
   - `scenario_asset_prices.asset_symbol` → `asset_code`
   - `trading_assets.asset_symbol` → `asset_code`

3. **New Database Views**
   - `experiment_participant_summary`
   - `asset_balances`
   - `experiment_scenario_details`

4. **New Database Functions**
   - `calculate_wallet_value(wallet_uuid UUID)`

5. **Enhanced Constraints and Indexes**
   - Added missing NOT NULL constraints
   - Added new indexes for frequently queried columns
   - Better default values

## Implementation Steps

### 1. Review Database Changes

Before proceeding, thoroughly review the `database_optimization.sql` script to understand all the changes.

### 2. Development Environment Testing

1. Create a backup of your development database
2. Run the optimization script in your development environment
3. Test the basic functionality to ensure the changes don't break existing features

### 3. Update Application Code

#### Option A: Use the Adapter Approach

For a gradual migration, use the adapter layer in `adapter_for_db_optimization.js`:

```javascript
import dbAdapter from '../../adapter_for_db_optimization';

// Instead of direct table access, use the adapted query function
const getWalletAssets = async (walletId) => {
  return dbAdapter.adaptedSupabaseQuery('select', {
    table: 'assets',  // Use old table name
    query: 'id, wallet_id, asset_symbol, amount, price_spot', // Use old column names
    column: 'wallet_id',
    id: walletId
  });
};
```

#### Option B: Direct Code Updates

For a complete migration, update all files that interact with the database:

1. Update table names:
   ```javascript
   // Old code
   const { data } = await supabase.from('assets').select('*');
   
   // New code
   const { data } = await supabase.from('trading_assets').select('*');
   ```

2. Update column references:
   ```javascript
   // Old code
   const assets = data.map(asset => asset.asset_symbol);
   
   // New code
   const assets = data.map(asset => asset.asset_code);
   ```

3. Update helper functions:
   * Modify `assetHelpers.js` to use new column names
   * Check all database query functions throughout the codebase

### 4. Use New Database Features

Take advantage of the new database views and functions:

```javascript
// Get wallet value using the database function
const getWalletValue = async (walletId) => {
  const { data } = await supabase.rpc('calculate_wallet_value', { wallet_uuid: walletId });
  return data || 0;
};

// Use the new views for common queries
const getExperimentParticipants = async (experimentId) => {
  const { data } = await supabase
    .from('experiment_participant_summary')
    .select('*')
    .eq('experiment_id', experimentId);
  return data || [];
};
```

### 5. Testing

1. Create comprehensive tests for all updated components
2. Test all database operations (SELECT, INSERT, UPDATE, DELETE)
3. Test all application features that depend on the renamed tables/columns
4. Verify performance improvements with the new indices and constraints

### 6. Production Deployment

1. **IMPORTANT:** Create a complete backup of your production database
2. Schedule a maintenance window for the migration
3. Run the migration script on your production database
4. Deploy the updated application code
5. Monitor the application for any issues

## Common Issues & Troubleshooting

1. **Missing columns or tables**
   - Double-check all table and column references
   - Use the adapter functions when unsure

2. **Performance issues**
   - Verify that all necessary indexes are created
   - Test with realistic data volumes

3. **Constraint violations**
   - Check for NULL values before adding NOT NULL constraints
   - Add default values where appropriate

## Future Considerations

1. **Transaction Partitioning**
   - As your data grows, consider migrating to the partitioned transactions table

2. **Archiving Strategy**
   - Develop a strategy for archiving old experiment data

3. **View Optimization**
   - Create materialized views for frequently accessed data

## Need Help?

If you encounter issues during the migration process, please:
1. Refer to the SQL scripts for the exact schema changes
2. Check the adapter code for mapping between old and new schema
3. Contact the database administrator for assistance