import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function EditGroup() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  
  const [participants, setParticipants] = useState([]);
  
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
      
      setFormData({
        name: groupData.name,
        description: groupData.description || '',
        is_active: groupData.is_active
      });
      
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('group_id', id)
        .order('created_at');
      
      if (participantsError) throw participantsError;
      
      if (participantsData && participantsData.length > 0) {
        setParticipants(participantsData);
      } else {
        // Add an empty row if there are no participants
        setParticipants([{ name: '', email: '', unique_id: '', isNew: true }]);
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
      setError('Error loading group data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      [field]: value
    };
    setParticipants(updatedParticipants);
  };
  
  const addParticipant = () => {
    setParticipants([
      ...participants,
      { name: '', email: '', unique_id: '', group_id: id, isNew: true }
    ]);
  };
  
  const removeParticipant = async (index) => {
    const participant = participants[index];
    
    // If it's an existing participant (has an ID), delete from database
    if (participant.id && !participant.isNew) {
      try {
        const { error } = await supabase
          .from('participants')
          .delete()
          .eq('id', participant.id);
          
        if (error) {
          console.error('Error deleting participant:', error);
          setError(`Error deleting participant: ${error.message}`);
          return;
        }
      } catch (error) {
        console.error('Error deleting participant:', error);
        setError('Unexpected error deleting participant');
        return;
      }
    }
    
    // Remove from state
    const updatedParticipants = participants.filter((_, i) => i !== index);
    setParticipants(updatedParticipants);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Validate form
      if (!formData.name) {
        throw new Error('Group name is required');
      }
      
      // Filter out empty participant entries
      const validParticipants = participants.filter(p => 
        p.name.trim() !== '' || p.email.trim() !== '' || p.unique_id.trim() !== ''
      );
      
      // Validate participant data
      validParticipants.forEach(p => {
        if (!p.unique_id) {
          throw new Error('All participants must have a unique ID');
        }
      });
      
      // Update group in database
      const { error: groupError } = await supabase
        .from('participant_groups')
        .update({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          updated_at: new Date(),
          member_count: validParticipants.length
        })
        .eq('id', id);
      
      if (groupError) throw groupError;
      
      // Handle participants - separate into new and existing
      const newParticipants = validParticipants
        .filter(p => p.isNew || !p.id)
        .map(p => ({
          group_id: id,
          name: p.name,
          email: p.email,
          unique_id: p.unique_id,
          is_active: true
        }));
      
      const existingParticipants = validParticipants
        .filter(p => !p.isNew && p.id)
        .map(p => ({
          id: p.id,
          group_id: id,
          name: p.name,
          email: p.email,
          unique_id: p.unique_id,
          is_active: true,
          updated_at: new Date()
        }));
      
      // Insert new participants
      if (newParticipants.length > 0) {
        const { error: newParticipantsError } = await supabase
          .from('participants')
          .insert(newParticipants);
        
        if (newParticipantsError) throw newParticipantsError;
      }
      
      // Update existing participants
      for (const participant of existingParticipants) {
        const { error: updateParticipantError } = await supabase
          .from('participants')
          .update({
            name: participant.name,
            email: participant.email,
            unique_id: participant.unique_id,
            is_active: participant.is_active,
            updated_at: participant.updated_at
          })
          .eq('id', participant.id);
        
        if (updateParticipantError) throw updateParticipantError;
      }
      
      // Redirect to group list
      router.push('/groups');
      
    } catch (error) {
      console.error('Error updating group:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Layout title="Edit Participant Group">
        <div className="card">
          <h1>Edit Participant Group</h1>
          <p>Loading group data...</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="Edit Participant Group">
      <div className="card">
        <h1>Edit Participant Group</h1>
        <p className="mb-3">Update participant group information and members</p>
        
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
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
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
            </div>
            
            <div>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    style={{ marginRight: 'var(--spacing-sm)', marginTop: '20px' }}
                  />
                  <label htmlFor="is_active" style={{ marginTop: '20px' }}>Group is active</label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              rows="2"
            />
          </div>
          
          {/* Participants section */}
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Participants ({participants.length})</h3>
              <button 
                type="button" 
                className="button success" 
                onClick={addParticipant}
                style={{ padding: '3px 8px', fontSize: '0.8rem' }}
              >
                Add Participant
              </button>
            </div>
            
            <div style={{ 
              border: '1px solid var(--color-gray)', 
              borderRadius: 'var(--border-radius)',
              padding: '10px',
              marginBottom: 'var(--spacing-md)',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {/* Header row */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1.5fr 1fr 40px', 
                gap: '8px',
                marginBottom: '5px',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                position: 'sticky',
                top: 0,
                backgroundColor: 'white',
                padding: '5px 0'
              }}>
                <div>Name</div>
                <div>Email</div>
                <div>Unique ID</div>
                <div></div>
              </div>
              
              {/* Participant rows */}
              {participants.map((participant, index) => (
                <div key={index} style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr 1fr 40px',
                  gap: '8px',
                  marginBottom: '5px'
                }}>
                  <input
                    type="text"
                    value={participant.name || ''}
                    onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="form-control"
                    style={{ padding: '5px', fontSize: '0.9rem' }}
                  />
                  
                  <input
                    type="email"
                    value={participant.email || ''}
                    onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                    placeholder="Email"
                    className="form-control"
                    style={{ padding: '5px', fontSize: '0.9rem' }}
                  />
                  
                  <input
                    type="text"
                    value={participant.unique_id || ''}
                    onChange={(e) => handleParticipantChange(index, 'unique_id', e.target.value)}
                    placeholder="ID"
                    className="form-control"
                    style={{ padding: '5px', fontSize: '0.9rem' }}
                  />
                  
                  <button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    className="button danger"
                    style={{ padding: '2px 5px', fontSize: '0.8rem' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
            <button 
              type="submit" 
              className="button success" 
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
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