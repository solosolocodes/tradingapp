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
            
            <div className="grid grid-3 mb-3">
              <div className="card" style={{ margin: 0, textAlign: 'center' }}>
                <h3>Wallets</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalWallets}</p>
              </div>
              <div className="card" style={{ margin: 0, textAlign: 'center' }}>
                <h3>Assets</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalAssets}</p>
              </div>
              <div className="card" style={{ margin: 0, textAlign: 'center' }}>
                <h3>Transactions</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalTransactions}</p>
              </div>
            </div>
            
            {stats.topAssets.length > 0 && (
              <div className="mt-3 mb-4">
                <h3>Top Assets</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Name</th>
                      <th className="text-right">Value (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topAssets.map(asset => (
                      <tr key={asset.symbol}>
                        <td><strong>{asset.symbol}</strong></td>
                        <td>{asset.name}</td>
                        <td className="text-right">${asset.value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="mt-3">
          <Link href="/wallets" className="button">
            Manage Wallets
          </Link>
          <Link href="/transactions" className="button" style={{ marginLeft: 'var(--spacing-md)' }}>
            View Transactions
          </Link>
        </div>
      </div>
    </Layout>
  );
}