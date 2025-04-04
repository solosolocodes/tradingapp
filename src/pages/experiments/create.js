import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import supabase from '../../lib/supabase';

export default function CreateExperiment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Main experiment data
  const [experimentData, setExperimentData] = useState({
    title: '',
    description: '',
    status: 'draft'
  });

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setExperimentData({
      ...experimentData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate form
      if (!experimentData.title) {
        throw new Error('Experiment title is required');
      }
      
      // Create experiment in database
      const { data, error: insertError } = await supabase
        .from('experiments')
        .insert([{
          title: experimentData.title,
          description: experimentData.description,
          status: experimentData.status,
          scenario_count: 0,
          participant_count: 0,
        }])
        .select();
      
      if (insertError) throw insertError;
      
      // Redirect to experiments list
      router.push('/experiments');
      
    } catch (error) {
      console.error('Error creating experiment:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout title="Create Experiment">
      <div className="card">
        <h1>Create New Experiment</h1>
        <p className="mb-3">Create a basic experiment structure</p>
        
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
              value={experimentData.title}
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
              value={experimentData.description}
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
              value={experimentData.status}
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
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Experiment'}
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