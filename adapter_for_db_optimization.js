/**
 * Database Adapter Script for New Schema
 * 
 * This script helps adapt application code to match the optimized database schema.
 * It creates mapping functions that translate between the old and new table/column names.
 */

// Import the Supabase client
import supabase, { supabaseQuery } from './src/lib/supabase';

/**
 * Table name mappings (old to new)
 */
const TABLE_MAPPING = {
  'assets': 'trading_assets',
  'transactions': 'trading_transactions',
  'wallets': 'trading_wallets',
  // Other tables keep their names
};

/**
 * Column name mappings (old to new)
 */
const COLUMN_MAPPING = {
  // In experiment_participants
  'participant_id': 'participant_code',
  
  // In experiment_group_assignments
  'is_control_group': 'is_control',
  
  // In scenario_asset_prices and trading_assets
  'asset_symbol': 'asset_code',
};

/**
 * Translates old table name to new table name
 * @param {string} oldTableName - The original table name
 * @returns {string} - The new table name
 */
export const getNewTableName = (oldTableName) => {
  return TABLE_MAPPING[oldTableName] || oldTableName;
};

/**
 * Translates old column name to new column name based on table context
 * @param {string} tableName - The table name (new format)
 * @param {string} oldColumnName - The original column name
 * @returns {string} - The new column name
 */
export const getNewColumnName = (tableName, oldColumnName) => {
  // Handle specific table+column combinations
  if (tableName === 'experiment_participants' && oldColumnName === 'participant_id') {
    return 'participant_code';
  }
  if (tableName === 'experiment_group_assignments' && oldColumnName === 'is_control_group') {
    return 'is_control';
  }
  if ((tableName === 'scenario_asset_prices' || tableName === 'trading_assets') && 
      oldColumnName === 'asset_symbol') {
    return 'asset_code';
  }
  
  // Default: return the original column name
  return oldColumnName;
};

/**
 * Adapts a query to work with the new schema
 * @param {string} table - The table name (old format)
 * @param {string} queryStr - The original query string
 * @returns {object} - Object with the new table name and adapted query string
 */
export const adaptQuery = (table, queryStr) => {
  // Convert table name
  const newTable = getNewTableName(table);
  
  // If no query or it's just '*', return simple mapping
  if (!queryStr || queryStr === '*') {
    return { table: newTable, query: queryStr };
  }
  
  // Advanced query adaptation - replace column names
  let newQuery = queryStr;
  
  // Split on commas for column lists
  const columns = queryStr.split(',').map(col => col.trim());
  
  // Map each column to new name if needed
  const newColumns = columns.map(col => {
    // Handle columns with aliases
    if (col.includes(' as ')) {
      const [colName, alias] = col.split(' as ').map(part => part.trim());
      const newColName = getNewColumnName(newTable, colName);
      return `${newColName} as ${alias}`;
    }
    // Regular column
    return getNewColumnName(newTable, col);
  });
  
  // Join back into query string
  newQuery = newColumns.join(', ');
  
  return { table: newTable, query: newQuery };
};

/**
 * Adapts a data object for insert/update operations to match new schema
 * @param {string} table - The table name (old format)
 * @param {object} data - Data object with old column names
 * @returns {object} - Object with the new table name and adapted data
 */
export const adaptData = (table, data) => {
  // Convert table name
  const newTable = getNewTableName(table);
  
  // If no data, return simple mapping
  if (!data || typeof data !== 'object') {
    return { table: newTable, data };
  }
  
  // Clone data to avoid mutating the original
  const newData = { ...data };
  
  // Map relevant fields
  Object.keys(newData).forEach(key => {
    const newKey = getNewColumnName(newTable, key);
    
    // If the key name changed, update it
    if (newKey !== key) {
      newData[newKey] = newData[key];
      delete newData[key];
    }
  });
  
  return { table: newTable, data: newData };
};

/**
 * Enhanced supabaseQuery function that automatically adapts to the new schema
 * @param {string} operation - Operation type ('select', 'insert', etc.)
 * @param {object} options - Query options
 * @returns {Promise<any>} - Query result
 */
export const adaptedSupabaseQuery = async (operation, options = {}) => {
  const { table, query, data, id, column = 'id', errorMessage } = options;
  
  // Skip adaptation if table is not provided
  if (!table) {
    return supabaseQuery(operation, options);
  }
  
  // Adapt the query parameters to the new schema
  const { table: newTable, query: newQuery } = adaptQuery(table, query);
  const { data: newData } = adaptData(table, data);
  
  // Column name might need adaptation too
  const newColumn = getNewColumnName(newTable, column);
  
  // Create new options with adapted values
  const newOptions = {
    ...options,
    table: newTable,
    query: newQuery,
    data: newData,
    column: newColumn
  };
  
  // Execute query with new options
  return supabaseQuery(operation, newOptions);
};

// Helper for adapting assetHelpers.js functions
export const adaptAssetHelpers = {
  // Function to adapt organizeAssetPricesByRound
  organizeAssetPricesByRound: (pricesData) => {
    if (!pricesData || !Array.isArray(pricesData) || pricesData.length === 0) {
      return {};
    }

    const pricesByRound = {};
    
    pricesData.forEach(price => {
      // Use new field name: asset_code instead of asset_symbol
      const { asset_code, round_number, price: assetPrice } = price;
      
      // Make sure round_number is a string for consistent lookup
      const roundKey = String(round_number);
      
      if (!pricesByRound[roundKey]) {
        pricesByRound[roundKey] = {};
      }
      
      // Store the price as a number with explicit conversion
      pricesByRound[roundKey][asset_code] = Number(assetPrice);
    });
    
    return pricesByRound;
  },
  
  // Function to adapt calculateAssetValuesForRound
  calculateAssetValuesForRound: (assets, assetPrices, round) => {
    // Handle empty assets case
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return { 
        assets: [], 
        totalValue: 0, 
        totalUsdtValue: 0 
      };
    }

    // Ensure we have prices data
    const roundPrices = assetPrices && assetPrices[String(round)] ? assetPrices[String(round)] : {};
    
    // Find a stablecoin to use for USDT conversion
    let usdtPrice = 1;
    const stablecoin = assets.find(asset => 
      asset.asset_code === 'USDT' || 
      asset.asset_code === 'USDC' || 
      asset.asset_code === 'USD'
    );
    
    if (stablecoin) {
      // Get price from round data or fallback to spot price
      usdtPrice = roundPrices[stablecoin.asset_code] || Number(stablecoin.price_spot) || 1;
      // Ensure we never divide by zero
      if (usdtPrice <= 0) usdtPrice = 1;
    }
    
    // Calculate values for each asset
    const assetsWithValues = assets.map(asset => {
      // Try to get price from round data or fallback to spot price
      const price = roundPrices[asset.asset_code] || Number(asset.price_spot) || 0;
      const amount = Number(asset.amount) || 0;
      const value = amount * price;
      const usdtValue = value / usdtPrice;
      
      // Return asset with calculated values
      return {
        ...asset,
        price,
        value,
        usdtValue
      };
    });

    // Calculate portfolio totals
    const totalValue = assetsWithValues.reduce((sum, asset) => 
      sum + (asset.value || 0), 0
    );
    
    const totalUsdtValue = assetsWithValues.reduce((sum, asset) => 
      sum + (asset.usdtValue || 0), 0
    );

    return {
      assets: assetsWithValues,
      totalValue,
      totalUsdtValue
    };
  }
};

/**
 * Function to calculate the total value of a wallet
 * Uses the database function instead of client-side calculation
 * @param {string} walletId - UUID of the wallet
 * @returns {Promise<number>} - Total value of the wallet
 */
export const getWalletValue = async (walletId) => {
  const { data, error } = await supabase
    .rpc('calculate_wallet_value', { wallet_uuid: walletId });
    
  if (error) {
    console.error('Error calculating wallet value:', error);
    return 0;
  }
  
  return data || 0;
};

// Export helpers for using the new views
export const useViews = {
  /**
   * Get experiment participant summary data
   * @param {string} experimentId - UUID of the experiment (optional)
   * @returns {Promise<array>} - Participant summary data
   */
  getParticipantSummary: async (experimentId = null) => {
    let query = supabase.from('experiment_participant_summary').select('*');
    
    if (experimentId) {
      query = query.eq('experiment_id', experimentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching participant summary:', error);
      return [];
    }
    
    return data || [];
  },
  
  /**
   * Get asset balances for a wallet
   * @param {string} walletId - UUID of the wallet (optional)
   * @returns {Promise<array>} - Asset balance data
   */
  getAssetBalances: async (walletId = null) => {
    let query = supabase.from('asset_balances').select('*');
    
    if (walletId) {
      query = query.eq('wallet_id', walletId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching asset balances:', error);
      return [];
    }
    
    return data || [];
  },
  
  /**
   * Get experiment scenario details
   * @param {string} experimentId - UUID of the experiment (optional)
   * @returns {Promise<array>} - Scenario details
   */
  getScenarioDetails: async (experimentId = null) => {
    let query = supabase.from('experiment_scenario_details').select('*');
    
    if (experimentId) {
      query = query.eq('experiment_id', experimentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching scenario details:', error);
      return [];
    }
    
    return data || [];
  }
};

// Export everything as a module
export default {
  getNewTableName,
  getNewColumnName,
  adaptQuery,
  adaptData,
  adaptedSupabaseQuery,
  adaptAssetHelpers,
  getWalletValue,
  useViews
};