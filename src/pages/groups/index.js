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
              <div key={group.id} className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2>{group.name}</h2>
                    <p style={{ color: 'var(--color-gray-dark)', marginBottom: 'var(--spacing-sm)' }}>
                      Created: {new Date(group.created_at).toLocaleDateString()}
                    </p>
                    <p>{group.description}</p>
                    
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                      {getActiveStatusBadge(group.is_active)}
                      <span style={{ marginLeft: 'var(--spacing-md)' }}>
                        <strong>Members:</strong> {group.member_count || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      <Link href={`/groups/${group.id}`} className="button">
                        View
                      </Link>
                      <Link href={`/groups/${group.id}/edit`} className="button" style={{ backgroundColor: 'var(--color-warning)' }}>
                        Edit
                      </Link>
                      <button 
                        className="danger" 
                        onClick={() => handleDelete(group.id)}
                      >
                        Delete
                      </button>
                    </div>
                    
                    <Link 
                      href={`/groups/${group.id}/members`} 
                      className="button" 
                      style={{ 
                        display: 'block', 
                        marginTop: 'var(--spacing-sm)',
                        backgroundColor: 'var(--color-info)',
                        textAlign: 'center'
                      }}
                    >
                      Manage Members
                    </Link>
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