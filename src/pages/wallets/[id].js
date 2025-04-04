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
  const [assetSortBy, setAssetSortBy] = useState('code'); // 'code', 'name', or 'amount'
  const [assetFilter, setAssetFilter] = useState('');
  
  // Transaction form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: '',
    transaction_type: 'buy',
    amount: '',
    price_per_unit: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Asset form state
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetFormData, setAssetFormData] = useState({
    asset_symbol: '',
    name: '',
    price_spot: '',
    amount: '',
    is_reference: false
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
        .from('trading_wallets')
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
        .from('trading_assets')
        .select('*')
        .eq('wallet_id', id)
        .order('is_reference', { ascending: false })
        .order('asset_code');

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
        .from('trading_transactions')
        .select(`
          *,
          trading_assets(asset_code, name)
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
        .from('trading_assets')
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
        .from('trading_transactions')
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
        .from('trading_assets')
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
  
  // Handle asset form change
  function handleAssetFormChange(e) {
    const { name, value, type } = e.target;
    setAssetFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  }
  
  // Reset asset form
  function resetAssetForm() {
    setAssetFormData({
      asset_code: '',
      name: '',
      price_spot: '',
      amount: '',
      is_reference: false
    });
    setShowAssetForm(false);
    setEditingAsset(null);
  }
  
  // Handle asset edit button click
  function handleEditAsset(asset) {
    setEditingAsset(asset);
    setAssetFormData({
      asset_code: asset.asset_code,
      name: asset.name,
      price_spot: asset.price_spot,
      amount: asset.amount,
      is_reference: asset.is_reference
    });
    setShowAssetForm(true);
  }
  
  // Handle asset form submission (create or update)
  async function handleAssetSubmit(e) {
    e.preventDefault();
    
    try {
      if (editingAsset) {
        // Update existing asset
        console.log('Updating asset:', editingAsset.id, assetFormData);
        
        const { error } = await supabase
          .from('trading_assets')
          .update({
            asset_code: assetFormData.asset_code.toUpperCase(),
            name: assetFormData.name,
            price_spot: assetFormData.price_spot,
            amount: assetFormData.amount,
            is_reference: assetFormData.is_reference,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAsset.id);
          
        if (error) {
          console.error('Error updating asset:', error);
          alert(`Error updating asset: ${error.message}`);
          return;
        }
        
        alert('Asset updated successfully!');
      } else {
        // Check if asset with same symbol already exists in this wallet
        const { data: existingAssets, error: checkError } = await supabase
          .from('trading_assets')
          .select('id')
          .eq('wallet_id', id)
          .eq('asset_code', assetFormData.asset_code.toUpperCase());
          
        if (checkError) {
          console.error('Error checking existing assets:', checkError);
          alert(`Error: ${checkError.message}`);
          return;
        }
        
        if (existingAssets && existingAssets.length > 0) {
          alert(`An asset with code "${assetFormData.asset_code.toUpperCase()}" already exists in this wallet.`);
          return;
        }
        
        // Create new asset
        console.log('Creating new asset:', {
          wallet_id: id,
          ...assetFormData
        });
        
        const { error } = await supabase
          .from('trading_assets')
          .insert([{
            wallet_id: id,
            asset_code: assetFormData.asset_code.toUpperCase(),
            name: assetFormData.name,
            price_spot: assetFormData.price_spot,
            amount: assetFormData.amount,
            is_reference: assetFormData.is_reference,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (error) {
          console.error('Error creating asset:', error);
          alert(`Error creating asset: ${error.message}`);
          return;
        }
        
        alert('Asset created successfully!');
      }
      
      // Reset form and refresh assets
      resetAssetForm();
      fetchAssets();
      
    } catch (error) {
      console.error('Error in asset form submission:', error);
      alert(`Unexpected error: ${error.message}`);
    }
  }
  
  // Handle asset deletion
  async function handleDeleteAsset(assetId) {
    // First check if this asset has any transactions
    const { data: assetTransactions, error: txCheckError } = await supabase
      .from('trading_transactions')
      .select('id')
      .eq('asset_id', assetId);
      
    if (txCheckError) {
      console.error('Error checking transactions:', txCheckError);
      alert(`Error: ${txCheckError.message}`);
      return;
    }
    
    if (assetTransactions && assetTransactions.length > 0) {
      if (!confirm(`This asset has ${assetTransactions.length} transactions. Deleting it will also delete all associated transactions. Are you sure?`)) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this asset?')) {
        return;
      }
    }
    
    try {
      // Delete the asset (cascade will delete transactions)
      const { error } = await supabase
        .from('trading_assets')
        .delete()
        .eq('id', assetId);
        
      if (error) {
        console.error('Error deleting asset:', error);
        alert(`Error deleting asset: ${error.message}`);
        return;
      }
      
      alert('Asset and its transactions deleted successfully!');
      fetchAssets();
      fetchTransactions();
      
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert(`Unexpected error: ${error.message}`);
    }
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        // First get the transaction to know which asset to update
        const { data: txData, error: txError } = await supabase
          .from('trading_transactions')
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
          .from('trading_transactions')
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
  
  // Function to get filtered and sorted assets based on current preferences
  function getFilteredAndSortedAssets() {
    return [...assets]
      .filter(asset => {
        if (!assetFilter) return true;
        const searchTerm = assetFilter.toLowerCase();
        return asset.asset_code.toLowerCase().includes(searchTerm) || 
               asset.name.toLowerCase().includes(searchTerm);
      })
      .sort((a, b) => {
        if (assetSortBy === 'code') {
          return a.asset_code.localeCompare(b.asset_code);
        } else if (assetSortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else if (assetSortBy === 'amount') {
          return b.amount - a.amount; // Descending order for amount
        }
        return 0;
      });
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
            
            {/* Asset List Card */}
            {assets.length > 0 && (
              <div className="card" style={{ 
                marginTop: 'var(--spacing-md)', 
                marginBottom: 'var(--spacing-md)',
                backgroundColor: 'var(--color-light)',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--border-radius)'
              }}>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <h3 style={{ margin: 0, marginBottom: 'var(--spacing-sm)' }}>Assets in this Wallet</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
                      <input
                        type="text"
                        placeholder="Search assets..."
                        value={assetFilter}
                        onChange={(e) => setAssetFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--border-radius)',
                          fontSize: '0.9em'
                        }}
                      />
                      {assetFilter && (
                        <button
                          onClick={() => setAssetFilter('')}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9em',
                            color: 'var(--color-gray-dark)'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div>
                      <label style={{ marginRight: '8px', fontSize: '0.9em' }}>Sort by:</label>
                      <select 
                        value={assetSortBy} 
                        onChange={(e) => setAssetSortBy(e.target.value)}
                        style={{ padding: '3px 6px', fontSize: '0.9em' }}
                      >
                        <option value="code">Code</option>
                        <option value="name">Name</option>
                        <option value="amount">Amount</option>
                      </select>
                    </div>
                  </div>
                </div>
                {getFilteredAndSortedAssets().length === 0 && assetFilter ? (
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: 'white', 
                    borderRadius: 'var(--border-radius)',
                    textAlign: 'center'
                  }}>
                    No assets matching "{assetFilter}" found.
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '10px',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    {getFilteredAndSortedAssets().map(asset => (
                    <div key={asset.id} style={{ 
                      padding: '8px 12px',
                      backgroundColor: asset.is_reference ? 'var(--color-success-light)' : 'white',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      minWidth: '200px',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '1.1em', 
                          marginRight: '8px',
                          color: 'var(--color-primary)'
                        }}>
                          {asset.asset_code}
                        </div>
                        <div style={{ 
                          fontSize: '0.9em',
                          color: 'var(--color-text)'
                        }}>
                          {asset.name}
                        </div>
                      </div>
                      <div style={{
                        marginLeft: '15px',
                        fontSize: '0.85em',
                        backgroundColor: asset.amount > 0 ? 'var(--color-info-light)' : 'var(--color-gray-light)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                      }}>
                        {asset.amount > 0 ? asset.amount.toFixed(4) : '0'}
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p>Loading wallet details...</p>
        )}

        {/* Assets Section */}
        <div style={{ 
          marginTop: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h2 className="mb-2">Assets</h2>
            <button onClick={() => setShowAssetForm(!showAssetForm)}>
              {showAssetForm ? 'Cancel' : '+ Add Asset'}
            </button>
          </div>
          
          {/* Add/Edit Asset Form */}
          {showAssetForm && (
            <form onSubmit={handleAssetSubmit} className="card mb-3">
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="asset_code">Code</label>
                  <input
                    type="text"
                    id="asset_code"
                    name="asset_code"
                    className="form-control"
                    value={assetFormData.asset_code}
                    onChange={handleAssetFormChange}
                    required
                    placeholder="BTC, ETH, etc."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-control"
                    value={assetFormData.name}
                    onChange={handleAssetFormChange}
                    required
                    placeholder="Bitcoin, Ethereum, etc."
                  />
                </div>
              </div>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="price_spot">Spot Price (USD)</label>
                  <input
                    type="number"
                    id="price_spot"
                    name="price_spot"
                    className="form-control"
                    value={assetFormData.price_spot}
                    onChange={handleAssetFormChange}
                    step="any"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="amount">Initial Amount</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    className="form-control"
                    value={assetFormData.amount}
                    onChange={handleAssetFormChange}
                    step="any"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="is_reference">
                  <input
                    type="checkbox"
                    id="is_reference"
                    name="is_reference"
                    checked={assetFormData.is_reference}
                    onChange={(e) => setAssetFormData(prev => ({ ...prev, is_reference: e.target.checked }))}
                    style={{ marginRight: 'var(--spacing-sm)' }}
                  />
                  Reference Asset (e.g., stable currency)
                </label>
              </div>
              
              <button type="submit" className="success">
                {editingAsset ? 'Update Asset' : 'Add Asset'}
              </button>
              {editingAsset && (
                <button 
                  type="button" 
                  className="danger" 
                  style={{ marginLeft: 'var(--spacing-md)' }}
                  onClick={() => {
                    setEditingAsset(null);
                    resetAssetForm();
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          )}
          
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
                    <td><strong>{asset.asset_code}</strong></td>
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
                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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
                          Transaction
                        </button>
                        <button
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                          onClick={() => handleEditAsset(asset)}
                        >
                          Edit
                        </button>
                        <button
                          className="danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                          onClick={() => handleDeleteAsset(asset.id)}
                          disabled={asset.is_reference} 
                          title={asset.is_reference ? "Reference assets cannot be deleted" : ""}
                        >
                          Delete
                        </button>
                      </div>
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
                    <td>{tx.trading_assets?.asset_code || "Unknown"}</td>
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