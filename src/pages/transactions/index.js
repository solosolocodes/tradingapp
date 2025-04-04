import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
        
        // Get unique wallet IDs
        const walletIds = [...new Set(data.map(tx => tx.wallet_id))];
        
        if (walletIds.length > 0) {
          fetchWalletNames(walletIds);
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  }

  async function fetchWalletNames(walletIds) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, name')
        .in('id', walletIds);

      if (error) {
        console.error('Error fetching wallet names:', error);
      } else {
        const walletMap = {};
        data.forEach(wallet => {
          walletMap[wallet.id] = wallet.name;
        });
        setWallets(walletMap);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching wallet names:', error);
      setLoading(false);
    }
  }

  function getWalletName(walletId) {
    return wallets[walletId] || 'Unknown Wallet';
  }

  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function calculateValue(amount, price) {
    return (amount * price).toFixed(2);
  }

  return (
    <Layout title="All Transactions">
      <div className="card">
        <h1 style={{ marginBottom: 'var(--spacing-lg)' }}>All Transactions</h1>

        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <p className="mb-3">No transactions found.</p>
            <Link href="/wallets" className="button">Go to Wallets</Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <p><strong>{transactions.length}</strong> Transactions Found</p>
            </div>
            
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Wallet</th>
                    <th>Type</th>
                    <th>Crypto</th>
                    <th>Amount</th>
                    <th>Price (USD)</th>
                    <th>Total Value</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        <Link href={`/wallets/${tx.wallet_id}`} style={{ textDecoration: 'underline' }}>
                          {getWalletName(tx.wallet_id)}
                        </Link>
                      </td>
                      <td className={tx.transaction_type === 'buy' ? 'buy' : 'sell'}>
                        {tx.transaction_type.toUpperCase()}
                      </td>
                      <td>{tx.crypto_symbol}</td>
                      <td>{tx.amount}</td>
                      <td>${tx.price_per_unit.toFixed(2)}</td>
                      <td>${calculateValue(tx.amount, tx.price_per_unit)}</td>
                      <td>{formatDate(tx.transaction_date)}</td>
                      <td>
                        <Link href={`/wallets/${tx.wallet_id}`} className="button" style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}>
                          View Wallet
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}