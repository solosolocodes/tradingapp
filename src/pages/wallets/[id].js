import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';

export default function WalletDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [wallet, setWallet] = useState(null);
  const [assets, setAssets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: '',
    transaction_type: 'buy',
    amount: '',
    price_per_unit: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchWalletDetails();
      fetchAssets();
      fetchTransactions();
    }
  }, [id]);

  async function fetchWalletDetails() {
    try {
      console.log('Fetching wallet details for ID:', id);
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching wallet:', error);
        alert(`Error loading wallet: ${error.message}`);
      } else {
        console.log('Wallet data loaded:', data);
        setWallet(data);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  }

  async function fetchAssets() {
    try {
      console.log('Fetching assets for wallet ID:', id);
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('wallet_id', id)
        .order('is_reference', { ascending: false })
        .order('asset_symbol');

      if (error) {
        console.error('Error fetching assets:', error);
        alert(`Error loading assets: ${error.message}`);
      } else {
        console.log('Assets loaded:', data);
        setAssets(data || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  }

  async function fetchTransactions() {
    try {
      console.log('Fetching transactions for wallet ID:', id);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          assets(asset_symbol, name)
        `)
        .eq('wallet_id', id)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        alert(`Error loading transactions: ${error.message}`);
      } else {
        console.log('Transactions loaded:', data);
        setTransactions(data || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  }

  async function updateAssetAmount(assetId, amount, transactionType) {
    // Find the asset to update
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    // Calculate new amount based on transaction type
    const newAmount = transactionType === 'buy' 
      ? asset.amount + amount
      : asset.amount - amount;

    // Update the asset amount
    try {
      const { error } = await supabase
        .from('assets')
        .update({ amount: newAmount, updated_at: new Date().toISOString() })
        .eq('id', assetId);

      if (error) {
        console.error('Error updating asset amount:', error);
        alert(`Error updating asset amount: ${error.message}`);
      } else {
        // Refresh assets to show updated balances
        fetchAssets();
      }
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  }

  function handleChange(e) {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? parseFloat(value) : value
    }));

    // If asset changed, pre-fill price
    if (name === 'asset_id') {
      const selectedAsset = assets.find(a => a.id === value);
      if (selectedAsset) {
        setFormData(prevData => ({
          ...prevData,
          price_per_unit: selectedAsset.price_spot
        }));
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      console.log('Creating transaction with data:', {
        wallet_id: id,
        asset_id: formData.asset_id,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        price_per_unit: parseFloat(formData.price_per_unit),
        transaction_date: formData.transaction_date,
        notes: formData.notes
      });
      
      // First create the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ 
          wallet_id: id,
          asset_id: formData.asset_id,
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          price_per_unit: parseFloat(formData.price_per_unit),
          transaction_date: formData.transaction_date,
          notes: formData.notes || null
        }])
        .select();

      if (error) {
        console.error('Error creating transaction:', error);
        alert(`Error creating transaction: ${error.message}`);
      } else {
        console.log('Transaction created:', data);
        
        // Then update the asset amount
        await updateAssetAmount(
          formData.asset_id,
          parseFloat(formData.amount),
          formData.transaction_type
        );
        
        // Reset form and refresh data
        setFormData({
          asset_id: '',
          transaction_type: 'buy',
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
      alert(`Unexpected error: ${error.message}`);
    }
  }

  async function handleUpdateSpotPrice(assetId, newPrice) {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ 
          price_spot: newPrice,
          updated_at: new Date().toISOString() 
        })
        .eq('id', assetId);

      if (error) {
        console.error('Error updating spot price:', error);
        alert(`Error updating price: ${error.message}`);
      } else {
        fetchAssets();
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Unexpected error updating price');
    }
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        // First get the transaction to know which asset to update
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
          
        if (txError) {
          console.error('Error getting transaction for delete:', txError);
          alert(`Error: ${txError.message}`);
          return;
        }
        
        // Now delete the transaction
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting transaction:', error);
          alert(`Error deleting transaction: ${error.message}`);
        } else {
          // Update the asset amount (reverse the transaction)
          const reverseType = txData.transaction_type === 'buy' ? 'sell' : 'buy';
          await updateAssetAmount(
            txData.asset_id,
            txData.amount,
            reverseType
          );
          
          fetchTransactions();
        }
      } catch (error) {
        console.error('Error in delete process:', error);
        alert(`Unexpected error: ${error.message}`);
      }
    }
  }

  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function calculateTotalValue(amount, price) {
    return (amount * price).toFixed(2);
  }

  function calculateWalletTotal() {
    return assets.reduce((total, asset) => {
      return total + (asset.amount * asset.price_spot);
    }, 0).toFixed(2);
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
            <p className="mb-3">
              <strong>Total Value:</strong> ${calculateWalletTotal()}
            </p>
          </>
        ) : (
          <p>Loading wallet details...</p>
        )}

        {/* Assets Section */}
        <div style={{ 
          marginTop: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <h2 className="mb-2">Assets</h2>
          
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th className="text-right">Spot Price (USD)</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Total Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} style={asset.is_reference ? { backgroundColor: 'var(--color-light)' } : {}}>
                    <td><strong>{asset.asset_symbol}</strong></td>
                    <td>{asset.name}</td>
                    <td className="text-right">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span>${asset.price_spot.toFixed(2)}</span>
                        <input 
                          type="number" 
                          style={{ 
                            width: '100px', 
                            marginLeft: '8px',
                            padding: '2px 5px',
                            fontSize: '0.9rem'
                          }}
                          value={asset.price_spot}
                          min="0"
                          step="any"
                          onChange={(e) => handleUpdateSpotPrice(asset.id, parseFloat(e.target.value))}
                        />
                      </div>
                    </td>
                    <td className="text-right">{asset.amount.toFixed(4)}</td>
                    <td className="text-right">${calculateTotalValue(asset.amount, asset.price_spot)}</td>
                    <td>
                      <button
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            asset_id: asset.id,
                            price_per_unit: asset.price_spot
                          }));
                          setShowForm(true);
                        }}
                      >
                        Add Transaction
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-md)'
        }}>
          <h2>Transaction History</h2>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Transaction'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card mb-3">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="asset_id">Asset</label>
                <select
                  id="asset_id"
                  name="asset_id"
                  className="form-control"
                  value={formData.asset_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select an asset</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_symbol} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>
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
            <p>No transactions recorded for this wallet.</p>
            <button onClick={() => setShowForm(true)} className="mt-2">
              Record Your First Transaction
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Asset</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Price (USD)</th>
                  <th className="text-right">Total Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.transaction_date)}</td>
                    <td className={tx.transaction_type === 'buy' ? 'buy' : 'sell'}>
                      {tx.transaction_type.toUpperCase()}
                    </td>
                    <td>{tx.assets?.asset_symbol || "Unknown"}</td>
                    <td className="text-right">{tx.amount}</td>
                    <td className="text-right">${tx.price_per_unit.toFixed(2)}</td>
                    <td className="text-right">${calculateTotalValue(tx.amount, tx.price_per_unit)}</td>
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