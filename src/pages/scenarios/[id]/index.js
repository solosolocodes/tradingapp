import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function ViewScenario() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [assetPrices, setAssetPrices] = useState([]);
  const [walletName, setWalletName] = useState('');
  
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
      
      setScenario(scenarioData);
      
      // Fetch wallet name if wallet_id is present
      if (scenarioData.wallet_id) {
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('name')
          .eq('id', scenarioData.wallet_id)
          .single();
          
        if (!walletError && walletData) {
          setWalletName(walletData.name);
        }
      }
      
      // Fetch asset prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('scenario_asset_prices')
        .select('*')
        .eq('scenario_id', id)
        .order('asset_symbol')
        .order('round_number');
      
      if (pricesError) throw pricesError;
      setAssetPrices(pricesData || []);
      
    } catch (error) {
      console.error('Error fetching scenario data:', error);
      setError('Error loading scenario data. Please try again.');
    } finally {
      setLoading(false);
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
  
  if (loading) {
    return (
      <Layout title="View Scenario">
        <div className="card">
          <h1>Scenario Details</h1>
          <p>Loading scenario data...</p>
        </div>
      </Layout>
    );
  }
  
  if (!scenario) {
    return (
      <Layout title="View Scenario">
        <div className="card">
          <h1>Scenario Not Found</h1>
          <p>The requested scenario could not be found.</p>
          <Link href="/scenarios" className="button">
            Back to Scenarios
          </Link>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title={`Scenario: ${scenario.title}`}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h1>{scenario.title}</h1>
          <div>
            <Link href={`/scenarios/${id}/edit`} className="button" style={{ marginRight: 'var(--spacing-sm)', backgroundColor: 'var(--color-warning)' }}>
              Edit Scenario
            </Link>
            <Link href="/scenarios" className="button">
              Back to List
            </Link>
          </div>
        </div>
        
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
        
        <div className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <h2 style={{ margin: 0 }}>Scenario Details</h2>
            {getStatusBadge(scenario.is_active)}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <p><strong>Duration:</strong> {scenario.duration} seconds</p>
              <p><strong>Rounds:</strong> {scenario.rounds}</p>
              <p><strong>Created:</strong> {new Date(scenario.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p><strong>Wallet:</strong> {walletName || 'None'}</p>
              <p><strong>Status:</strong> {scenario.is_active ? 'Active' : 'Inactive'}</p>
              <p><strong>Last Updated:</strong> {new Date(scenario.updated_at).toLocaleString()}</p>
            </div>
          </div>
          
          {scenario.description && (
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <h3>Description</h3>
              <p>{scenario.description}</p>
            </div>
          )}
        </div>
        
        {/* Asset Prices by Round */}
        <div className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
          <h2>Asset Prices by Round</h2>
          
          {assetPrices.length === 0 ? (
            <p>No asset prices defined for this scenario.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Round</th>
                    {/* Asset symbols as column headers */}
                    {[...new Set(assetPrices.map(price => price.asset_symbol))].map(symbol => {
                      const assetName = assetPrices.find(p => p.asset_symbol === symbol)?.asset_name || symbol;
                      return (
                        <th key={symbol} style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 'bold' }}>{symbol}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{assetName}</div>
                        </th>
                      );
                    })}
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
                      {[...new Set(assetPrices.map(price => price.asset_symbol))].map(symbol => {
                        const price = assetPrices.find(
                          p => p.asset_symbol === symbol && p.round_number === round
                        )?.price || '-';
                        
                        return (
                          <td key={symbol} style={{ textAlign: 'center' }}>
                            ${typeof price === 'number' ? price.toFixed(2) : price}
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
        
        {/* Response Options */}
        <div className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
          <h2>Response Options</h2>
          
          {!scenario.option_template || scenario.option_template.length === 0 ? (
            <p>No response options defined for this scenario.</p>
          ) : (
            <table style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Option Text</th>
                  <th style={{ textAlign: 'left' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {scenario.option_template.map((option, index) => (
                  <tr key={index}>
                    <td>{option.text}</td>
                    <td>{option.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}