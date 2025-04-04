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
    <Layout title="Crypto Tracker - Home">
      <div className="card">
        <h1 style={{ marginBottom: 'var(--spacing-md)', fontSize: '2rem' }}>Welcome to Crypto Tracker</h1>
        <p style={{ marginBottom: 'var(--spacing-lg)' }}>
          A simple application to track your cryptocurrency investments.
        </p>

        {loading ? (
          <p>Loading stats...</p>
        ) : (
          <>
            <div className="card" style={{ margin: '0 0 var(--spacing-lg) 0', textAlign: 'center', backgroundColor: 'var(--color-primary)', color: 'white' }}>
              <h3 style={{ color: 'white' }}>Total Portfolio Value</h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>${stats.totalValue.toFixed(2)}</p>
            </div>
            
            {/* Wallet Section */}
            <div className="mb-4">
              <h3 className="mb-2">Your Portfolio</h3>
              <div className="card">
                <div className="grid grid-3">
                  <div style={{ textAlign: 'center' }}>
                    <h4>Wallets</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalWallets}</p>
                    <Link href="/wallets" className="button mt-2" style={{ padding: '5px 10px', fontSize: '0.9rem' }}>Manage Wallets</Link>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h4>Assets</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalAssets}</p>
                    <span className="button mt-2" style={{ padding: '5px 10px', fontSize: '0.9rem', backgroundColor: 'var(--color-gray)', cursor: 'default' }}>
                      {stats.totalAssets === 0 ? 'No Assets' : stats.totalAssets === 1 ? '1 Asset' : `${stats.totalAssets} Assets`}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h4>Transactions</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalTransactions}</p>
                    <Link href="/transactions" className="button mt-2" style={{ padding: '5px 10px', fontSize: '0.9rem' }}>View Transactions</Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Experiments Section */}
            <div className="mb-4">
              <h3 className="mb-2">Experiments</h3>
              <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
                <h4>Try New Features</h4>
                <p className="mb-2">Experimental features are in development and may change.</p>
                <div className="grid grid-2">
                  <div className="card" style={{ margin: 0 }}>
                    <h4>Price Alerts</h4>
                    <p>Set alerts for price changes</p>
                    <button className="mt-2" style={{ backgroundColor: 'var(--color-warning)' }}>Coming Soon</button>
                  </div>
                  <div className="card" style={{ margin: 0 }}>
                    <h4>Trading Simulator</h4>
                    <p>Practice trading strategies without risk</p>
                    <button className="mt-2" style={{ backgroundColor: 'var(--color-warning)' }}>Coming Soon</button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Groups Section */}
            <div className="mb-4">
              <h3 className="mb-2">Trading Groups</h3>
              <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
                <h4>Join the Community</h4>
                <p className="mb-2">Connect with other traders and share insights.</p>
                <div className="grid grid-2">
                  <div className="card" style={{ margin: 0 }}>
                    <h4>Beginners Circle</h4>
                    <p>Learn the basics of crypto trading</p>
                    <p className="mt-1" style={{ fontSize: '0.9rem', color: 'var(--color-gray-dark)' }}>12 members</p>
                    <button className="mt-2" style={{ backgroundColor: 'var(--color-info)' }}>Join Group</button>
                  </div>
                  <div className="card" style={{ margin: 0 }}>
                    <h4>Advanced Traders</h4>
                    <p>Discuss advanced trading strategies</p>
                    <p className="mt-1" style={{ fontSize: '0.9rem', color: 'var(--color-gray-dark)' }}>8 members</p>
                    <button className="mt-2" style={{ backgroundColor: 'var(--color-info)' }}>Join Group</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 text-center">
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-dark)' }}>Crypto Tracker Simple - Track your investments with ease</p>
        </div>
      </div>
    </Layout>
  );
}