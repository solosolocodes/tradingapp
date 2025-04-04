import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function EditScenario() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Scenario data
  const [scenario, setScenario] = useState({
    title: '',
    description: '',
    round_duration: 10,
    wallet_id: '',
    rounds: 3,
    is_active: true
  });
  
  
  // Wallets available for selection
  const [availableWallets, setAvailableWallets] = useState([]);
  
  // Asset prices by round
  const [assetPrices, setAssetPrices] = useState([]);
  
  // Assets available based on selected wallet
  const [walletAssets, setWalletAssets] = useState([]);
  
  // Fetch wallets
  useEffect(() => {
    async function fetchWallets() {
      try {
        const { data, error } = await supabase
          .from('wallets')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        setAvailableWallets(data || []);
      } catch (error) {
        console.error('Error fetching wallets:', error);
        setError('Error loading wallets. Please try again.');
      }
    }
    
    fetchWallets();
  }, []);
  
  // Fetch scenario data
  useEffect(() => {
    if (id) {
      fetchScenarioData();
    }
  }, [id]);
  
  async function fetchScenarioData() {
    try {
      setLoading(true);
      console.log('Fetching scenario data for ID:', id);
      
      // Fetch scenario details
      const { data: scenarioData, error: scenarioError } = await supabase
        .from('scenario_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (scenarioError) throw scenarioError;
      
      if (!scenarioData) {
        router.push('/scenarios');
        return;
      }
      
      setScenario({
        title: scenarioData.title,
        description: scenarioData.description || '',
        round_duration: scenarioData.round_duration || 10,
        wallet_id: scenarioData.wallet_id || '',
        rounds: scenarioData.rounds,
        is_active: scenarioData.is_active
      });
      
      
      // Fetch asset prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('scenario_asset_prices')
        .select('*')
        .eq('scenario_id', id)
        .order('asset_symbol')
        .order('round_number');
      
      if (pricesError) throw pricesError;
      setAssetPrices(pricesData || []);
      
      // If we have a wallet ID, fetch the assets
      if (scenarioData.wallet_id) {
        await fetchWalletAssets(scenarioData.wallet_id);
      }
      
    } catch (error) {
      console.error('Error fetching scenario data:', error);
      setError('Error loading scenario data. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  // Fetch assets when wallet is selected
  async function fetchWalletAssets(walletId = scenario.wallet_id) {
    if (!walletId) {
      setWalletAssets([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, asset_symbol, name, price_spot')
        .eq('wallet_id', walletId);
        
      if (error) throw error;
      
      setWalletAssets(data || []);
    } catch (error) {
      console.error('Error fetching wallet assets:', error);
      setError('Error loading wallet assets. Please try again.');
    }
  }
  
  // Handle changes to scenario fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;
    
    // Convert numeric inputs to numbers
    if (type === 'number') {
      processedValue = parseInt(value, 10) || 0;
    }
    
    setScenario({
      ...scenario,
      [name]: type === 'checkbox' ? checked : processedValue
    });
    
    // If wallet_id changes, fetch assets for the new wallet
    if (name === 'wallet_id') {
      fetchWalletAssets(value);
    }
    
    // If rounds change, update asset prices
    if (name === 'rounds' && scenario.wallet_id) {
      updateAssetPricesForRoundChange(parseInt(value, 10) || 0);
    }
  };
  
  // Update asset prices when round count changes
  const updateAssetPricesForRoundChange = (newRounds) => {
    // Get unique assets from current prices
    const uniqueAssets = [...new Set(assetPrices.map(price => price.asset_symbol))];
    
    // Create new price array
    const newPrices = [];
    
    uniqueAssets.forEach(symbol => {
      const assetData = assetPrices.find(price => price.asset_symbol === symbol && price.round_number === 1);
      
      if (assetData) {
        for (let round = 1; round <= newRounds; round++) {
          // Find existing price for this round
          const existingPrice = assetPrices.find(
            price => price.asset_symbol === symbol && price.round_number === round
          );
          
          if (existingPrice) {
            // Use existing price if available
            newPrices.push(existingPrice);
          } else {
            // Create new price based on round 1 price
            const basePrice = assetPrices.find(
              price => price.asset_symbol === symbol && price.round_number === 1
            )?.price || 0;
            
            newPrices.push({
              asset_symbol: symbol,
              asset_name: assetData.asset_name,
              round_number: round,
              price: basePrice * (1 + (Math.random() * 0.2 - 0.1)) // Randomize a bit
            });
          }
        }
      }
    });
    
    setAssetPrices(newPrices);
  };
  
  
  // Handle change to asset prices
  const handlePriceChange = (assetSymbol, round, newPrice) => {
    const newPrices = assetPrices.map(price => {
      if (price.asset_symbol === assetSymbol && price.round_number === round) {
        return { ...price, price: newPrice };
      }
      return price;
    });
    
    setAssetPrices(newPrices);
  };
  
  // Generate CSV template for asset prices
  const generateCsvTemplate = () => {
    if (!scenario.wallet_id || walletAssets.length === 0) return;
    
    // Create CSV header row: Round, Asset1, Asset2, etc.
    let csvContent = "Round," + walletAssets.map(asset => `${asset.asset_symbol} (${asset.name})`).join(",") + "\n";
    
    // Add CSV format information
    csvContent += "# CSV Format: First column must be 'Round X' where X is the round number\n";
    csvContent += "# Asset columns must match the header format: 'SYMBOL (Name)'\n";
    csvContent += "# Price values must be numeric with optional decimal points (e.g., 45000 or 45000.50)\n\n";
    
    // Add rows for each round with current prices
    for (let round = 1; round <= scenario.rounds; round++) {
      let row = [`Round ${round}`];
      
      walletAssets.forEach(asset => {
        const price = assetPrices.find(
          p => p.asset_symbol === asset.asset_symbol && p.round_number === round
        )?.price || asset.price_spot;
        row.push(price);
      });
      
      csvContent += row.join(",") + "\n";
    }
    
    // Create the download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `scenario_prices_${scenario.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle CSV import
  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvData = event.target.result;
        const lines = csvData.split('\n');
        
        // Skip comment lines that start with #
        const dataLines = lines.filter(line => !line.trim().startsWith('#') && line.trim().length > 0);
        if (dataLines.length < 2) {
          alert('CSV file must contain a header row and at least one data row.');
          return;
        }
        
        // Parse the header to get asset positions
        const header = dataLines[0].split(',');
        const assetColumns = {};
        
        // Skip the first column (Round) and map assets to their column indices
        for (let i = 1; i < header.length; i++) {
          const assetHeader = header[i].trim();
          // Extract symbol from "SYMBOL (Name)" format
          const match = assetHeader.match(/^([A-Za-z0-9]+)\s*\(/);
          if (match && match[1]) {
            const symbol = match[1];
            assetColumns[symbol] = i;
          }
        }
        
        // Create new prices array
        const newPrices = [];
        
        // Process each row (starting from row 1, skipping header)
        for (let i = 1; i < dataLines.length; i++) {
          if (!dataLines[i].trim()) continue; // Skip empty lines
          
          const values = dataLines[i].split(',');
          const roundText = values[0].trim();
          const roundMatch = roundText.match(/Round\s*(\d+)/i);
          
          if (!roundMatch || !roundMatch[1]) continue;
          
          const round = parseInt(roundMatch[1], 10);
          if (isNaN(round) || round < 1 || round > scenario.rounds) continue;
          
          // Process each asset
          walletAssets.forEach(asset => {
            const symbol = asset.asset_symbol;
            if (typeof assetColumns[symbol] !== 'undefined') {
              const columnIndex = assetColumns[symbol];
              const priceValue = parseFloat(values[columnIndex]);
              
              if (!isNaN(priceValue) && priceValue >= 0) {
                newPrices.push({
                  asset_symbol: symbol,
                  asset_name: asset.name,
                  round_number: round,
                  price: priceValue
                });
              }
            }
          });
        }
        
        // Update prices if we have valid data
        if (newPrices.length > 0) {
          // First update local state
          setAssetPrices(newPrices);
          
          // Then save to database immediately
          setSaving(true);
          try {
            // Delete existing asset prices
            const { error: deleteError } = await supabase
              .from('scenario_asset_prices')
              .delete()
              .eq('scenario_id', id);
            
            if (deleteError) {
              throw deleteError;
            }
            
            // Insert updated asset prices
            const { error: pricesError } = await supabase
              .from('scenario_asset_prices')
              .insert(
                newPrices.map(price => ({
                  scenario_id: id,
                  asset_symbol: price.asset_symbol,
                  asset_name: price.asset_name,
                  round_number: price.round_number,
                  price: price.price
                }))
              );
            
            if (pricesError) {
              throw pricesError;
            }
            
            alert(`Successfully imported and saved ${newPrices.length} price points from CSV.`);
            // Refresh the prices from the database to ensure UI is in sync
            await refreshPrices();
          } catch (error) {
            console.error('Error saving imported prices:', error);
            alert(`Error saving imported prices: ${error.message}`);
            setSaving(false);
          }
        } else {
          alert('No valid price data found in the CSV. Please check the format and try again.');
        }
        
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the format and try again.');
      }
    };
    
    reader.onerror = () => {
      alert('Error reading the CSV file.');
    };
    
    reader.readAsText(file);
    
    // Reset the file input so the same file can be selected again
    e.target.value = null;
  };
  
  // Refresh asset prices from database
  const refreshPrices = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Fetch asset prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('scenario_asset_prices')
        .select('*')
        .eq('scenario_id', id)
        .order('asset_symbol')
        .order('round_number');
      
      if (pricesError) throw pricesError;
      
      // Only update state if we have data
      if (pricesData && pricesData.length > 0) {
        setAssetPrices(pricesData);
        console.log('Prices refreshed:', pricesData.length, 'price points');
      } else {
        console.log('No price data found in database');
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
      setError(`Error refreshing prices: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Validate form
      if (!scenario.title) {
        throw new Error('Scenario title is required');
      }
      
      if (!scenario.wallet_id) {
        throw new Error('Please select a wallet for this scenario');
      }
      
      if (scenario.rounds < 1) {
        throw new Error('Scenario must have at least 1 round');
      }
      
      
      // Update scenario in database
      const { error: scenarioError } = await supabase
        .from('scenario_templates')
        .update({
          title: scenario.title,
          description: scenario.description,
          round_duration: scenario.round_duration,
          wallet_id: scenario.wallet_id,
          rounds: scenario.rounds,
          option_template: [],
          is_active: scenario.is_active,
          updated_at: new Date()
        })
        .eq('id', id);
      
      if (scenarioError) throw scenarioError;
      
      // Delete existing asset prices
      const { error: deleteError } = await supabase
        .from('scenario_asset_prices')
        .delete()
        .eq('scenario_id', id);
      
      if (deleteError) throw deleteError;
      
      // Insert updated asset prices
      const { error: pricesError } = await supabase
        .from('scenario_asset_prices')
        .insert(
          assetPrices.map(price => ({
            scenario_id: id,
            asset_symbol: price.asset_symbol,
            asset_name: price.asset_name,
            round_number: price.round_number,
            price: price.price
          }))
        );
      
      if (pricesError) throw pricesError;
      
      // Redirect back to scenario view
      router.push(`/scenarios/${id}`);
      
    } catch (error) {
      console.error('Error updating scenario:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Layout title="Edit Scenario">
        <div className="card">
          <h1>Edit Scenario</h1>
          <p>Loading scenario data...</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title={`Edit Scenario: ${scenario.title}`}>
      <div className="card">
        <h1>Edit Scenario Template</h1>
        <p className="mb-3">Update your scenario template with asset prices for multiple rounds</p>
        
        {error && (
          <div style={{ 
            backgroundColor: 'var(--color-danger)', 
            color: 'white', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--border-radius)',
            marginBottom: 'var(--spacing-md)'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Grid for basic scenario details */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Scenario Title</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-control"
                value={scenario.title}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="round_duration">Duration per Round (seconds)</label>
              <input
                type="number"
                id="round_duration"
                name="round_duration"
                className="form-control"
                value={scenario.round_duration}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={scenario.description}
              onChange={handleChange}
              rows="2"
            />
          </div>
          
          {/* Grid for wallet and round selection */}
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="wallet_id">Select Wallet</label>
              <select
                id="wallet_id"
                name="wallet_id"
                className="form-control"
                value={scenario.wallet_id}
                onChange={handleChange}
                required
              >
                <option value="">-- Select a wallet --</option>
                {availableWallets.map(wallet => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="rounds">Number of Rounds</label>
              <input
                type="number"
                id="rounds"
                name="rounds"
                className="form-control"
                value={scenario.rounds}
                onChange={handleChange}
                min="1"
                max="10"
                required
              />
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: '25px' }}>
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={scenario.is_active}
                  onChange={handleChange}
                  style={{ marginRight: 'var(--spacing-sm)' }}
                />
                <label htmlFor="is_active">Active</label>
              </div>
            </div>
          </div>
          
          
          {/* Asset Prices */}
          {scenario.wallet_id && (
            <div className="card" style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  Asset Prices by Round
                </h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="button" 
                    style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-info)' }}
                    onClick={() => generateCsvTemplate()}
                    disabled={!scenario.wallet_id || walletAssets.length === 0 || saving}
                  >
                    Export Template CSV
                  </button>
                  <label 
                    className="button" 
                    style={{ 
                      padding: '3px 8px', 
                      fontSize: '0.8rem', 
                      backgroundColor: saving ? 'var(--color-gray)' : 'var(--color-primary)',
                      margin: 0, 
                      display: 'inline-block',
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Importing...' : 'Import CSV'}
                    <input
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={handleCsvImport}
                      disabled={!scenario.wallet_id || walletAssets.length === 0 || saving}
                    />
                  </label>
                  <button 
                    type="button" 
                    className="button" 
                    style={{ 
                      padding: '3px 8px', 
                      fontSize: '0.8rem', 
                      backgroundColor: 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={refreshPrices}
                    disabled={saving}
                  >
                    <span style={{ fontSize: '1rem' }}>↻</span> Refresh Prices
                  </button>
                  {saving && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginLeft: '5px' }}>
                      {saving ? 'Processing...' : ''}
                    </span>
                  )}
                </div>
              </div>
              
              {walletAssets.length === 0 ? (
                <p>No assets found in the selected wallet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Round</th>
                        {/* Asset symbols as column headers */}
                        {walletAssets.map(asset => (
                          <th key={asset.id} style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold' }}>{asset.asset_symbol}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{asset.name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Each row represents a round */}
                      {Array.from({ length: scenario.rounds }, (_, i) => i + 1).map(round => (
                        <tr key={round}>
                          <td style={{ 
                            fontWeight: 'bold', 
                            backgroundColor: 'var(--color-light)',
                            padding: '8px'
                          }}>
                            Round {round}
                          </td>
                          {/* Each cell is an asset price for this round */}
                          {walletAssets.map(asset => {
                            const price = assetPrices.find(
                              p => p.asset_symbol === asset.asset_symbol && p.round_number === round
                            )?.price || asset.price_spot;
                            
                            return (
                              <td key={asset.id} style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ marginRight: '5px' }}>$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => handlePriceChange(
                                      asset.asset_symbol, 
                                      round, 
                                      parseFloat(e.target.value) || 0
                                    )}
                                    className="form-control"
                                    style={{ 
                                      padding: '5px', 
                                      fontSize: '0.85rem',
                                      textAlign: 'right',
                                      width: '100px' 
                                    }}
                                    required
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* CSV Import Help Section */}
          {scenario.wallet_id && walletAssets.length > 0 && (
            <div style={{ 
              marginTop: 'var(--spacing-md)', 
              padding: 'var(--spacing-sm)',
              backgroundColor: 'var(--color-info-light)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.9rem'
            }}>
              <h4 style={{ margin: '0 0 5px 0' }}>CSV Template Format</h4>
              <p style={{ margin: '0 0 5px 0' }}>The CSV template should have the following format:</p>
              <ul style={{ margin: '0 0 5px 0', paddingLeft: '20px' }}>
                <li>First column titled "Round" with values like "Round 1", "Round 2", etc.</li>
                <li>Asset columns with headers formatted as "SYMBOL (Name)"</li>
                <li>Price values should be numeric (e.g., 45000 or 45000.50)</li>
              </ul>
              <p style={{ margin: '0' }}>You can export a template with the current values using the "Export Template CSV" button.</p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
            <button 
              type="submit" 
              className="button success" 
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={`/scenarios/${id}`} className="button" style={{ flex: 1, textAlign: 'center' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}