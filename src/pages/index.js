import Layout from '../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

export default function Home() {
  const [stats, setStats] = useState({
    totalWallets: 0,
    totalAssets: 0,
    totalTransactions: 0,
    totalExperiments: 0,
    activeExperiments: 0,
    totalGroups: 0,
    totalParticipants: 0
  });
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          walletResult,
          txResult,
          assetResult,
          experimentResult,
          groupResult,
          participantResult,
          activeExperimentsResult
        ] = await Promise.all([
          // Wallets count
          supabase.from('wallets').select('*', { count: 'exact', head: true }),
          
          // Transactions count
          supabase.from('transactions').select('*', { count: 'exact', head: true }),
          
          // Assets
          supabase.from('assets').select('*'),
          
          // Experiments count
          supabase.from('experiments').select('*', { count: 'exact', head: true }),
          
          // Groups count
          supabase.from('participant_groups').select('*', { count: 'exact', head: true }),
          
          // Participants count
          supabase.from('participants').select('*', { count: 'exact', head: true }),
          
          // Active experiments
          supabase.from('experiments')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(5)
        ]);
        
        // Calculate asset stats
        let totalAssets = 0;
        if (!assetResult.error && assetResult.data) {
          totalAssets = assetResult.data.filter(a => a.amount > 0).length;
        }
        
        // Store active experiments
        if (!activeExperimentsResult.error) {
          setExperiments(activeExperimentsResult.data || []);
        }
        
        // Count active experiments
        let activeExperiments = 0;
        if (!experimentResult.error && experimentResult.data) {
          const { count: experimentActiveCount, error: experimentActiveError } = await supabase
            .from('experiments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
          
          if (!experimentActiveError) {
            activeExperiments = experimentActiveCount || 0;
          }
        }
        
        // Set all stats
        setStats({
          totalWallets: walletResult.count || 0,
          totalTransactions: txResult.count || 0,
          totalAssets,
          totalExperiments: experimentResult.count || 0,
          activeExperiments,
          totalGroups: groupResult.count || 0,
          totalParticipants: participantResult.count || 0
        });
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);
  
  function getStatusBadge(status) {
    let style = {
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: 'var(--border-radius)',
      fontSize: '0.75rem',
      fontWeight: '500'
    };
    
    switch(status) {
      case 'draft':
        return <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Draft</span>;
      case 'active':
        return <span style={{...style, backgroundColor: 'var(--color-success)', color: 'white'}}>Active</span>;
      case 'completed':
        return <span style={{...style, backgroundColor: 'var(--color-info)', color: 'white'}}>Completed</span>;
      default:
        return <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Unknown</span>;
    }
  }

  return (
    <Layout title="TradingApp - Home">
      <div className="card">
        <h1 style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1.8rem' }}>TradingApp Dashboard</h1>
        
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <>
            {/* Stats bar */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
              gap: '8px', 
              marginBottom: 'var(--spacing-md)',
              fontSize: '0.9rem'
            }}>
              <div className="card" style={{ margin: 0, padding: '10px', textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{stats.totalExperiments}</div>
                <div>Experiments</div>
              </div>
              <div className="card" style={{ margin: 0, padding: '10px', textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-success)' }}>{stats.activeExperiments}</div>
                <div>Active</div>
              </div>
              <div className="card" style={{ margin: 0, padding: '10px', textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{stats.totalGroups}</div>
                <div>Groups</div>
              </div>
              <div className="card" style={{ margin: 0, padding: '10px', textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{stats.totalParticipants}</div>
                <div>Participants</div>
              </div>
              <div className="card" style={{ margin: 0, padding: '10px', textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{stats.totalWallets}</div>
                <div>Wallets</div>
              </div>
              <div className="card" style={{ margin: 0, padding: '10px', textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{stats.totalAssets}</div>
                <div>Assets</div>
              </div>
              <div className="card" style={{ margin: 0, padding: '10px', textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{stats.totalTransactions}</div>
                <div>Transactions</div>
              </div>
            </div>
            
            {/* Active experiments */}
            {experiments.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Experiments</h3>
                  <Link href="/experiments" className="button" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>View All</Link>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ fontSize: '0.9rem', margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Scenarios</th>
                        <th>Participants</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experiments.map(exp => (
                        <tr key={exp.id}>
                          <td>
                            <Link href={`/experiments/${exp.id}`} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                              {exp.title}
                            </Link>
                          </td>
                          <td>{getStatusBadge(exp.status)}</td>
                          <td>{exp.scenario_count || 0}</td>
                          <td>{exp.participant_count || 0}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <Link href={`/experiments/${exp.id}/preview`} className="button" style={{ padding: '2px 5px', fontSize: '0.75rem' }} target="_blank">Preview</Link>
                              <Link href={`/experiments/${exp.id}/results`} className="button" style={{ padding: '2px 5px', fontSize: '0.75rem', backgroundColor: 'var(--color-info)' }}>Results</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Main sections */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 'var(--spacing-md)' 
            }}>
              {/* Experiments */}
              <div className="card" style={{ margin: 0, padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.1rem' }}>Experiments</h3>
                <p style={{ fontSize: '0.85rem', margin: 0, marginBottom: 'var(--spacing-sm)' }}>Economics behavior scenarios</p>
                
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                  <Link href="/experiments/create" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.85rem', backgroundColor: 'var(--color-success)' }}>
                    Create
                  </Link>
                  <Link href="/experiments" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.85rem' }}>
                    View All
                  </Link>
                </div>
              </div>
              
              {/* Wallets */}
              <div className="card" style={{ margin: 0, padding: 'var(--spacing-md)' }}>
                <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.1rem' }}>Wallets</h3>
                <p style={{ fontSize: '0.85rem', margin: 0, marginBottom: 'var(--spacing-sm)' }}>Track investments and assets</p>
                
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                  <Link href="/wallets/create" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.85rem', backgroundColor: 'var(--color-success)' }}>
                    Create
                  </Link>
                  <Link href="/wallets" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.85rem' }}>
                    View All
                  </Link>
                </div>
              </div>
              
              {/* Groups of Participants */}
              <div className="card" style={{ margin: 0, padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.1rem' }}>Participant Groups</h3>
                <p style={{ fontSize: '0.85rem', margin: 0, marginBottom: 'var(--spacing-sm)' }}>Manage experiment participants</p>
                
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                  <Link href="/groups/create" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.85rem', backgroundColor: 'var(--color-success)' }}>
                    Create
                  </Link>
                  <Link href="/groups" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.85rem' }}>
                    View All
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-3 text-center">
          <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-dark)', margin: '10px 0 0 0' }}>TradingApp - Track investments and run behavioral experiments</p>
        </div>
      </div>
    </Layout>
  );
}