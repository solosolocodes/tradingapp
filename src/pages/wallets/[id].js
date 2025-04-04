import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';

export default function WalletDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'buy',
    crypto_symbol: '',
    amount: '',
    price_per_unit: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchWalletDetails();
      fetchTransactions();
    }
  }, [id]);

  async function fetchWalletDetails() {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching wallet:', error);
      } else {
        setWallet(data);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  }

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', id)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([
          { 
            wallet_id: id,
            transaction_type: formData.transaction_type,
            crypto_symbol: formData.crypto_symbol.toUpperCase(),
            amount: parseFloat(formData.amount),
            price_per_unit: parseFloat(formData.price_per_unit),
            transaction_date: formData.transaction_date,
            notes: formData.notes
          }
        ]);

      if (error) {
        console.error('Error creating transaction:', error);
        alert('Error creating transaction. Please try again.');
      } else {
        setFormData({
          transaction_type: 'buy',
          crypto_symbol: '',
          amount: '',
          price_per_unit: '',
          transaction_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        setShowForm(false);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error creating transaction. Please try again.');
    }
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting transaction:', error);
          alert('Error deleting transaction. Please try again.');
        } else {
          fetchTransactions();
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction. Please try again.');
      }
    }
  }

  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function calculateValue(amount, price) {
    return (amount * price).toFixed(2);
  }

  if (!id) {
    return <Layout><p>Loading...</p></Layout>;
  }

  return (
    <Layout title={wallet ? `${wallet.name} - Wallet` : 'Wallet Details'}>
      <div className="card">
        <Link href="/wallets" style={{ 
          display: 'inline-block', 
          marginBottom: 'var(--spacing-md)',
          color: 'var(--color-primary)'
        }}>
          ← Back to Wallets
        </Link>

        {wallet ? (
          <>
            <h1>{wallet.name}</h1>
            {wallet.description && <p className="mb-3">{wallet.description}</p>}
          </>
        ) : (
          <p>Loading wallet details...</p>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-md)'
        }}>
          <h2>Transactions</h2>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Transaction'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card mb-3">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="transaction_type">Type</label>
                <select
                  id="transaction_type"
                  name="transaction_type"
                  className="form-control"
                  value={formData.transaction_type}
                  onChange={handleChange}
                  required
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="crypto_symbol">Crypto Symbol</label>
                <input
                  type="text"
                  id="crypto_symbol"
                  name="crypto_symbol"
                  className="form-control"
                  value={formData.crypto_symbol}
                  onChange={handleChange}
                  placeholder="BTC, ETH, etc."
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="amount">Amount</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  className="form-control"
                  value={formData.amount}
                  onChange={handleChange}
                  step="any"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="price_per_unit">Price per Unit (USD)</label>
                <input
                  type="number"
                  id="price_per_unit"
                  name="price_per_unit"
                  className="form-control"
                  value={formData.price_per_unit}
                  onChange={handleChange}
                  step="any"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="transaction_date">Date</label>
              <input
                type="date"
                id="transaction_date"
                name="transaction_date"
                className="form-control"
                value={formData.transaction_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                className="form-control"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
              ></textarea>
            </div>

            <button type="submit" className="success">Save Transaction</button>
          </form>
        )}

        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p>No transactions found for this wallet.</p>
            <button onClick={() => setShowForm(true)} className="mt-2">
              Record Your First Transaction
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
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
                    <td className={tx.transaction_type === 'buy' ? 'buy' : 'sell'}>
                      {tx.transaction_type.toUpperCase()}
                    </td>
                    <td>{tx.crypto_symbol}</td>
                    <td>{tx.amount}</td>
                    <td>${tx.price_per_unit.toFixed(2)}</td>
                    <td>${calculateValue(tx.amount, tx.price_per_unit)}</td>
                    <td>{formatDate(tx.transaction_date)}</td>
                    <td>
                      <button 
                        className="danger" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                        onClick={() => handleDelete(tx.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}