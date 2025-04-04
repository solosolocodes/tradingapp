import Layout from '../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

export default function Home() {
  const [stats, setStats] = useState({
    totalWallets: 0,
    totalTransactions: 0
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

        if (walletError || txError) {
          console.error('Error fetching stats', walletError || txError);
        } else {
          setStats({
            totalWallets: walletCount || 0,
            totalTransactions: txCount || 0
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
          <div className="grid grid-2 mb-3">
            <div className="card" style={{ margin: 0, textAlign: 'center' }}>
              <h3>Total Wallets</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalWallets}</p>
            </div>
            <div className="card" style={{ margin: 0, textAlign: 'center' }}>
              <h3>Total Transactions</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalTransactions}</p>
            </div>
          </div>
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