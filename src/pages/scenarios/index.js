import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function Scenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [wallets, setWallets] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchScenarios();
  }, []);
  
  async function fetchScenarios() {
    try {
      setLoading(true);
      console.log('Fetching scenarios...');
      
      // Fetch scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('scenario_templates')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (scenariosError) {
        console.error('Error fetching scenarios:', scenariosError);
        alert(`Error loading scenarios: ${scenariosError.message}`);
        setLoading(false);
        return;
      }
      
      // Get all wallet IDs to fetch wallet names
      const walletIds = scenariosData
        .filter(s => s.wallet_id)
        .map(s => s.wallet_id);
      
      if (walletIds.length > 0) {
        const { data: walletsData, error: walletsError } = await supabase
          .from('wallets')
          .select('id, name')
          .in('id', walletIds);
          
        if (!walletsError && walletsData) {
          const walletMap = {};
          walletsData.forEach(wallet => {
            walletMap[wallet.id] = wallet.name;
          });
          setWallets(walletMap);
        }
      }
      
      // Fetch asset pricing information for each scenario
      const scenariosWithAssets = await Promise.all(
        scenariosData.map(async (scenario) => {
          const { data: assetData, error: assetError } = await supabase
            .from('scenario_asset_prices')
            .select('asset_symbol, asset_name, round_number, price')
            .eq('scenario_id', scenario.id)
            .order('asset_symbol')
            .order('round_number');
            
          if (assetError) {
            console.error(`Error fetching assets for scenario ${scenario.id}:`, assetError);
            return {
              ...scenario,
              assetPrices: []
            };
          }
          
          // Organize asset prices by round
          const assetsByRound = {};
          assetData.forEach(asset => {
            if (!assetsByRound[asset.round_number]) {
              assetsByRound[asset.round_number] = [];
            }
            assetsByRound[asset.round_number].push(asset);
          });
          
          return {
            ...scenario,
            assetPrices: assetData,
            assetsByRound
          };
        })
      );
      
      setScenarios(scenariosWithAssets);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      alert(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this scenario? This will also remove it from any experiments using this scenario.')) {
      try {
        const { error } = await supabase
          .from('scenario_templates')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error('Error deleting scenario:', error);
          alert(`Error deleting scenario: ${error.message}`);
        } else {
          fetchScenarios();
        }
      } catch (error) {
        console.error('Error deleting scenario:', error);
        alert('An unexpected error occurred');
      }
    }
  }
  
  function getStatusBadge(isActive) {
    let style = {
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: 'var(--border-radius)',
      fontSize: '0.75rem',
      fontWeight: '500'
    };
    
    return isActive 
      ? <span style={{...style, backgroundColor: 'var(--color-success)', color: 'white'}}>Active</span>
      : <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Inactive</span>;
  }

  return (
    <Layout title="Scenario Templates">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h1>Scenario Templates</h1>
          <Link href="/scenarios/create" className="button" style={{ backgroundColor: 'var(--color-success)' }}>
            Create Scenario
          </Link>
        </div>
        
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Create and manage scenario templates that can be reused across multiple experiments.
        </p>
        
        {loading ? (
          <p>Loading scenarios...</p>
        ) : scenarios.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
            <p className="mb-3">No scenario templates have been created yet.</p>
            <Link href="/scenarios/create" className="button" style={{ backgroundColor: 'var(--color-success)' }}>
              Create Your First Scenario
            </Link>
          </div>
        ) : (
          <div>
            {scenarios.map(scenario => (
              <div key={scenario.id} className="card" style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{scenario.title}</h3>
                      {getStatusBadge(scenario.is_active)}
                      {scenario.wallet_id && wallets[scenario.wallet_id] && (
                        <span style={{ 
                          backgroundColor: 'var(--color-primary)', 
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '0.75rem'
                        }}>
                          {wallets[scenario.wallet_id]}
                        </span>
                      )}
                      <span style={{ 
                        backgroundColor: 'var(--color-info)', 
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.75rem'
                      }}>
                        {scenario.rounds} rounds
                      </span>
                    </div>
                    
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}>{scenario.description}</p>
                    
                    {/* Asset Price Preview */}
                    {scenario.assetPrices && scenario.assetPrices.length > 0 && (
                      <div style={{ 
                        fontSize: '0.8rem', 
                        marginTop: '8px',
                        padding: '6px',
                        backgroundColor: 'var(--color-light)', 
                        borderRadius: 'var(--border-radius)',
                        overflowX: 'auto'
                      }}>
                        <table style={{ margin: 0, fontSize: '0.8rem', width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left' }}>Asset</th>
                              {Array.from({ length: scenario.rounds }, (_, i) => i + 1).map(round => (
                                <th key={round} style={{ textAlign: 'right' }}>Round {round}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Group assets by symbol and show prices for each round */}
                            {[...new Set(scenario.assetPrices.map(asset => asset.asset_symbol))].map(symbol => {
                              const assetName = scenario.assetPrices.find(a => a.asset_symbol === symbol)?.asset_name || symbol;
                              return (
                                <tr key={symbol}>
                                  <td style={{ fontWeight: 'bold' }}>{symbol} ({assetName})</td>
                                  {Array.from({ length: scenario.rounds }, (_, i) => i + 1).map(round => {
                                    const price = scenario.assetPrices.find(
                                      a => a.asset_symbol === symbol && a.round_number === round
                                    )?.price || '-';
                                    return (
                                      <td key={round} style={{ textAlign: 'right' }}>
                                        ${typeof price === 'number' ? price.toFixed(2) : price}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                      <Link href={`/scenarios/${scenario.id}`} className="button" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>
                        View
                      </Link>
                      <Link href={`/scenarios/${scenario.id}/edit`} className="button" style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-warning)' }}>
                        Edit
                      </Link>
                      <button 
                        className="danger" 
                        onClick={() => handleDelete(scenario.id)}
                        style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}