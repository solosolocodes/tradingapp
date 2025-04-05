import Layout from '../../components/Layout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchGroups();
  }, []);
  
  async function fetchGroups() {
    try {
      setLoading(true);
      console.log('Fetching participant groups...');
      
      const { data, error } = await supabase
        .from('participant_groups')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching groups:', error);
        alert(`Error loading groups: ${error.message}`);
      } else {
        console.log('Groups loaded:', data);
        setGroups(data || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      alert(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this group? This will delete all associated participants.')) {
      try {
        const { error } = await supabase
          .from('participant_groups')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error('Error deleting group:', error);
          alert(`Error deleting group: ${error.message}`);
        } else {
          fetchGroups();
        }
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('An unexpected error occurred');
      }
    }
  }
  
  function getActiveStatusBadge(isActive) {
    let style = {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 'var(--border-radius)',
      fontSize: '0.8rem',
      fontWeight: '500'
    };
    
    return isActive 
      ? <span style={{...style, backgroundColor: 'var(--color-success)', color: 'white'}}>Active</span>
      : <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Inactive</span>;
  }

  return (
    <Layout title="Manage Participant Groups">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h1>Participant Groups</h1>
          <Link href="/groups/create" className="button" style={{ backgroundColor: 'var(--color-success)' }}>
            Create Group
          </Link>
        </div>
        
        <p style={{ marginBottom: 'var(--spacing-lg)' }}>
          Create and manage groups of participants for your behavioral economics experiments.
        </p>
        
        {loading ? (
          <p>Loading groups...</p>
        ) : groups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--color-light)' }}>
            <p className="mb-3">No participant groups have been created yet.</p>
            <Link href="/groups/create" className="button" style={{ backgroundColor: 'var(--color-success)' }}>
              Create Your First Group
            </Link>
          </div>
        ) : (
          <div>
            {groups.map(group => (
              <div key={group.id} className="card" style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{group.name}</h3>
                      {getActiveStatusBadge(group.is_active)}
                      <span style={{ fontSize: '0.85rem' }}>
                        <strong>Members:</strong> {group.member_count || 0}
                      </span>
                    </div>
                    
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}>{group.description}</p>
                    
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-gray-dark)' }}>
                        Created: {new Date(group.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                      <Link href={`/groups/${group.id}`} className="button" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>
                        View
                      </Link>
                      <Link href={`/groups/${group.id}/edit`} className="button" style={{ padding: '3px 8px', fontSize: '0.8rem', backgroundColor: 'var(--color-warning)' }}>
                        Edit
                      </Link>
                      <button 
                        className="danger" 
                        onClick={() => handleDelete(group.id)}
                        style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                      <Link 
                        href={`/groups/${group.id}/edit`} 
                        className="button" 
                        style={{ 
                          padding: '3px 8px', 
                          fontSize: '0.8rem',
                          backgroundColor: 'var(--color-info)'
                        }}
                      >
                        Members
                      </Link>
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