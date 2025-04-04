import Layout from '../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

export default function Home() {
  const [stats, setStats] = useState({
    totalWallets: 0,
    totalAssets: 0,
    totalTransactions: 0,
    totalValue: 0,
    topAssets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get wallet count
        const { count: walletCount, error: walletError } = await supabase
          .from('wallets')
          .select('*', { count: 'exact', head: true });

        // Get transaction count
        const { count: txCount, error: txError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });
          
        // Get all assets to calculate total value and asset count
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('*');
          
        // Calculate totals
        let totalValue = 0;
        let totalAssets = 0;
        let topAssets = [];
        
        if (!assetsError && assetsData) {
          // Count non-zero assets
          totalAssets = assetsData.filter(a => a.amount > 0).length;
          
          // Calculate total value
          totalValue = assetsData.reduce((sum, asset) => {
            return sum + (asset.amount * asset.price_spot);
          }, 0);
          
          // Get top 3 assets by value (excluding USD)
          topAssets = assetsData
            .filter(a => a.asset_symbol !== 'USD' && a.amount > 0)
            .map(a => ({
              symbol: a.asset_symbol,
              name: a.name,
              value: a.amount * a.price_spot
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        }

        if (walletError || txError || assetsError) {
          console.error('Error fetching stats', walletError || txError || assetsError);
        } else {
          setStats({
            totalWallets: walletCount || 0,
            totalTransactions: txCount || 0,
            totalAssets,
            totalValue,
            topAssets
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <Layout title="TradingApp - Home">
      <div className="card">
        <h1 style={{ marginBottom: 'var(--spacing-md)', fontSize: '2rem' }}>Welcome to TradingApp</h1>
        <p style={{ marginBottom: 'var(--spacing-lg)' }}>
          A simple application to track your investments and run behavioral experiments.
        </p>

        {loading ? (
          <p>Loading stats...</p>
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-md)' }}>
              {/* Main Column */}
              <div>
                {/* Wallets Stats */}
                <div className="card mb-3" style={{ padding: 'var(--spacing-md)' }}>
                  <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.2rem' }}>Wallets</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-gray)' }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>Wallets:</span> {stats.totalWallets}
                    </div>
                    <Link href="/wallets" className="button" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>Manage</Link>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-gray)' }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>Assets:</span> {stats.totalAssets}
                    </div>
                    <span className="button" style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-gray)', cursor: 'default' }}>
                      {stats.totalAssets === 0 ? 'None' : `${stats.totalAssets}`}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-sm)' }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>Transactions:</span> {stats.totalTransactions}
                    </div>
                    <Link href="/transactions" className="button" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>View</Link>
                  </div>
                </div>
                
                {/* Trading Groups */}
                <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.2rem' }}>Trading Groups</h3>
                  <p style={{ fontSize: '0.9rem', margin: 0, marginBottom: 'var(--spacing-sm)' }}>Connect with other traders</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>Beginners Circle</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-gray-dark)' }}>12 members</p>
                    </div>
                    <button style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-info)' }}>Join</button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>Advanced Traders</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-gray-dark)' }}>8 members</p>
                    </div>
                    <button style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-info)' }}>Join</button>
                  </div>
                </div>
              </div>
              
              {/* Side Column */}
              <div>
                {/* Experiments */}
                <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)', marginBottom: 'var(--spacing-md)' }}>
                  <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.2rem' }}>Experiments</h3>
                  <p style={{ fontSize: '0.9rem', margin: 0, marginBottom: 'var(--spacing-md)' }}>Economics behavior scenarios</p>
                  
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <p style={{ margin: '3px 0', fontSize: '0.9rem' }}>Configure behavioral economics experiments with scenarios, intro screens, and surveys.</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <Link href="/experiments/create" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.9rem', backgroundColor: 'var(--color-success)' }}>
                      Create Experiment
                    </Link>
                    <Link href="/experiments" className="button" style={{ flex: 1, textAlign: 'center', padding: '5px 10px', fontSize: '0.9rem' }}>
                      View All
                    </Link>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                  <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.2rem' }}>Quick Actions</h3>
                  
                  <Link href="/wallets" className="button" style={{ display: 'block', width: '100%', textAlign: 'center', marginBottom: 'var(--spacing-sm)' }}>
                    Create Wallet
                  </Link>
                  
                  <Link href="/transactions" className="button" style={{ display: 'block', width: '100%', textAlign: 'center', backgroundColor: 'var(--color-success)' }}>
                    Add Transaction
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 text-center">
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-dark)' }}>TradingApp - Track investments and run behavioral experiments</p>
        </div>
      </div>
    </Layout>
  );
}