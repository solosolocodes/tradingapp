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
      padding: '1px 4px',
      borderRadius: '8px',
      fontSize: '0.7rem',
      fontWeight: '500'
    };
    
    return isActive 
      ? <span style={{...style, backgroundColor: 'var(--color-success)', color: 'white'}}>Active</span>
      : <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Inactive</span>;
  }

  return (
    <Layout title="Scenario Templates">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Scenario Templates</h1>
          <Link href="/scenarios/create" className="button" style={{ backgroundColor: 'var(--color-success)', padding: '4px 8px', fontSize: '0.85rem' }}>
            + New Scenario
          </Link>
        </div>
        
        <p style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
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
              <div key={scenario.id} className="card" style={{ 
                marginBottom: '8px', 
                padding: '8px', 
                borderLeft: '3px solid var(--color-primary)',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '6px', alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>{scenario.title}</h3>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-dark)', fontFamily: 'monospace' }}>ID: {scenario.id}</span>
                      {getStatusBadge(scenario.is_active)}
                      {scenario.wallet_id && wallets[scenario.wallet_id] && (
                        <span style={{ 
                          backgroundColor: 'var(--color-primary)', 
                          color: 'white',
                          padding: '1px 4px',
                          borderRadius: '8px',
                          fontSize: '0.7rem'
                        }}>
                          {wallets[scenario.wallet_id]}
                        </span>
                      )}
                      <span style={{ 
                        backgroundColor: 'var(--color-info)', 
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '8px',
                        fontSize: '0.7rem'
                      }}>
                        {scenario.rounds} rounds
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', maxHeight: '2.4em', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {scenario.description}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-dark)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {new Date(scenario.created_at).toLocaleDateString()} {new Date(scenario.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    
                    {/* Asset Price Preview */}
                    {scenario.assetPrices && scenario.assetPrices.length > 0 && (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        marginTop: '4px',
                        padding: '4px',
                        backgroundColor: 'var(--color-light)', 
                        borderRadius: 'var(--border-radius)',
                        overflowX: 'auto'
                      }}>
                        <table style={{ margin: 0, fontSize: '0.75rem', width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '2px 4px' }}>Asset</th>
                              {Array.from({ length: scenario.rounds }, (_, i) => i + 1).map(round => (
                                <th key={round} style={{ textAlign: 'right', padding: '2px 4px' }}>R{round}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Group assets by symbol and show prices for each round */}
                            {[...new Set(scenario.assetPrices.map(asset => asset.asset_symbol))].map(symbol => {
                              const assetName = scenario.assetPrices.find(a => a.asset_symbol === symbol)?.asset_name || symbol;
                              return (
                                <tr key={symbol}>
                                  <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>{symbol}</td>
                                  {Array.from({ length: scenario.rounds }, (_, i) => i + 1).map(round => {
                                    const price = scenario.assetPrices.find(
                                      a => a.asset_symbol === symbol && a.round_number === round
                                    )?.price || '-';
                                    return (
                                      <td key={round} style={{ textAlign: 'right', padding: '2px 4px' }}>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'flex-end' }}>
                      <Link href={`/scenarios/${scenario.id}`} className="button" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                        View
                      </Link>
                      <Link href={`/scenarios/${scenario.id}/edit`} className="button" style={{ padding: '2px 6px', fontSize: '0.7rem', backgroundColor: 'var(--color-warning)' }}>
                        Edit
                      </Link>
                      <button 
                        className="danger" 
                        onClick={() => handleDelete(scenario.id)}
                        style={{ padding: '2px 6px', fontSize: '0.7rem' }}
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