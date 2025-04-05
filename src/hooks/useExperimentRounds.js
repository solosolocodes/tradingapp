import { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { organizeAssetPricesByRound, calculateAssetValuesForRound } from '../lib/assetHelpers';

/**
 * Custom hook to manage experiment rounds, timers, and asset values
 * 
 * @param {Object} scenario - The scenario object with round_duration and rounds
 * @param {Function} onRoundComplete - Callback when a round completes
 * @param {Function} onAllRoundsComplete - Callback when all rounds complete
 * @returns {Object} Round-related state and control functions
 */
const useExperimentRounds = (scenario, onRoundComplete, onAllRoundsComplete) => {
  // State for round tracking
  const [currentRound, setCurrentRound] = useState(1);
  const [roundTimer, setRoundTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(false);
  
  // Asset pricing data
  const [assetPrices, setAssetPrices] = useState({});
  const [walletAssets, setWalletAssets] = useState([]);
  const [walletName, setWalletName] = useState('');
  const [portfolioValues, setPortfolioValues] = useState({
    assets: [],
    totalValue: 0,
    totalUsdtValue: 0
  });
  
  // References for timers
  const timerRef = useRef(null);
  const isLoadingRef = useRef(false);
  
  // Extract scenario information 
  const scenarioId = scenario?.id;
  const walletId = scenario?.wallet_id;
  const templateId = scenario?.scenario_template_id;
  const roundDuration = scenario?.round_duration || 60;
  const totalRounds = scenario?.rounds || 3;

  /**
   * Fetch wallet data including all assets
   */
  const fetchWalletData = useCallback(async (walletId) => {
    if (!walletId) return;
    
    try {
      console.log(`📂 Fetching wallet data for wallet ID: ${walletId}`);
      
      // Get wallet info
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .single();
      
      if (walletError) throw walletError;
      
      if (walletData) {
        setWalletName(walletData.name);
        console.log(`📊 Found wallet: ${walletData.name}`);
        
        // Get assets in wallet
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .eq('wallet_id', walletId)
          .order('asset_symbol');
        
        if (assetsError) throw assetsError;
        
        if (assetsData && assetsData.length > 0) {
          console.log(`💰 Found ${assetsData.length} assets in wallet ${walletData.name}`);
          setWalletAssets(assetsData);
          
          // Calculate initial values
          updatePortfolioValues(assetsData, assetPrices, currentRound);
          
          return assetsData;
        } else {
          console.warn(`⚠️ No assets found in wallet ${walletData.name} (ID: ${walletId})`);
          setWalletAssets([]);
          setPortfolioValues({ assets: [], totalValue: 0, totalUsdtValue: 0 });
          
          return [];
        }
      }
    } catch (error) {
      console.error('❌ Error fetching wallet data:', error);
      return [];
    }
  }, [assetPrices, currentRound]);

  /**
   * Fetch all scenario asset prices
   */
  const fetchScenarioAssetPrices = useCallback(async (scenarioId) => {
    if (!scenarioId) return Promise.resolve({});
    
    try {
      console.log(`🔍 Fetching asset prices for scenario ID: ${scenarioId}`);
      
      const { data: pricesData, error: pricesError } = await supabase
        .from('scenario_asset_prices')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('asset_symbol')
        .order('round_number');
      
      if (pricesError) throw pricesError;
      
      console.log(`📊 Found ${pricesData?.length || 0} price records for scenario ${scenarioId}`);
      
      if (pricesData && pricesData.length > 0) {
        // Organize prices by round and symbol
        const pricesByRound = organizeAssetPricesByRound(pricesData);
        
        // Update state with the new prices, merging with existing data
        setAssetPrices(prev => {
          const merged = {...prev};
          
          // Add new round data
          Object.keys(pricesByRound).forEach(round => {
            merged[round] = {
              ...(merged[round] || {}),
              ...pricesByRound[round]
            };
          });
          
          return merged;
        });
        
        return pricesByRound;
      } else {
        console.warn(`⚠️ No asset prices found for scenario ${scenarioId}`);
        return {};
      }
    } catch (error) {
      console.error('❌ Error fetching asset prices:', error);
      return {};
    }
  }, []);

  /**
   * Update portfolio values based on current round
   */
  const updatePortfolioValues = useCallback((assets = walletAssets, prices = assetPrices, round = currentRound) => {
    const portfolioData = calculateAssetValuesForRound(assets, prices, round);
    setPortfolioValues(portfolioData);
    return portfolioData;
  }, [assetPrices, currentRound, walletAssets]);

  /**
   * Start the round timer
   */
  const startRoundTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setRoundTimer(0);
    setTimerActive(true);
  }, []);

  /**
   * Clear and stop the round timer
   */
  const clearRoundTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  }, []);

  /**
   * Force advance to the next round
   */
  const advanceToNextRound = useCallback(() => {
    if (currentRound < totalRounds) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setRoundTimer(0);
      
      // Update values for the new round
      updatePortfolioValues(walletAssets, assetPrices, nextRound);
      
      // Call the round complete callback
      if (onRoundComplete) {
        onRoundComplete(currentRound, nextRound);
      }
      
      // Check if this is the last round
      if (nextRound === totalRounds) {
        setRoundsCompleted(true);
        if (onAllRoundsComplete) {
          onAllRoundsComplete();
        }
      }
      
      return true;
    } else {
      // Already at the last round
      return false;
    }
  }, [currentRound, totalRounds, assetPrices, walletAssets, onAllRoundsComplete, onRoundComplete, updatePortfolioValues]);

  /**
   * Load all required data for a scenario
   */
  const loadScenarioData = useCallback(async () => {
    if (!scenario || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      console.log(`📋 Loading scenario data: ${scenario.title} (ID: ${scenario.id})`);
      
      // Clear previous data
      setWalletAssets([]);
      setAssetPrices({});
      
      // Fetch wallet data
      let fetchedWalletId = walletId;
      
      // If no direct wallet_id, try to get from template
      if (!fetchedWalletId && templateId) {
        // Get template info to get wallet_id
        const { data: templateData, error: templateError } = await supabase
          .from('scenario_templates')
          .select('wallet_id')
          .eq('id', templateId)
          .single();
        
        if (!templateError && templateData?.wallet_id) {
          fetchedWalletId = templateData.wallet_id;
        }
      }
      
      // Fetch asset data if we have a wallet
      let assets = [];
      if (fetchedWalletId) {
        assets = await fetchWalletData(fetchedWalletId);
      } else {
        console.warn('No wallet found for this scenario');
      }
      
      // Fetch prices from scenario and/or template
      const pricePromises = [];
      if (scenarioId) {
        pricePromises.push(fetchScenarioAssetPrices(scenarioId));
      }
      if (templateId && templateId !== scenarioId) {
        pricePromises.push(fetchScenarioAssetPrices(templateId));
      }
      
      // Wait for all price data to load
      const priceResults = await Promise.all(pricePromises);
      
      // Merge price data from different sources
      const mergedPrices = {};
      priceResults.forEach(prices => {
        Object.entries(prices).forEach(([round, roundPrices]) => {
          mergedPrices[round] = { ...(mergedPrices[round] || {}), ...roundPrices };
        });
      });
      
      // Calculate initial values with assets and prices
      updatePortfolioValues(assets, mergedPrices, 1);
      
      console.log('✅ Scenario data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading scenario data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [scenario, walletId, templateId, scenarioId, fetchWalletData, fetchScenarioAssetPrices, updatePortfolioValues]);

  // Load scenario data when scenario changes
  useEffect(() => {
    if (scenario) {
      loadScenarioData();
      setCurrentRound(1);
      setRoundTimer(0);
      setRoundsCompleted(false);
    }
  }, [scenario, loadScenarioData]);

  // Timer effect for auto-advancing rounds
  useEffect(() => {
    if (!timerActive) return;
    
    timerRef.current = setInterval(() => {
      setRoundTimer(prevTimer => {
        // Check if timer reached round duration
        if (prevTimer >= roundDuration) {
          // Check if there are more rounds
          if (currentRound < totalRounds) {
            advanceToNextRound();
            return 0; // Reset timer for next round
          } else {
            // All rounds completed
            setRoundsCompleted(true);
            setTimerActive(false);
            clearInterval(timerRef.current);
            
            if (onAllRoundsComplete) {
              onAllRoundsComplete();
            }
            
            return roundDuration; // Keep timer at max
          }
        }
        
        return prevTimer + 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, currentRound, totalRounds, roundDuration, advanceToNextRound, onAllRoundsComplete]);

  return {
    // State
    currentRound,
    roundTimer,
    timerActive,
    roundsCompleted,
    assetPrices,
    walletAssets,
    walletName,
    portfolioValues,
    
    // Round info
    totalRounds,
    roundDuration,
    
    // Progress calculation
    roundProgress: Math.min((roundTimer / roundDuration) * 100, 100),
    
    // Functions
    startRoundTimer,
    clearRoundTimer,
    advanceToNextRound,
    loadScenarioData,
    
    // Handle the timer
    setCurrentRound,
    setRoundTimer,
    setTimerActive,
    setRoundsCompleted,
  };
};

export default useExperimentRounds;