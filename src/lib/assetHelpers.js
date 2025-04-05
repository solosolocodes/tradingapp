/**
 * Asset and price data helper functions for crypto-tracker experiments
 */

/**
 * Formats a currency value with proper locale
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @param {string} prefix - Currency symbol prefix 
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, decimals = 2, prefix = '$') => {
  if (value === undefined || value === null) return `${prefix}0.00`;
  
  return `${prefix}${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
};

/**
 * Formats a crypto amount with appropriate decimals based on asset type
 * @param {number} amount - The amount to format
 * @param {string} code - Crypto code to determine appropriate decimal places
 * @returns {string} - Formatted amount string
 */
export const formatCryptoAmount = (amount, code) => {
  if (amount === undefined || amount === null) return '0';
  
  // Define appropriate decimal places based on asset
  const decimals = 
    code === 'BTC' ? 8 : 
    code === 'ETH' ? 6 :
    code === 'USDT' || code === 'USDC' || code === 'USD' ? 2 :
    4; // Default for other assets
  
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
};

/**
 * Calculates the percentage change between two values
 * @param {number} currentValue - Current value
 * @param {number} previousValue - Previous value to compare against
 * @returns {object} - Object containing change amount, percentage and direction
 */
export const calculateChange = (currentValue, previousValue) => {
  // Handle edge cases
  if (previousValue === undefined || previousValue === null) return { amount: 0, percentage: 0, direction: 'none' };
  if (currentValue === undefined || currentValue === null) return { amount: 0, percentage: 0, direction: 'none' };
  
  // Convert to numbers to ensure proper calculation
  const current = Number(currentValue);
  const previous = Number(previousValue);
  
  // No change if values are the same
  if (current === previous) return { amount: 0, percentage: 0, direction: 'none' };
  
  // Calculate change amount
  const changeAmount = current - previous;
  
  // Calculate percentage change, avoiding division by zero
  const changePercentage = previous !== 0 ? (changeAmount / previous) * 100 : 0;
  
  // Determine direction
  const direction = changeAmount > 0 ? 'up' : 'down';
  
  return {
    amount: changeAmount,
    percentage: changePercentage,
    direction,
    // Format the change as a string with +/- and percentage
    formatted: `${direction === 'up' ? '+' : ''}${changeAmount.toFixed(2)} (${Math.abs(changePercentage).toFixed(2)}%)`
  };
};

/**
 * Organizes asset prices by round and asset code for efficient lookup
 * @param {Array} pricesData - Raw asset price data from database
 * @returns {Object} - Object organized by round and then by asset code
 */
export const organizeAssetPricesByRound = (pricesData) => {
  if (!pricesData || !Array.isArray(pricesData) || pricesData.length === 0) {
    return {};
  }

  const pricesByRound = {};
  
  pricesData.forEach(price => {
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
};

/**
 * Creates a snapshot of asset values for a specific round
 * @param {Array} assets - Wallet assets array
 * @param {Object} assetPrices - Organized asset prices by round
 * @param {number} round - The round number to calculate values for
 * @returns {Object} - Object containing assets with values and portfolio totals
 */
export const calculateAssetValuesForRound = (assets, assetPrices, round) => {
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
};

/**
 * Uses the browser's native toLocaleString support to format a date
 * @param {string|Date} date - Date string or object to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString(undefined, defaultOptions);
  } catch (e) {
    console.error('Error formatting date:', e);
    return String(date);
  }
};

/**
 * Format a duration in seconds to a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '0s';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  } else if (remainingSeconds === 0) {
    return `${minutes}m`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
};

// Export everything as a default object as well for convenience
export default {
  formatCurrency,
  formatCryptoAmount,
  calculateChange,
  organizeAssetPricesByRound,
  calculateAssetValuesForRound,
  formatDate,
  formatDuration
};