import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchWallets();
  }, []);

  async function fetchWallets() {
    try {
      setLoading(true);
      console.log('Fetching wallets from Supabase...');
      
      // First fetch wallets
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (walletError) {
        console.error('Error fetching wallets:', walletError);
        alert(`Error loading wallets: ${walletError.message}`);
        setLoading(false);
        return;
      }
      
      // Now fetch assets for each wallet to calculate total values
      const walletIds = walletData.map(wallet => wallet.id);
      
      if (walletIds.length > 0) {
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .in('wallet_id', walletIds);
          
        if (assetsError) {
          console.error('Error fetching assets:', assetsError);
        } else {
          // Calculate total value for each wallet
          const walletsWithValues = walletData.map(wallet => {
            const walletAssets = assetsData.filter(asset => asset.wallet_id === wallet.id);
            const totalValue = walletAssets.reduce((sum, asset) => {
              return sum + (asset.amount * asset.price_spot);
            }, 0);
            
            return {
              ...wallet,
              totalValue,
              assetCount: walletAssets.length
            };
          });
          
          console.log('Wallets with values:', walletsWithValues);
          setWallets(walletsWithValues);
        }
      } else {
        setWallets([]);
      }
    } catch (error) {
      console.error('Unexpected error fetching wallets:', error);
      alert(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      // Add debugging
      console.log('Attempting to create wallet:', formData);
      
      // First check if we can connect to Supabase
      const { data: testData, error: testError } = await supabase
        .from('wallets')
        .select('count');
        
      if (testError) {
        console.error('Error connecting to Supabase:', testError);
        alert(`Database connection error: ${testError.message}`);
        return;
      }
      
      // Create the wallet with a generated UUID
      const { data, error } = await supabase
        .from('wallets')
        .insert([
          { 
            name: formData.name,
            description: formData.description || null,
            // We don't need to specify ID as it will be auto-generated
          }
        ])
        .select(); // Return the inserted data

      if (error) {
        console.error('Error creating wallet:', error);
        alert(`Error creating wallet: ${error.message}`);
      } else {
        console.log('Wallet created successfully:', data);
        setFormData({ name: '', description: '' });
        setShowForm(false);
        fetchWallets();
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      alert(`Unexpected error: ${error.message}`);
    }
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this wallet?')) {
      try {
        const { error } = await supabase
          .from('wallets')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting wallet:', error);
          alert('Error deleting wallet. Please try again.');
        } else {
          fetchWallets();
        }
      } catch (error) {
        console.error('Error deleting wallet:', error);
        alert('Error deleting wallet. Please try again.');
      }
    }
  }

  return (
    <Layout title="Manage Wallets">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h1>Manage Wallets</h1>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Wallet'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card mb-3">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Wallet Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                value={formData.description}
                onChange={handleChange}
                rows="3"
              ></textarea>
            </div>
            <button type="submit" className="success">Save Wallet</button>
          </form>
        )}

        {loading ? (
          <p>Loading wallets...</p>
        ) : wallets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p>No wallets found.</p>
            <button onClick={() => setShowForm(true)} className="mt-2">Create Your First Wallet</button>
          </div>
        ) : (
          <div>
            {wallets.map(wallet => (
              <div key={wallet.id} className="card" style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{wallet.name}</h3>
                    
                    {wallet.description && <p style={{ margin: '3px 0', fontSize: '0.85rem' }}>{wallet.description}</p>}
                    
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        ${wallet.totalValue ? wallet.totalValue.toFixed(2) : '0.00'}
                      </span>
                      <span style={{ color: 'var(--color-gray-dark)', fontSize: '0.8rem' }}>
                        {wallet.assetCount || 0} Assets
                      </span>
                      <span style={{ color: 'var(--color-gray-dark)', fontSize: '0.8rem' }}>
                        Created: {new Date(wallet.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <Link href={`/wallets/${wallet.id}`} className="button" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>
                      View
                    </Link>
                    <button 
                      className="danger" 
                      onClick={() => handleDelete(wallet.id)}
                      style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}