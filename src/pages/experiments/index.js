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
              <div key={experiment.id} className="card" style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{experiment.title}</h3>
                      {getStatusBadge(experiment.status)}
                    </div>
                    
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}>{experiment.description}</p>
                    
                    <div style={{ fontSize: '0.8rem', display: 'flex', gap: '15px' }}>
                      <span style={{ color: 'var(--color-gray-dark)' }}>
                        Created: {new Date(experiment.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        <strong>Scenarios:</strong> {experiment.scenario_count || 0}
                      </span>
                      <span>
                        <strong>Participants:</strong> {experiment.participant_count || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                      <Link href={`/experiments/${experiment.id}`} className="button" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>
                        View
                      </Link>
                      <Link href={`/experiments/${experiment.id}/edit`} className="button" style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-warning)' }}>
                        Edit
                      </Link>
                      <button 
                        className="danger" 
                        onClick={() => handleDelete(experiment.id)}
                        style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                      <Link 
                        href={`/experiments/${experiment.id}/preview`} 
                        className="button" 
                        style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-info)' }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Preview
                      </Link>
                      {experiment.status === 'active' && (
                        <Link 
                          href={`/experiments/${experiment.id}/results`} 
                          className="button" 
                          style={{ 
                            padding: '3px 8px', 
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--color-primary)'
                          }}
                        >
                          Results
                        </Link>
                      )}
                    </div>
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