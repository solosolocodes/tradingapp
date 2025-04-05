import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import supabase from '../../../lib/supabase';
import { formatCurrency, calculateChange, formatCryptoAmount } from '../../../lib/assetHelpers';
// Note: useExperimentRounds is not imported directly due to hook timing issues.
// Instead, we use basic state management directly in this component.

export default function ExperimentPreview() {
  const router = useRouter();
  const { id, participate } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [introScreens, setIntroScreens] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [breakScreens, setBreakScreens] = useState([]);
  const [surveyQuestions, setSurveyQuestions] = useState([]);
  
  // Participant info
  const [isParticipating, setIsParticipating] = useState(false);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantCode, setParticipantCode] = useState('');
  const [participantId, setParticipantId] = useState(null);
  
  // Current state tracking
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSection, setCurrentSection] = useState('intro'); // intro, scenario, break, survey, completed
  const [responses, setResponses] = useState({
    scenarios: {},
    survey: {}
  });
  const [responseTimes, setResponseTimes] = useState({});
  const [stepStartTime, setStepStartTime] = useState(null);
  
  // Create a proper flow of sections based on the ordering
  const [sectionFlow, setSectionFlow] = useState([]);
  
  // Track timer interval for legacy code compatibility
  const [timerInterval, setTimerInterval] = useState(null);
  
  // State for scenario rounds - providing fallbacks to prevent hook errors
  const [currentRound, setCurrentRound] = useState(1);
  const [roundTimer, setRoundTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(false);
  
  // Asset state with fallbacks
  const [assetPrices, setAssetPrices] = useState({});
  const [walletAssets, setWalletAssets] = useState([]);
  const [walletName, setWalletName] = useState('');
  const [portfolioValues, setPortfolioValues] = useState({ assets: [], totalValue: 0, totalUsdtValue: 0 });
  
  // Default values for these properties
  const roundProgress = Math.min((roundTimer / 60) * 100, 100); // Default to 60 seconds
  const totalRounds = 3; // Default value
  const roundDuration = 60; // Default duration
  
  // Functions that will be replaced by the hook when it loads
  const startRoundTimer = () => console.log('Timer not initialized yet');
  const clearRoundTimer = () => console.log('Timer not initialized yet');
  const advanceToNextRound = () => console.log('Timer not initialized yet');
  
  // Wait for query parameters to be fully loaded
  useEffect(() => {
    // Only fetch when id is available and not an empty string
    if (id) {
      console.log("Experiment ID:", id);
      fetchExperimentData();
      
      // Check if we're in participation mode
      if (participate === 'true') {
        setIsParticipating(true);
        setShowParticipantForm(true);
      }
    }
  }, [id, participate, router.isReady]);
  
  // Initialize the custom hook for rounds management once data is loaded
  useEffect(() => {
    if (!scenarios || scenarios.length === 0 || sectionFlow.length === 0) {
      return; // Not ready to initialize yet
    }
    
    try {
      // This is where we would normally use the useExperimentRounds hook directly,
      // but hooks can't be called conditionally or inside effects. 
      // Instead, we'll manually initialize the essential functions.
      
      const currentScenario = scenarios.find(
        s => sectionFlow[currentStep]?.type === 'scenario' && sectionFlow[currentStep]?.id === s.id
      );
      
      if (currentScenario) {
        console.log('Initializing scenario data for:', currentScenario.title);
        // We'll get the asset data and set up timers when we're on a scenario
        
        // TODO: In a future version, refactor this to properly use the hook pattern
        // by moving all logic to the top level and never conditionally calling hooks
      }
    } catch (error) {
      console.error('Error initializing experiment rounds:', error);
    }
  }, [scenarios, sectionFlow, currentStep]);
  
  // Effect to start timing when currentStep changes
  useEffect(() => {
    if (sectionFlow.length === 0 || currentStep >= sectionFlow.length) return;
    
    const currentFlowItem = sectionFlow[currentStep];
    if (currentFlowItem && (currentFlowItem.type === 'scenario' || currentFlowItem.type === 'survey') && !stepStartTime) {
      setStepStartTime(Date.now());
    }
    
    // Reset round state when scenario changes
    if (currentFlowItem && currentFlowItem.type === 'scenario') {
      setCurrentRound(1);
      setRoundTimer(0);
      setRoundsCompleted(false);
      
      // Start the timer for the scenario 
      startRoundTimer(); // Using hook's function
      
      // Fetch scenario data
      const scenario = scenarios.find(s => s.id === currentFlowItem.id);
      if (scenario) {
        console.log(`📋 Loading scenario: ${scenario.title} (ID: ${scenario.id})`);
        
        const loadScenarioData = async () => {
          // Clear previous wallet data
          setWalletAssets([]);
          setAssetPrices({});
          
          try {
            // First try to get the wallet_id directly from the scenario
            if (scenario.wallet_id) {
              console.log(`🔍 Scenario has direct wallet_id: ${scenario.wallet_id}`);
              await fetchWalletData(scenario.wallet_id);
            } 
            // If no wallet_id, check if it's a template-based scenario
            else if (scenario.scenario_template_id) {
              console.log(`🔍 Scenario is template-based (template ID: ${scenario.scenario_template_id}), fetching wallet from template`);
              await fetchWalletFromTemplate(scenario.scenario_template_id);
            } else {
              console.warn(`⚠️ No wallet found for scenario ${scenario.id}`);
            }

            // Fetch prices from the price table (either with scenario.id or template id)
            await fetchScenarioAssetPrices(scenario.id);
            
            // Also fetch prices from template if available
            if (scenario.scenario_template_id) {
              await fetchScenarioAssetPrices(scenario.scenario_template_id);
            }
            
            console.log(`✅ Completed loading data for scenario: ${scenario.title}`);
          } catch (error) {
            console.error(`❌ Error loading scenario data:`, error);
          }
        };
        
        // Execute the async function to load all scenario data
        loadScenarioData();
      }
    } else {
      // Clear the timer if we're not on a scenario
      clearRoundTimer(); // Using hook's function
    }
  }, [currentStep, sectionFlow, stepStartTime, scenarios]);
  
  // Fetch wallet from a scenario template
  const fetchWalletFromTemplate = async (templateId) => {
    if (!templateId) return;
    
    try {
      console.log(`📂 Fetching template data for template ID: ${templateId}`);
      
      // Get template info to get wallet_id
      const { data: templateData, error: templateError } = await supabase
        .from('scenario_templates')
        .select('*')  // Get all template data, not just wallet_id
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;
      
      if (templateData) {
        console.log(`📋 Found template: ${templateData.title}`);
        
        if (templateData.wallet_id) {
          console.log(`💼 Template has wallet ID: ${templateData.wallet_id}`);
          return await fetchWalletData(templateData.wallet_id);
        } else {
          console.warn(`⚠️ Template ${templateData.title} (ID: ${templateId}) has no wallet assigned`);
        }
      } else {
        console.warn(`⚠️ No template found with ID: ${templateId}`);
      }
    } catch (error) {
      console.error('❌ Error fetching template data:', error);
    }
  };
  
  // Fetch wallet data
  const fetchWalletData = async (walletId) => {
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
          console.log(`💰 Found ${assetsData.length} assets in wallet ${walletData.name}:`, 
            assetsData.map(a => a.asset_symbol).join(', '));
          setWalletAssets(assetsData);
        } else {
          console.warn(`⚠️ No assets found in wallet ${walletData.name} (ID: ${walletId})`);
          // Instead of leaving empty, add some default assets for testing purposes
          const defaultAssets = [
            { 
              wallet_id: walletId, 
              asset_symbol: 'BTC', 
              name: 'Bitcoin', 
              price_spot: 48000, 
              amount: 0.25 
            },
            { 
              wallet_id: walletId, 
              asset_symbol: 'ETH', 
              name: 'Ethereum', 
              price_spot: 2800, 
              amount: 4.5 
            },
            { 
              wallet_id: walletId, 
              asset_symbol: 'SOL', 
              name: 'Solana', 
              price_spot: 135, 
              amount: 20 
            },
            { 
              wallet_id: walletId, 
              asset_symbol: 'USDT', 
              name: 'Tether', 
              price_spot: 1, 
              amount: 10000 
            }
          ];
          console.log('📝 Using default assets for empty wallet');
          setWalletAssets(defaultAssets);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching wallet data:', error);
      // Provide default assets in case of error
      setWalletName('Default Wallet');
      setWalletAssets([
        { asset_symbol: 'BTC', name: 'Bitcoin', price_spot: 48000, amount: 0.25 },
        { asset_symbol: 'ETH', name: 'Ethereum', price_spot: 2800, amount: 4.5 },
        { asset_symbol: 'SOL', name: 'Solana', price_spot: 135, amount: 20 },
        { asset_symbol: 'USDT', name: 'Tether', price_spot: 1, amount: 10000 }
      ]);
    }
  };
  
  // Fetch asset prices for a scenario
  const fetchScenarioAssetPrices = async (scenarioId) => {
    if (!scenarioId) return Promise.resolve();
    
    try {
      console.log(`🔍 Fetching asset prices for scenario ID: ${scenarioId}`);
      
      // Directly query the scenario_asset_prices table
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
        const pricesByRound = {};
        
        // Debug the first few records to avoid console overflow
        console.log("Raw price data sample:", pricesData.slice(0, 3));
        
        // Group all prices by round and asset symbol
        pricesData.forEach(price => {
          const { asset_symbol, round_number, price: assetPrice } = price;
          
          // Make sure round_number is a string for consistent lookup
          const roundKey = String(round_number);
          
          if (!pricesByRound[roundKey]) {
            pricesByRound[roundKey] = {};
          }
          
          // Store the price as a number with explicit conversion
          pricesByRound[roundKey][asset_symbol] = Number(assetPrice);
          
          console.log(`💰 Price for ${asset_symbol} in round ${roundKey}: $${pricesByRound[roundKey][asset_symbol]}`);
        });
        
        // Update state with the new prices, merging with existing data
        return new Promise(resolve => {
          setAssetPrices(prev => {
            const merged = {...prev};
            
            // Add new round data
            Object.keys(pricesByRound).forEach(round => {
              merged[round] = {
                ...(merged[round] || {}),
                ...pricesByRound[round]
              };
            });
            
            console.log("📈 Updated price data by round:", merged);
            resolve(merged);
            return merged;
          });
        });
      } else {
        console.warn(`⚠️ No asset prices found for scenario ${scenarioId} - check if data exists in scenario_asset_prices table`);
        return Promise.resolve();
      }
    } catch (error) {
      console.error('❌ Error fetching asset prices:', error);
      return Promise.reject(error);
    }
  };
  
  // Calculate asset values and total portfolio value
  const calculateAssetValues = (round) => {
    if (!walletAssets || !walletAssets.length) {
      return { assets: [], totalValue: 0, totalUsdtValue: 0 };
    }
    
    console.log("===== CALCULATING ASSET VALUES =====");
    console.log("Current Round:", round);
    console.log("Asset Prices By Round:", assetPrices || {});
    console.log("Wallet Assets:", walletAssets);
    
    // Ensure round is treated as a string key for lookup
    const roundKey = String(round || 1);
    
    // Safely access assetPrices - ensure it's defined
    const safeAssetPrices = assetPrices || {};
    
    // Find USDT price for value conversion (default to 1 if not found)
    let usdtPrice = 1;
    // Try to find a USDT or USDC asset to use as reference price
    const stablecoin = walletAssets.find(a => 
      a.asset_symbol === 'USDT' || a.asset_symbol === 'USDC' || a.asset_symbol === 'USD'
    );
    if (stablecoin) {
      // Ensure we have a valid price, defaulting to 1 for safety
      usdtPrice = Number(stablecoin.price_spot) || 1;
      if (usdtPrice <= 0) usdtPrice = 1; // Prevent division by zero
      console.log(`Found stablecoin ${stablecoin.asset_symbol} with price: $${usdtPrice}`);
    }
    
    // Calculate values for each asset - ENSURE ALL WALLET ASSETS ARE SHOWN
    const assetsWithValues = walletAssets.map(asset => {
      // Try to get price from the scenario asset prices for this round
      let price = 0;
      let priceSource = 'unknown';
      
      // First PRIORITIZE the current round's price (safely access nested properties)
      if (safeAssetPrices[roundKey] && typeof safeAssetPrices[roundKey][asset.asset_symbol] !== 'undefined') {
        price = Number(safeAssetPrices[roundKey][asset.asset_symbol]) || 0;
        if (price > 0) { // Only use if price is valid
          priceSource = `scenario round ${roundKey}`;
          console.log(`✅ Found price for ${asset.asset_symbol} in round ${roundKey}: $${price}`);
        }
      } 
      
      // If no valid price found in current round, try previous rounds but prioritize closest rounds
      if (price <= 0) {
        console.log(`❌ No price for ${asset.asset_symbol} in round ${roundKey}, checking other rounds...`);
        // Get all available round keys and sort them to find closest rounds first
        const roundKeys = Object.keys(safeAssetPrices).sort((a, b) => {
          // Sort by absolute distance from current round
          return Math.abs(Number(a) - Number(roundKey)) - Math.abs(Number(b) - Number(roundKey));
        });
        
        // Try to find price in the closest rounds first
        for (const rKey of roundKeys) {
          if (safeAssetPrices[rKey] && typeof safeAssetPrices[rKey][asset.asset_symbol] !== 'undefined') {
            const roundPrice = Number(safeAssetPrices[rKey][asset.asset_symbol]) || 0;
            if (roundPrice > 0) {
              price = roundPrice;
              priceSource = `scenario round ${rKey}`;
              console.log(`✅ Using price from round ${rKey} instead: $${price}`);
              break;
            }
          }
        }
      }
      
      // If still no valid price, use the asset's spot price as fallback
      if (price <= 0) {
        price = Number(asset.price_spot) || 0;
        if (price <= 0) price = 1; // Last resort fallback to ensure visible assets
        priceSource = 'wallet spot price';
        console.log(`ℹ️ Using wallet spot price for ${asset.asset_symbol}: $${price}`);
      }
      
      // Ensure numeric values and prevent NaN
      const amount = Number(asset.amount) || 0;
      const value = amount * price;
      
      // Calculate value in USDT (safely handle potential division by zero)
      const usdtValue = usdtPrice > 0 ? value / usdtPrice : value;
      
      console.log(`📊 ${asset.asset_symbol}: $${price.toFixed(2)} (${priceSource}) × ${amount} = $${value.toFixed(2)} (${usdtValue.toFixed(2)} USDT)`);
      
      return {
        ...asset,
        price: price,
        value: value,
        usdtValue: usdtValue,
        priceSource: priceSource, // Store source for debugging
        previousPrice: asset.previousPrice || price, // Track previous price for change calculation
      };
    });
    
    // Calculate total portfolio value (safely with fallbacks for invalid values)
    const totalValue = assetsWithValues.reduce((sum, asset) => {
      const assetValue = typeof asset.value === 'number' && !isNaN(asset.value) ? asset.value : 0;
      return sum + assetValue;
    }, 0);
    
    // Calculate total value in USDT
    const totalUsdtValue = assetsWithValues.reduce((sum, asset) => {
      const assetUsdtValue = typeof asset.usdtValue === 'number' && !isNaN(asset.usdtValue) ? asset.usdtValue : 0;
      return sum + assetUsdtValue;
    }, 0);
    
    // Log summary
    console.log(`💰 ROUND ${round} - TOTAL VALUE: $${totalValue.toFixed(2)} (${totalUsdtValue.toFixed(2)} USDT) from ${assetsWithValues.length} assets`);
    console.log("===== END CALCULATION =====");
    
    return { assets: assetsWithValues, totalValue, totalUsdtValue };
  };
  
  // Timer effect for scenario rounds
  useEffect(() => {
    // Only run the timer when it's active
    if (!timerActive) return;
    
    const interval = setInterval(() => {
      setRoundTimer(prevTimer => {
        const currentFlowItem = sectionFlow[currentStep];
        if (!currentFlowItem || currentFlowItem.type !== 'scenario') {
          clearInterval(interval);
          return prevTimer;
        }
        
        const scenario = scenarios.find(s => s.id === currentFlowItem.id);
        if (!scenario) {
          clearInterval(interval);
          return prevTimer;
        }
        
        const roundDuration = scenario.round_duration || 10;
        
        // Check if the timer has reached the round duration
        if (prevTimer >= roundDuration) {
          const totalRounds = scenario.rounds || 3;
          
          if (currentRound < totalRounds) {
            // Move to next round
            const nextRound = currentRound + 1;
            
            console.log(`⏱️ Round ${currentRound} complete, advancing to round ${nextRound}!`);
            
            // Set the next round - this will trigger the round change effect
            setCurrentRound(nextRound);
            
            // Auto submit the response to enable the Next button when all rounds are done
            if (nextRound === totalRounds) {
              // This will be the last round, prepare for completion
              setTimeout(() => {
                console.log(`🏁 Final round ${nextRound}, auto-submitting response for completion`);
                // Auto submit the response to enable the Next button
                handleScenarioResponse(scenario.id, `round_${nextRound}`);
              }, 1000);
            }
            
            return 0; // Reset timer
          } else {
            // All rounds completed
            console.log(`🎉 All ${totalRounds} rounds completed!`);
            
            setRoundsCompleted(true);
            setTimerActive(false);
            clearInterval(interval);
            
            // Auto submit the response to enable the Next button
            console.log(`✅ Auto-submitting final response for scenario ${scenario.id}`);
            handleScenarioResponse(scenario.id, `round_${currentRound}`);
            
            return roundDuration; // Keep the timer at max
          }
        }
        
        return prevTimer + 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
    
    return () => {
      clearInterval(interval);
    };
  }, [timerActive, currentRound, currentStep, sectionFlow, scenarios]);
  
  // Effect to update asset display when current round changes
  useEffect(() => {
    console.log(`🔄 ROUND CHANGED TO: ${currentRound}`);
    
    // Force re-render of asset cards to show updated prices for the new round
    if (walletAssets.length > 0) {
      let isMounted = true; // Flag to prevent state updates after unmount
      
      const fetchAndUpdatePrices = async () => {
        // Re-fetch asset prices when round changes to ensure we have latest data
        const currentFlowItem = sectionFlow[currentStep];
        if (currentFlowItem && currentFlowItem.type === 'scenario') {
          const scenario = scenarios.find(s => s.id === currentFlowItem.id);
          if (scenario) {
            console.log(`Re-fetching asset prices for scenario ${scenario.id} for round ${currentRound}`);
            
            // Use Promise.all to fetch all prices concurrently
            const fetchPromises = [fetchScenarioAssetPrices(scenario.id)];
            
            if (scenario.scenario_template_id) {
              fetchPromises.push(fetchScenarioAssetPrices(scenario.scenario_template_id));
            }
            
            // Wait for all price data to be fetched
            await Promise.all(fetchPromises);
            
            // After prices are fetched, recalculate values
            if (isMounted) {
              const { assets, totalValue, totalUsdtValue } = calculateAssetValues(currentRound);
              console.log(`🔄 ROUND ${currentRound} UPDATED PRICES:`);
              assets.forEach(asset => {
                console.log(`  ${asset.asset_symbol}: $${asset.price} × ${asset.amount} = $${asset.value}`);
              });
              console.log(`  💰 Total portfolio value: $${totalValue} (${totalUsdtValue.toFixed(2)} USDT)`);
              
              // Clone the array and set it back to trigger a re-render
              setWalletAssets([...walletAssets]);
            }
          }
        }
      };
      
      fetchAndUpdatePrices();
      
      // Visual indicator that prices have changed - client side only
      if (typeof document !== 'undefined') {
        const assetCards = document.getElementById('assetCards');
        if (assetCards) {
          // Flash effect to indicate price change
          assetCards.style.transition = 'background-color 0.5s';
          assetCards.style.backgroundColor = 'rgba(255, 255, 200, 0.5)';
          setTimeout(() => {
            // Make sure the element still exists when the timeout executes
            if (document.getElementById('assetCards')) {
              document.getElementById('assetCards').style.backgroundColor = 'transparent';
            }
          }, 500);
        }
      }
      
      // Cleanup function to handle unmounting
      return () => {
        isMounted = false;
      };
    }
  }, [currentRound]);
  
  // Legacy timer management functions (these are used by the existing code)
  const legacyStartTimer = () => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    setRoundTimer(0);
    setTimerActive(true);
  };
  
  const legacyClearTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    setTimerActive(false);
  };
  
  const fetchExperimentData = async () => {
    try {
      setLoading(true);
      console.log("Fetching data for experiment ID:", id);
      
      // Validate ID
      if (!id) {
        throw new Error("No experiment ID provided");
      }
      
      // Fetch experiment details
      const { data: experimentData, error: experimentError } = await supabase
        .from('experiments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (experimentError) {
        console.error("Error fetching experiment:", experimentError);
        throw experimentError;
      }
      
      if (!experimentData) {
        console.error("No experiment found with ID:", id);
        router.push('/experiments');
        return;
      }
      
      setExperiment(experimentData);
      console.log("Experiment data loaded:", experimentData.title);
      
      // Get all content in the correct order and format
      // First fetch all section types and make a single ordered list
      
      // Simplify by using sequential queries with proper error handling
      
      // 1. Get intro screens
      console.log("Fetching intro screens...");
      const { data: introScreensData, error: introError } = await supabase
        .from('experiment_intro_screens')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (introError) {
        console.error("Error fetching intro screens:", introError);
        throw introError;
      }
      
      setIntroScreens(introScreensData || []);
      console.log(`Loaded ${introScreensData?.length || 0} intro screens`);
      
      // 2. Get scenarios
      console.log("Fetching scenarios...");
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('experiment_scenarios')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (scenariosError) {
        console.error("Error fetching scenarios:", scenariosError);
        throw scenariosError;
      }
      
      setScenarios(scenariosData || []);
      console.log(`Loaded ${scenariosData?.length || 0} scenarios`);
      
      // 3. Get break screens
      console.log("Fetching break screens...");
      const { data: breakScreensData, error: breakError } = await supabase
        .from('experiment_break_screens')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (breakError) {
        console.error("Error fetching break screens:", breakError);
        throw breakError;
      }
      
      setBreakScreens(breakScreensData || []);
      console.log(`Loaded ${breakScreensData?.length || 0} break screens`);
      
      // 4. Get survey questions
      console.log("Fetching survey questions...");
      const { data: questionsData, error: questionsError } = await supabase
        .from('experiment_survey_questions')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (questionsError) {
        console.error("Error fetching survey questions:", questionsError);
        throw questionsError;
      }
      
      setSurveyQuestions(questionsData || []);
      console.log(`Loaded ${questionsData?.length || 0} survey questions`);
      
      // Now combine all sections into a single ordered flow
      const combinedSections = [];
      
      // Add intro screens with type
      (introScreensData || []).forEach(screen => {
        combinedSections.push({
          id: screen.id,
          type: 'intro',
          order_index: screen.order_index,
          title: screen.title
        });
      });
      
      // Add scenarios with type
      (scenariosData || []).forEach(scenario => {
        combinedSections.push({
          id: scenario.id,
          type: 'scenario',
          order_index: scenario.order_index,
          title: scenario.title
        });
      });
      
      // Add break screens with type
      (breakScreensData || []).forEach(screen => {
        combinedSections.push({
          id: screen.id,
          type: 'break',
          order_index: screen.order_index,
          title: screen.title
        });
      });
      
      // Group survey questions by is_demographic
      const demoQuestions = (questionsData || []).filter(q => q.is_demographic);
      const customQuestions = (questionsData || []).filter(q => !q.is_demographic);
      
      // Add demographic survey as a group
      if (demoQuestions.length > 0) {
        // Use the order index of the first question of this type
        combinedSections.push({
          id: 'demographic-survey',
          type: 'survey-group',
          order_index: demoQuestions[0].order_index,
          title: 'Demographic Survey',
          isDemographic: true
        });
        
        // Add individual questions to flow
        demoQuestions.forEach(question => {
          combinedSections.push({
            id: question.id,
            type: 'survey',
            order_index: question.order_index + 0.1, // Make sure they appear after the group header
            title: question.question,
            isDemographic: true
          });
        });
      }
      
      // Add custom survey as a group
      if (customQuestions.length > 0) {
        // Use the order index of the first question of this type
        combinedSections.push({
          id: 'custom-survey',
          type: 'survey-group',
          order_index: customQuestions[0].order_index,
          title: 'Feedback Survey',
          isDemographic: false
        });
        
        // Add individual questions to flow
        customQuestions.forEach(question => {
          combinedSections.push({
            id: question.id,
            type: 'survey',
            order_index: question.order_index + 0.1, // Make sure they appear after the group header
            title: question.question,
            isDemographic: false
          });
        });
      }
      
      // Sort by order_index
      combinedSections.sort((a, b) => a.order_index - b.order_index);
      
      console.log("Created section flow:", combinedSections);
      setSectionFlow(combinedSections);
      
    } catch (error) {
      console.error('Error fetching experiment data:', error);
      setError('Error loading experiment data. Please try again. ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // This method is no longer needed as we've incorporated the flow creation directly
  // into the fetchExperimentData method
  const createExperimentFlow = (orderedSections) => {
    console.log("createExperimentFlow is deprecated - flow created in fetchExperimentData");
  };
  
  const handleNext = () => {
    // Using the section flow for proper ordering
    if (sectionFlow.length === 0) return;
    
    // Record response time if this was a scenario or survey question
    if (currentStep < sectionFlow.length && stepStartTime) {
      const currentFlowItem = sectionFlow[currentStep];
      if (currentFlowItem && (currentFlowItem.type === 'scenario' || currentFlowItem.type === 'survey')) {
        const responseTime = Date.now() - stepStartTime;
        setResponseTimes(prev => ({
          ...prev,
          [currentFlowItem.id]: responseTime
        }));
      }
    }
    
    if (currentStep < sectionFlow.length - 1) {
      // Move to the next step in the flow
      setCurrentStep(currentStep + 1);
      setCurrentSection(sectionFlow[currentStep + 1].type);
      
      // Start timing for the next step if it's a scenario or survey
      const nextFlowItem = sectionFlow[currentStep + 1];
      if (nextFlowItem && (nextFlowItem.type === 'scenario' || nextFlowItem.type === 'survey')) {
        setStepStartTime(Date.now());
      } else {
        setStepStartTime(null);
      }
    } else {
      // Complete the experiment
      setCurrentSection('completed');
      setStepStartTime(null);
    }
  };
  
  const handleScenarioResponse = (scenarioId, response) => {
    // If this is the first response, start the timer
    if (!stepStartTime) {
      setStepStartTime(Date.now());
    }
    
    // Save the selected response
    setResponses({
      ...responses,
      scenarios: {
        ...responses.scenarios,
        [scenarioId]: response
      }
    });
    
    // Start the round timer if it's not active
    if (!timerActive && !roundsCompleted) {
      startRoundTimer(); // Using hook's function
    }
  };
  
  const handleSurveyResponse = (questionId, response) => {
    // If this is the first response, start the timer
    if (!stepStartTime) {
      setStepStartTime(Date.now());
    }
    
    setResponses({
      ...responses,
      survey: {
        ...responses.survey,
        [questionId]: response
      }
    });
  };
  
  const handleRegisterParticipant = async () => {
    try {
      // Basic validation
      if (!participantEmail) {
        alert('Please enter your email address');
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(participantEmail)) {
        alert('Please enter a valid email address');
        return;
      }
      
      // Timestamp for when the participant started
      const startTimestamp = new Date().toISOString();
      
      // Prepare metadata with additional information
      const metadata = {
        access_code: participantCode || null,
        browser: navigator.userAgent,
        timestamp: startTimestamp,
      };
      
      // Create a new participant record in the database
      const { data: participantData, error: participantError } = await supabase
        .from('experiment_participants')
        .insert({
          experiment_id: id,
          participant_code: participantEmail, // We'll use email as ID
          status: 'in_progress',
          started_at: startTimestamp,
          metadata: metadata
        })
        .select()
        .single();
      
      if (participantError) {
        // Check if it's a duplicate email error
        if (participantError.code === '23505') { // Postgres unique violation
          alert('This email has already been used for this experiment. Please use a different email address.');
          return;
        }
        throw participantError;
      }
      
      // Save the participant ID for later
      setParticipantId(participantData.id);
      
      // Hide the form and start the experiment
      setShowParticipantForm(false);
      
      // Initialize timing for the first step
      if (sectionFlow.length > 0) {
        const firstItem = sectionFlow[0];
        if (firstItem && (firstItem.type === 'scenario' || firstItem.type === 'survey')) {
          setStepStartTime(Date.now());
        }
      }
      
    } catch (error) {
      console.error('Error registering participant:', error);
      alert(`Error registering participant: ${error.message}`);
    }
  };
  
  const handleSubmit = async () => {
    try {
      console.log('Responses submitted:', responses);
      console.log('Response times:', responseTimes);
      
      if (isParticipating && participantId) {
        // Get the current timestamp for all submissions
        const submissionTimestamp = new Date().toISOString();
        
        // Begin a transaction-like operation (Supabase doesn't fully support transactions)
        let hasErrors = false;
        const errors = [];
        
        // Submit scenario responses
        for (const [scenarioId, response] of Object.entries(responses.scenarios)) {
          const responseTime = responseTimes[scenarioId] || 0;
          
          const { error: scenarioError } = await supabase
            .from('experiment_scenario_responses')
            .insert({
              experiment_id: id,
              scenario_id: scenarioId,
              participant_code: participantId,
              response: response,
              response_time: Math.floor(responseTime / 1000), // Convert ms to seconds
              created_at: submissionTimestamp
            });
          
          if (scenarioError) {
            hasErrors = true;
            errors.push(`Scenario response error: ${scenarioError.message}`);
          }
        }
        
        // Submit survey responses
        for (const [questionId, response] of Object.entries(responses.survey)) {
          const responseTime = responseTimes[questionId] || 0;
          
          const { error: surveyError } = await supabase
            .from('experiment_survey_responses')
            .insert({
              experiment_id: id,
              question_id: questionId,
              participant_code: participantId,
              response: response,
              created_at: submissionTimestamp
            });
          
          if (surveyError) {
            hasErrors = true;
            errors.push(`Survey response error: ${surveyError.message}`);
          }
        }
        
        // Check if we had any errors
        if (hasErrors) {
          console.error('Errors occurred during submission:', errors);
          throw new Error('Some responses could not be saved. ' + errors.join(', '));
        }
        
        // Update participant status to completed
        const { error: updateError } = await supabase
          .from('experiment_participants')
          .update({
            status: 'completed',
            completed_at: submissionTimestamp
          })
          .eq('id', participantId);
        
        if (updateError) throw updateError;
        
        alert('Thank you for participating! Your responses have been recorded.');
      } else {
        // For preview mode, just show a success message
        alert('Responses submitted successfully (preview mode)');
      }
      
      // Close the window
      window.close();
      
    } catch (error) {
      console.error('Error submitting responses:', error);
      setError('Error submitting responses. Please try again.');
      alert(`Error: ${error.message}`);
    }
  };
  
  // Determine if the Next button should be disabled
  const isNextDisabled = () => {
    if (sectionFlow.length === 0) return true;
    
    const currentFlowItem = sectionFlow[currentStep];
    if (!currentFlowItem) return true;
    
    if (currentFlowItem.type === 'scenario') {
      // Find the scenario by ID
      const currentScenario = scenarios.find(s => s.id === currentFlowItem.id);
      
      // Disable Next button if:
      // 1. No scenario found
      // 2. No response selected
      // 3. Rounds are not completed yet
      return !currentScenario || 
             !responses.scenarios[currentScenario.id] ||
             !roundsCompleted;
    }
    
    if (currentFlowItem.type === 'survey') {
      // Check if we have a response for this question
      return !responses.survey[currentFlowItem.id];
    }
    
    return false;
  };
  
  // Render the current step based on the section flow
  const renderCurrentStep = () => {
    // If experiment completed
    if (currentSection === 'completed') {
      return (
        <div className="card" style={{ 
          backgroundColor: 'var(--color-success)', 
          color: 'white',
          textAlign: 'center'
        }}>
          <h2>Experiment Completed!</h2>
          <p style={{ margin: 'var(--spacing-md) 0' }}>
            Thank you for participating in this experiment.
          </p>
          <p>
            Your responses have been recorded.
          </p>
        </div>
      );
    }
    
    // If section flow is not loaded yet
    if (sectionFlow.length === 0) {
      return (
        <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
          <h2>Loading Experiment Content</h2>
          <p>Please wait while we prepare the experiment...</p>
        </div>
      );
    }
    
    // Get the current flow item
    const currentFlowItem = sectionFlow[currentStep];
    if (!currentFlowItem) {
      console.error("No flow item at step", currentStep);
      return (
        <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
          <h2>Navigation Error</h2>
          <p>There was an error navigating the experiment.</p>
          <p>Please go back to the experiments page and try again.</p>
        </div>
      );
    }
    
    console.log("Rendering section:", currentFlowItem);
    
    // Render based on section type
    switch (currentFlowItem.type) {
      case 'intro':
        // Find the intro screen by ID
        const introScreen = introScreens.find(s => s.id === currentFlowItem.id);
        if (!introScreen) {
          console.error("Info screen not found with ID:", currentFlowItem.id);
          return (
            <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
              <h2>Content Error</h2>
              <p>The information screen could not be found.</p>
            </div>
          );
        }
        
        return (
          <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
            <h2>{introScreen.title}</h2>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              margin: 'var(--spacing-md) 0' 
            }}>
              {introScreen.content}
            </div>
          </div>
        );
        
      case 'scenario':
        // Find the scenario by ID
        const scenario = scenarios.find(s => s.id === currentFlowItem.id);
        if (!scenario) {
          console.error("Scenario not found with ID:", currentFlowItem.id);
          return (
            <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
              <h2>Content Error</h2>
              <p>The scenario could not be found.</p>
            </div>
          );
        }
        
        const selectedOption = responses.scenarios[scenario.id];
        const roundDuration = scenario.round_duration || 10;
        const totalRounds = scenario.rounds || 3;
        const roundProgress = Math.min(roundTimer / roundDuration * 100, 100);
        
        return (
          <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
            {/* Timer Dashboard */}
            <div style={{
              backgroundColor: 'var(--color-primary-light, #e3f2fd)',
              margin: '-8px -8px 16px -8px',
              padding: '12px',
              borderTopLeftRadius: 'var(--border-radius)',
              borderTopRightRadius: 'var(--border-radius)',
              borderBottom: '1px solid var(--color-primary)'
            }}>
              {/* Round Progress */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: 'bold', color: 'var(--color-primary-dark, #0d47a1)' }}>
                  Round {currentRound} of {totalRounds}
                </div>
                <div style={{ fontWeight: 'bold', color: roundsCompleted ? 'var(--color-success)' : 'var(--color-primary-dark, #0d47a1)' }}>
                  {roundsCompleted ? 'Completed!' : `${roundTimer}s / ${roundDuration}s`}
                </div>
              </div>
              
              {/* Round Progress Bar */}
              <div style={{
                height: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${roundProgress}%`,
                  backgroundColor: roundsCompleted ? 'var(--color-success)' : 'var(--color-primary)',
                  transition: 'width 0.2s ease'
                }}></div>
              </div>
              
              {/* Scenario Progress */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '8px'
              }}>
                {Array.from({length: totalRounds}, (_, i) => (
                  <div key={i} style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    margin: '0 3px',
                    backgroundColor: i < currentRound - 1 ? 'var(--color-success)' : 
                                     i === currentRound - 1 ? (roundsCompleted ? 'var(--color-success)' : 'var(--color-primary)') : 
                                     'var(--color-gray)'
                  }}></div>
                ))}
              </div>
            </div>
            
            <h2>{scenario.title}</h2>
            <p style={{ 
              whiteSpace: 'pre-wrap', 
              margin: 'var(--spacing-md) 0' 
            }}>
              {scenario.description}
            </p>
            
            {/* Wallet and Asset Information */}
            <div style={{ margin: 'var(--spacing-md) 0' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--color-primary-light, #e3f2fd)',
                borderRadius: 'var(--border-radius)',
                marginBottom: 'var(--spacing-md)'
              }}>
                <h3 style={{ margin: 0 }}>
                  {scenario.wallet_id ? 'Wallet Assets' : 'Market Assets'}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: 'var(--color-primary-dark, #0d47a1)',
                    fontSize: '1.1rem',
                    animation: 'valueChange 0.5s'
                  }}>
                    Round {currentRound} of {totalRounds}
                  </div>
                  
                  {/* Visual round indicator */}
                  <div style={{
                    display: 'flex',
                    gap: '3px'
                  }}>
                    {Array.from({length: totalRounds}, (_, i) => (
                      <div key={i} style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: '1px solid var(--color-primary)',
                        backgroundColor: i < currentRound ? 'var(--color-primary)' : 'transparent',
                        transition: 'background-color 0.3s'
                      }}></div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Asset Cards Grid */}
              <div id="assetCards" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 'var(--spacing-sm)'
              }}>
                {(() => {
                  // Calculate asset values for current round
                  const { assets, totalValue } = calculateAssetValues(currentRound);
                  
                  // Store totalValue for use in the portfolio summary
                  const portfolioTotalValue = totalValue;
                  
                  // If no assets found, show a message directing how to add assets
                  if (!assets || assets.length === 0) {
                    // Create a set of placeholder assets for demo purposes
                    const placeholderAssets = [
                      { 
                        asset_symbol: 'BTC', 
                        name: 'Bitcoin', 
                        price_spot: 48000, 
                        amount: 0.25,
                        value: 12000,
                        usdtValue: 12000
                      },
                      { 
                        asset_symbol: 'ETH', 
                        name: 'Ethereum', 
                        price_spot: 2800, 
                        amount: 4.5,
                        value: 12600,
                        usdtValue: 12600
                      },
                      { 
                        asset_symbol: 'SOL', 
                        name: 'Solana', 
                        price_spot: 135, 
                        amount: 20,
                        value: 2700,
                        usdtValue: 2700
                      },
                      { 
                        asset_symbol: 'USDT', 
                        name: 'Tether', 
                        price_spot: 1, 
                        amount: 10000,
                        value: 10000,
                        usdtValue: 10000
                      },
                      { 
                        asset_symbol: 'XRP', 
                        name: 'Ripple', 
                        price_spot: 0.55, 
                        amount: 5000,
                        value: 2750,
                        usdtValue: 2750
                      }
                    ];
                    
                    // Display a message above the placeholder assets
                    return (
                      <>
                        <div style={{
                          gridColumn: '1 / -1',
                          padding: 'var(--spacing-sm)',
                          backgroundColor: 'var(--color-warning-light, #fff3e0)',
                          borderRadius: 'var(--border-radius)',
                          marginBottom: 'var(--spacing-sm)',
                          border: '1px dashed var(--color-warning)'
                        }}>
                          <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--color-warning-dark)' }}>
                            No wallet assets found for this scenario!
                          </p>
                          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                            Showing placeholder assets for demonstration. To fix this:
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                              <li>Ensure a wallet is assigned to this scenario</li>
                              <li>Add assets to the wallet in the wallet management section</li>
                              <li>Add price data to the scenario_asset_prices table for each round</li>
                            </ul>
                          </p>
                        </div>
                        
                        {/* Render placeholder assets */}
                        {placeholderAssets.map((asset, index) => (
                          <div key={index} className="card" style={{
                            padding: 'var(--spacing-sm)',
                            border: '1px solid var(--color-gray)',
                            backgroundColor: 'white'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 'var(--spacing-xs)'
                            }}>
                              <span style={{ fontWeight: 'bold' }}>{asset.asset_symbol}</span>
                              <span style={{
                                backgroundColor: asset.asset_symbol === 'BTC' ? '#f2a900' : 
                                                asset.asset_symbol === 'ETH' ? '#627eea' : 
                                                asset.asset_symbol === 'SOL' ? '#00ffbd' :
                                                asset.asset_symbol === 'USDT' ? '#26a17b' : 
                                                asset.asset_symbol === 'XRP' ? '#2a73c0' : '#888888',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                              }}>
                                {asset.name}
                              </span>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              margin: 'var(--spacing-xs) 0'
                            }}>
                              <span>Amount:</span>
                              <span style={{ fontWeight: 'bold' }}>
                                {Number(asset.amount).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 8
                                })}
                              </span>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              margin: 'var(--spacing-xs) 0'
                            }}>
                              <span>Price:</span>
                              <span style={{ fontWeight: 'bold' }}>
                                ${Number(asset.price_spot).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              margin: 'var(--spacing-xs) 0',
                              padding: 'var(--spacing-xs) 0',
                              borderTop: '1px solid var(--color-gray-light)',
                              fontWeight: 'bold'
                            }}>
                              <span>Value:</span>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span>
                                  ${Number(asset.value).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </span>
                                <span style={{ 
                                  fontSize: '0.8rem', 
                                  color: 'var(--color-gray-dark)' 
                                }}>
                                  {Number(asset.usdtValue).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })} USDT
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  }
                  
                  // Render actual wallet assets
                  return (
                    <>
                      {(() => {
                        // Store previous round's prices to compare
                        const prevRound = currentRound - 1;
                        const prevAssetPrices = prevRound >= 1 ? assetPrices[prevRound] || {} : {};
                        
                        return assets.map((asset, index) => {
                          // Get asset color based on symbol
                          let assetColor = '#888888';
                          if (asset.asset_symbol === 'BTC') assetColor = '#f2a900';
                          else if (asset.asset_symbol === 'ETH') assetColor = '#627eea';
                          else if (asset.asset_symbol === 'SOL') assetColor = '#00ffbd';
                          else if (asset.asset_symbol === 'USDT' || asset.asset_symbol === 'USDC') assetColor = '#26a17b';
                          else if (asset.asset_symbol === 'XRP') assetColor = '#2a73c0';
                          
                          // Compare with previous round's price to show change indicator
                          const prevPrice = prevAssetPrices && typeof prevAssetPrices[asset.asset_symbol] !== 'undefined' 
                            ? Number(prevAssetPrices[asset.asset_symbol]) || 0
                            : Number(asset.price) || 0;
                            
                          const currentPrice = Number(asset.price) || 0;
                          const priceChange = currentPrice - prevPrice;
                          
                          // Safely calculate percentage change to avoid division by zero
                          let priceChangePercent = 0;
                          if (prevPrice > 0 && priceChange !== 0) {
                            priceChangePercent = (priceChange / prevPrice) * 100;
                          }
                          
                          // Determine price change indicator color
                          let changeColor = 'transparent';
                          let changeIcon = '';
                          
                          if (currentRound > 1 && Math.abs(priceChangePercent) > 0.01) { // Only show changes > 0.01%
                            if (priceChange > 0) {
                              changeColor = 'var(--color-success)';
                              changeIcon = '▲';
                            } else if (priceChange < 0) {
                              changeColor = 'var(--color-danger)';
                              changeIcon = '▼';
                            }
                          }
                          
                          // Animation class for the card
                          const cardAnimation = currentRound > 1 ? 'price-update-flash' : '';
                          
                          return (
                            <div key={index} className={`card ${cardAnimation}`} 
                              style={{
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--color-gray)',
                                backgroundColor: 'white',
                                animation: currentRound > 1 ? 'priceFlash 1s' : 'none'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 'var(--spacing-xs)'
                              }}>
                                <span style={{ fontWeight: 'bold' }}>{asset.asset_symbol}</span>
                                <span style={{
                                  backgroundColor: assetColor,
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem'
                                }}>
                                  {asset.name}
                                </span>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                margin: 'var(--spacing-xs) 0'
                              }}>
                                <span>Amount:</span>
                                <span style={{ fontWeight: 'bold' }}>
                                  {Number(asset.amount).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 8
                                  })}
                                </span>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                margin: 'var(--spacing-xs) 0'
                              }}>
                                <span>Price:</span>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{ 
                                    fontWeight: 'bold',
                                    color: priceChange !== 0 && currentRound > 1 ? changeColor : 'inherit'
                                  }}>
                                    ${Number(asset.price).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                  
                                  {currentRound > 1 && priceChange !== 0 && (
                                    <span style={{ 
                                      marginLeft: '4px', 
                                      fontSize: '0.8rem',
                                      color: changeColor,
                                      fontWeight: 'bold' 
                                    }}>
                                      {changeIcon} {Math.abs(priceChangePercent).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                margin: 'var(--spacing-xs) 0',
                                padding: 'var(--spacing-xs) 0',
                                borderTop: '1px solid var(--color-gray-light)',
                                fontWeight: 'bold'
                              }}>
                                <span>Value:</span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <span style={{
                                    color: priceChange !== 0 && currentRound > 1 ? changeColor : 'inherit'
                                  }}>
                                    ${Number(asset.value).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.8rem', 
                                    color: 'var(--color-gray-dark)' 
                                  }}>
                                    {Number(asset.usdtValue).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })} USDT
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      
                      {/* Return the Total Portfolio Value component */}
                      {assets.length > 0 && (() => {
                        // Calculate change in total value from previous round - safely handle edge cases
                        const prevRound = currentRound - 1;
                        let prevTotalValue = 0;
                        
                        if (prevRound >= 1) {
                          try {
                            const prevValues = calculateAssetValues(prevRound);
                            prevTotalValue = typeof prevValues.totalValue === 'number' && !isNaN(prevValues.totalValue) 
                              ? prevValues.totalValue : 0;
                          } catch (error) {
                            console.error('Error calculating previous total value:', error);
                            // Continue with default value of 0
                          }
                        }
                        
                        // Ensure both values are valid numbers
                        const safePortfolioTotal = typeof portfolioTotalValue === 'number' && !isNaN(portfolioTotalValue) 
                          ? portfolioTotalValue : 0;
                        const safePrevTotal = typeof prevTotalValue === 'number' && !isNaN(prevTotalValue) 
                          ? prevTotalValue : 0;
                          
                        const valueChange = safePortfolioTotal - safePrevTotal;
                        
                        // Safely calculate percentage change
                        let valueChangePercent = 0;
                        if (safePrevTotal > 0 && valueChange !== 0) {
                          valueChangePercent = (valueChange / safePrevTotal) * 100;
                        }
                        
                        // Determine color based on value change
                        let changeColor = 'var(--color-success-dark, #2e7d32)';
                        let changeIcon = '';
                        
                        if (currentRound > 1 && Math.abs(valueChangePercent) > 0.01) { // Only show significant changes
                          if (valueChange > 0) {
                            changeColor = 'var(--color-success)';
                            changeIcon = '▲';
                          } else if (valueChange < 0) {
                            changeColor = 'var(--color-danger)';
                            changeIcon = '▼';
                          }
                        }
                        
                        return (
                          <div style={{
                            gridColumn: '1 / -1', // Span all columns
                            marginTop: 'var(--spacing-sm)',
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'var(--color-success-light, #e8f5e9)',
                            borderRadius: 'var(--border-radius)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            animation: currentRound > 1 ? 'priceFlash 1s' : 'none'
                          }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Total Portfolio Value:</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ 
                                fontWeight: 'bold', 
                                fontSize: '1.1rem',
                                color: changeColor
                              }}>
                                ${Number(portfolioTotalValue).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                              
                              {currentRound > 1 && valueChange !== 0 && (
                                <span style={{ 
                                  marginLeft: '8px', 
                                  fontSize: '0.9rem',
                                  color: changeColor,
                                  fontWeight: 'bold' 
                                }}>
                                  {changeIcon} ${Math.abs(valueChange).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })} ({Math.abs(valueChangePercent).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
              
              {/* Auto-response for Next button to work */}
              <div style={{ display: 'none' }}>
                <input 
                  type="hidden" 
                  value={`round_${currentRound}`} 
                  onChange={() => {/* This ensures we have a valid response */
                    if (!responses.scenarios[scenario.id]) {
                      handleScenarioResponse(scenario.id, `round_${currentRound}`);
                    }
                  }} 
                />
              </div>
            </div>
            
            <div style={{ 
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-sm)',
              backgroundColor: roundsCompleted ? 'var(--color-success-light, #e8f5e9)' : 'var(--color-warning-light, #fff3e0)',
              borderRadius: 'var(--border-radius)',
              textAlign: 'center',
              fontSize: '0.9rem'
            }}>
              {roundsCompleted ? 
                <>
                  <strong style={{ color: 'var(--color-success-dark, #2e7d32)' }}>All rounds completed!</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--color-gray-dark)' }}>You can now proceed to the next section.</p>
                </> :
                <>
                  <strong style={{ color: 'var(--color-warning-dark, #e65100)' }}>Please wait for all rounds to complete</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--color-gray-dark)' }}>The next button will be enabled when all {totalRounds} rounds are finished.</p>
                </>
              }
            </div>
          </div>
        );
        
      case 'break':
        // Find the break screen by ID
        const breakScreen = breakScreens.find(s => s.id === currentFlowItem.id);
        if (!breakScreen) {
          console.error("Break screen not found with ID:", currentFlowItem.id);
          return (
            <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
              <h2>Content Error</h2>
              <p>The break screen could not be found.</p>
            </div>
          );
        }
        
        return (
          <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
            <h2>{breakScreen.title}</h2>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              margin: 'var(--spacing-md) 0' 
            }}>
              {breakScreen.content}
            </div>
          </div>
        );
        
      case 'survey-group':
        // This is a header for a survey section
        return (
          <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
            <h2>{currentFlowItem.title}</h2>
            <p style={{ 
              margin: 'var(--spacing-md) 0'
            }}>
              {currentFlowItem.isDemographic ? 
                'Please provide some information about yourself. This helps us analyze the results in context.' :
                'Please provide your feedback on the experiment.'}
            </p>
          </div>
        );
        
      case 'survey':
        // Find the specific question by ID
        const question = surveyQuestions.find(q => q.id === currentFlowItem.id);
        if (!question) {
          console.error("Survey question not found with ID:", currentFlowItem.id);
          return (
            <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
              <h2>Content Error</h2>
              <p>The survey question could not be found.</p>
            </div>
          );
        }
        
        const selectedResponse = responses.survey[question.id];
        
        return (
          <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
            <h2>Survey Question</h2>
            <p style={{ 
              margin: 'var(--spacing-md) 0',
              fontWeight: '500'
            }}>
              {question.question}
            </p>
            
            {question.type === 'multiple_choice' && (
              <div style={{ margin: 'var(--spacing-md) 0' }}>
                {question.options && question.options.map((option, index) => (
                  <div 
                    key={index} 
                    className="card" 
                    style={{ 
                      marginBottom: 'var(--spacing-sm)',
                      backgroundColor: selectedResponse === option ? 'var(--color-primary)' : 'white',
                      color: selectedResponse === option ? 'white' : 'inherit',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleSurveyResponse(question.id, option)}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
            
            {question.type === 'text' && (
              <div style={{ margin: 'var(--spacing-md) 0' }}>
                <textarea
                  className="form-control"
                  value={selectedResponse || ''}
                  onChange={(e) => handleSurveyResponse(question.id, e.target.value)}
                  rows="4"
                  placeholder="Enter your response here..."
                ></textarea>
              </div>
            )}
            
            {question.type === 'number' && (
              <div style={{ margin: 'var(--spacing-md) 0' }}>
                <input
                  type="number"
                  className="form-control"
                  value={selectedResponse || ''}
                  onChange={(e) => handleSurveyResponse(question.id, e.target.value)}
                  placeholder="Enter a number..."
                />
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
            <h2>Unknown Section Type</h2>
            <p>Cannot display content: {currentFlowItem.type}</p>
          </div>
        );
    }
  };
  
  // Progress bar calculation using section flow
  const calculateProgress = () => {
    if (sectionFlow.length === 0) return 0;
    
    const totalSteps = sectionFlow.length;
    let completedSteps = currentSection === 'completed' ? totalSteps : currentStep;
    
    return (completedSteps / totalSteps) * 100;
  };
  
  // Add animation styles to the head
  useEffect(() => {
    // Only run on client side
    if (typeof document !== 'undefined') {
      // Check if our style element already exists to prevent duplicates
      const existingStyleId = 'experiment-preview-animations';
      let styleEl = document.getElementById(existingStyleId);
      
      // Create a new style element if it doesn't exist
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = existingStyleId;
        styleEl.type = 'text/css';
        styleEl.innerHTML = `
          @keyframes priceFlash {
            0% { background-color: white; }
            30% { background-color: #fffde7; }
            100% { background-color: white; }
          }
          
          @keyframes valueChange {
            0% { opacity: 0.3; }
            50% { opacity: 1; }
            100% { opacity: 1; }
          }
          
          .price-update-flash {
            animation: priceFlash 1s;
          }
          
          .value-change-animation {
            animation: valueChange 0.5s;
          }
        `;
        document.head.appendChild(styleEl);
      }
      
      return () => {
        // Cleanup on component unmount - safely remove if exists
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      };
    }
  }, []);

  if (loading) {
    return (
      <Layout title="Experiment Preview">
        <div className="card">
          <h1>Loading Experiment...</h1>
          <p>Please wait while we prepare the experiment for you.</p>
        </div>
      </Layout>
    );
  }
  
  if (error || !experiment) {
    return (
      <Layout title="Error">
        <div className="card">
          <h1>Error</h1>
          <p>{error || 'Experiment not found'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${experiment.title}${isParticipating ? '' : ' - Preview'}`}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Participant Entry Form */}
        {isParticipating && showParticipantForm ? (
          <div className="card" style={{ 
            marginBottom: 'var(--spacing-md)',
            backgroundColor: 'var(--color-light)',
            padding: 'var(--spacing-md)'
          }}>
            <h1>{experiment.title} - Participant Registration</h1>
            <p style={{ marginBottom: 'var(--spacing-md)' }}>Please enter your information to start the experiment. All responses will be kept confidential.</p>
            
            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="form-label" htmlFor="email">Email Address <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="email"
                id="email"
                className="form-control"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <small style={{ color: 'var(--color-gray-dark)', marginTop: '4px', display: 'block' }}>
                Your email will be used as your participant ID
              </small>
            </div>
            
            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="form-label" htmlFor="code">Access Code (Optional)</label>
              <input
                type="text"
                id="code"
                className="form-control"
                value={participantCode}
                onChange={(e) => setParticipantCode(e.target.value)}
                placeholder="Enter access code (if provided)"
              />
              <small style={{ color: 'var(--color-gray-dark)', marginTop: '4px', display: 'block' }}>
                You can leave this blank if no code was provided
              </small>
            </div>
            
            <div style={{ 
              padding: 'var(--spacing-sm)',
              backgroundColor: 'var(--color-light)',
              borderRadius: 'var(--border-radius)',
              marginBottom: 'var(--spacing-md)',
              border: '1px solid var(--color-info)',
            }}>
              <p style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-sm)' }}>
                <strong>Important Information:</strong>
              </p>
              <ul style={{ fontSize: '0.9rem', paddingLeft: 'var(--spacing-md)' }}>
                <li>This experiment will take approximately {Math.ceil(scenarios.reduce((sum, s) => sum + (s.duration || 0), 0) / 60)} minutes to complete.</li>
                <li>You will be presented with {scenarios.length} scenario(s) followed by a brief survey.</li>
                <li>Please do not refresh the page during the experiment as your progress may be lost.</li>
                <li>By participating, you agree that your responses may be used for research purposes.</li>
              </ul>
            </div>
            
            <button 
              className="button success" 
              onClick={handleRegisterParticipant}
              style={{ 
                width: '100%',
                marginTop: 'var(--spacing-md)',
                padding: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
              disabled={!participantEmail}
            >
              Start Experiment
            </button>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
              <h1>{experiment.title}</h1>
              
              {!isParticipating && (
                <p>This is a preview of how participants will see the experiment.</p>
              )}
              
              {/* Progress bar */}
              <div style={{ 
                height: '6px', 
                backgroundColor: 'var(--color-gray)', 
                borderRadius: 'var(--border-radius)',
                margin: 'var(--spacing-md) 0' 
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${calculateProgress()}%`, 
                  backgroundColor: 'var(--color-success)',
                  borderRadius: 'var(--border-radius)',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.9rem',
                color: 'var(--color-gray-dark)'
              }}>
                <div>
                  Section: {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
                </div>
                <div>
                  Step {
                    currentSection === 'completed' 
                      ? 'Complete' 
                      : `${currentStep + 1} of ${
                          currentSection === 'intro' ? introScreens.length :
                          currentSection === 'scenario' ? scenarios.length :
                          currentSection === 'break' ? breakScreens.length :
                          surveyQuestions.length
                        }`
                  }
                </div>
              </div>
            </div>
            
            {/* Current step content */}
            {renderCurrentStep()}
            
            {/* Navigation buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              marginTop: 'var(--spacing-md)'
            }}>
              {currentSection !== 'completed' ? (
                <button 
                  className="button success" 
                  onClick={handleNext}
                  disabled={isNextDisabled()}
                  style={{ 
                    opacity: isNextDisabled() ? 0.7 : 1,
                    cursor: isNextDisabled() ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              ) : (
                <button 
                  className="button success" 
                  onClick={handleSubmit}
                >
                  Finish & Submit
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}