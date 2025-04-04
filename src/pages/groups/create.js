import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import supabase from '../../lib/supabase';

export default function CreateGroup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate form
      if (!formData.name) {
        throw new Error('Group name is required');
      }
      
      // Create group in database
      const { data, error: groupError } = await supabase
        .from('participant_groups')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            member_count: 0
          }
        ])
        .select();
      
      if (groupError) throw groupError;
      
      // Redirect to group list
      router.push('/groups');
      
    } catch (error) {
      console.error('Error creating group:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout title="Create Participant Group">
      <div className="card">
        <h1>Create New Participant Group</h1>
        <p className="mb-3">Create a group of participants for behavioral economics experiments</p>
        
        {error && (
          <div style={{ 
            backgroundColor: 'var(--color-danger)', 
            color: 'white', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--border-radius)',
            marginBottom: 'var(--spacing-md)'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Group Name</label>
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
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                style={{ marginRight: 'var(--spacing-sm)' }}
              />
              <label htmlFor="is_active">Group is active</label>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
            <button 
              type="submit" 
              className="button success" 
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
            <Link href="/groups" className="button" style={{ flex: 1, textAlign: 'center' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}