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
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching wallets:', error);
        alert(`Error loading wallets: ${error.message}`);
      } else {
        console.log('Wallets fetched successfully:', data);
        setWallets(data || []);
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
              <div key={wallet.id} className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>{wallet.name}</h2>
                  <div>
                    <Link href={`/wallets/${wallet.id}`} className="button">
                      View
                    </Link>
                    <button 
                      className="danger" 
                      style={{ marginLeft: 'var(--spacing-sm)' }}
                      onClick={() => handleDelete(wallet.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {wallet.description && <p className="mt-1">{wallet.description}</p>}
                <p className="mt-2" style={{ color: 'var(--color-gray-dark)', fontSize: '0.9rem' }}>
                  Created: {new Date(wallet.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}