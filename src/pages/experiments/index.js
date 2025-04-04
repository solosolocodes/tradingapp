import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function Experiments() {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchExperiments();
  }, []);
  
  async function fetchExperiments() {
    try {
      setLoading(true);
      console.log('Fetching experiments...');
      
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching experiments:', error);
        alert(`Error loading experiments: ${error.message}`);
      } else {
        console.log('Experiments loaded:', data);
        setExperiments(data || []);
      }
    } catch (error) {
      console.error('Error fetching experiments:', error);
      alert(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this experiment? This will delete all associated scenarios, intros, and surveys.')) {
      try {
        const { error } = await supabase
          .from('experiments')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error('Error deleting experiment:', error);
          alert(`Error deleting experiment: ${error.message}`);
        } else {
          fetchExperiments();
        }
      } catch (error) {
        console.error('Error deleting experiment:', error);
        alert('An unexpected error occurred');
      }
    }
  }
  
  function getStatusBadge(status) {
    let style = {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 'var(--border-radius)',
      fontSize: '0.8rem',
      fontWeight: '500'
    };
    
    switch(status) {
      case 'draft':
        return <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Draft</span>;
      case 'active':
        return <span style={{...style, backgroundColor: 'var(--color-success)', color: 'white'}}>Active</span>;
      case 'completed':
        return <span style={{...style, backgroundColor: 'var(--color-info)', color: 'white'}}>Completed</span>;
      default:
        return <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Unknown</span>;
    }
  }

  return (
    <Layout title="Manage Experiments">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h1>Behavioral Economics Experiments</h1>
          <Link href="/experiments/create" className="button" style={{ backgroundColor: 'var(--color-success)' }}>
            Create Experiment
          </Link>
        </div>
        
        <p style={{ marginBottom: 'var(--spacing-lg)' }}>
          Configure experiments with multiple scenarios, intro screens, and follow-up surveys
          to test and analyze economic behavior.
        </p>
        
        {loading ? (
          <p>Loading experiments...</p>
        ) : experiments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
            <p className="mb-3">No experiments have been created yet.</p>
            <Link href="/experiments/create" className="button" style={{ backgroundColor: 'var(--color-success)' }}>
              Create Your First Experiment
            </Link>
          </div>
        ) : (
          <div>
            {experiments.map(experiment => (
              <div key={experiment.id} className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2>{experiment.title}</h2>
                    <p style={{ color: 'var(--color-gray-dark)', marginBottom: 'var(--spacing-sm)' }}>
                      Created: {new Date(experiment.created_at).toLocaleDateString()}
                    </p>
                    <p>{experiment.description}</p>
                    
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                      {getStatusBadge(experiment.status)}
                      <span style={{ marginLeft: 'var(--spacing-md)' }}>
                        <strong>Scenarios:</strong> {experiment.scenario_count || 0}
                      </span>
                      <span style={{ marginLeft: 'var(--spacing-md)' }}>
                        <strong>Participants:</strong> {experiment.participant_count || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      <Link href={`/experiments/${experiment.id}`} className="button">
                        View
                      </Link>
                      <Link href={`/experiments/${experiment.id}/edit`} className="button" style={{ backgroundColor: 'var(--color-warning)' }}>
                        Edit
                      </Link>
                      <button 
                        className="danger" 
                        onClick={() => handleDelete(experiment.id)}
                      >
                        Delete
                      </button>
                    </div>
                    
                    {experiment.status === 'active' && (
                      <Link 
                        href={`/experiments/${experiment.id}/results`} 
                        className="button" 
                        style={{ 
                          display: 'block', 
                          marginTop: 'var(--spacing-sm)',
                          backgroundColor: 'var(--color-info)',
                          textAlign: 'center'
                        }}
                      >
                        View Results
                      </Link>
                    )}
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