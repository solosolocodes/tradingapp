import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function ViewGroup() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [group, setGroup] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  useEffect(() => {
    if (id) {
      fetchGroupData();
    }
  }, [id]);
  
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('participant_groups')
        .select('*')
        .eq('id', id)
        .single();
      
      if (groupError) throw groupError;
      
      if (!groupData) {
        router.push('/groups');
        return;
      }
      
      setGroup(groupData);
      
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', id)
        .order('created_at');
      
      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);
      
      // Fetch experiment assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('experiment_group_assignments')
        .select(`
          id, 
          assignment_date, 
          is_active, 
          participation_link,
          experiments (
            id, 
            title, 
            status
          )
        `)
        .eq('group_id', id);
      
      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);
      
    } catch (error) {
      console.error('Error fetching group data:', error);
      setError('Error loading group data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  async function handleDelete() {
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
          router.push('/groups');
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
  
  if (loading) {
    return (
      <Layout title="View Group">
        <div className="card">
          <h1>Group Details</h1>
          <p>Loading group data...</p>
        </div>
      </Layout>
    );
  }
  
  if (error || !group) {
    return (
      <Layout title="Error">
        <div className="card">
          <h1>Error</h1>
          <p>{error || 'Group not found'}</p>
          <Link href="/groups" className="button">
            Back to Groups
          </Link>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title={`Group: ${group.name}`}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{group.name}</h1>
            <p style={{ color: 'var(--color-gray-dark)', marginBottom: 'var(--spacing-sm)' }}>
              Created: {new Date(group.created_at).toLocaleDateString()}
            </p>
            
            <div style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              {getActiveStatusBadge(group.is_active)}
              <span style={{ marginLeft: 'var(--spacing-md)' }}>
                <strong>Members:</strong> {participants.length || 0}
              </span>
            </div>
            
            <p>{group.description}</p>
          </div>
          
          <div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Link 
                href={`/groups/${id}/edit`} 
                className="button" 
                style={{ backgroundColor: 'var(--color-warning)' }}
              >
                Edit Group
              </Link>
              <button 
                className="danger" 
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        
        {/* Participants section */}
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h2>Participants ({participants.length})</h2>
            <Link 
              href={`/groups/${id}/edit`} 
              className="button" 
              style={{ backgroundColor: 'var(--color-info)', padding: '3px 8px', fontSize: '0.9rem' }}
            >
              Manage Participants
            </Link>
          </div>
          
          {participants.length === 0 ? (
            <div className="card" style={{ backgroundColor: 'var(--color-light)', padding: 'var(--spacing-md)', textAlign: 'center' }}>
              <p>No participants in this group yet.</p>
              <Link 
                href={`/groups/${id}/edit`} 
                className="button" 
                style={{ marginTop: 'var(--spacing-sm)', backgroundColor: 'var(--color-success)' }}
              >
                Add Participants
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Telegram</th>
                    <th>Unique ID</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.id}>
                      <td>{participant.name || '-'}</td>
                      <td>{participant.email || '-'}</td>
                      <td>{participant.phone || '-'}</td>
                      <td>{participant.telegram_id || '-'}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {participant.unique_id}
                        </span>
                      </td>
                      <td>{participant.is_active ? 'Active' : 'Inactive'}</td>
                      <td>{new Date(participant.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Experiment Assignments */}
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h2>Experiment Assignments ({assignments.length})</h2>
            <Link 
              href="/experiments" 
              className="button" 
              style={{ backgroundColor: 'var(--color-info)', padding: '3px 8px', fontSize: '0.9rem' }}
            >
              Assign to Experiment
            </Link>
          </div>
          
          {assignments.length === 0 ? (
            <div className="card" style={{ backgroundColor: 'var(--color-light)', padding: 'var(--spacing-md)', textAlign: 'center' }}>
              <p>This group is not assigned to any experiments yet.</p>
              <Link 
                href="/experiments" 
                className="button" 
                style={{ marginTop: 'var(--spacing-sm)', backgroundColor: 'var(--color-success)' }}
              >
                Assign to Experiment
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Experiment</th>
                    <th>Status</th>
                    <th>Assigned Date</th>
                    <th>Participation Link</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <Link 
                          href={`/experiments/${assignment.experiments?.id}`}
                          style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
                        >
                          {assignment.experiments?.title || 'Unknown Experiment'}
                        </Link>
                      </td>
                      <td>{getActiveStatusBadge(assignment.is_active)}</td>
                      <td>{new Date(assignment.assignment_date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ 
                          padding: '3px 6px',
                          backgroundColor: 'var(--color-light)',
                          borderRadius: 'var(--border-radius)',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          overflowX: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px'
                        }}>
                          {assignment.participation_link || 'No link available'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
          <Link href="/groups" className="button">
            Back to Groups
          </Link>
        </div>
      </div>
    </Layout>
  );
}