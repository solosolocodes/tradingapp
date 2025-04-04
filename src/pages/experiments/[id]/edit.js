import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function EditExperiment() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Main experiment data
  const [experimentData, setExperimentData] = useState({
    title: '',
    description: '',
    status: 'draft'
  });
  
  useEffect(() => {
    if (id) {
      fetchExperimentData();
    }
  }, [id]);
  
  const fetchExperimentData = async () => {
    try {
      setLoading(true);
      
      // Fetch experiment details
      const { data: experimentData, error: experimentError } = await supabase
        .from('experiments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (experimentError) throw experimentError;
      
      if (!experimentData) {
        router.push('/experiments');
        return;
      }
      
      setExperimentData(experimentData);
      
    } catch (error) {
      console.error('Error fetching experiment data:', error);
      setError('Error loading experiment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setExperimentData({
      ...experimentData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Validate form
      if (!experimentData.title) {
        throw new Error('Experiment title is required');
      }
      
      // Update experiment in database
      const { error: experimentError } = await supabase
        .from('experiments')
        .update({
          title: experimentData.title,
          description: experimentData.description,
          status: experimentData.status,
        })
        .eq('id', id);
      
      if (experimentError) throw experimentError;
      
      // Redirect to experiments list
      router.push('/experiments');
      
    } catch (error) {
      console.error('Error updating experiment:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Layout title="Edit Experiment">
        <div className="card">
          <h1>Edit Experiment</h1>
          <p>Loading experiment data...</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="Edit Experiment">
      <div className="card">
        <h1>Edit Experiment</h1>
        <p className="mb-3">Update your experiment details</p>
        
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
            <label className="form-label" htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-control"
              value={experimentData.title || ''}
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
              value={experimentData.description || ''}
              onChange={handleChange}
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              className="form-control"
              value={experimentData.status || 'draft'}
              onChange={handleChange}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
            <button 
              type="submit" 
              className="button success" 
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/experiments" className="button" style={{ flex: 1, textAlign: 'center' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}