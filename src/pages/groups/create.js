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
  
  const [participants, setParticipants] = useState([
    { name: '', email: '', phone: '', telegram_id: '', unique_id: '', isNew: true }
  ]);
  
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
      { name: '', email: '', phone: '', telegram_id: '', unique_id: '', isNew: true }
    ]);
  };
  
  const removeParticipant = (index) => {
    const updatedParticipants = participants.filter((_, i) => i !== index);
    setParticipants(updatedParticipants);
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
      
      // Filter out empty participant entries
      const validParticipants = participants.filter(p => 
        p.name.trim() !== '' || p.email.trim() !== '' || p.unique_id.trim() !== ''
      );
      
      // We don't need to validate unique_id here as Supabase will 
      // generate them automatically using our SQL trigger if not provided
      
      // Create group in database
      const { data: groupData, error: groupError } = await supabase
        .from('participant_groups')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            member_count: validParticipants.length
          }
        ])
        .select();
      
      if (groupError) throw groupError;
      
      const groupId = groupData[0].id;
      
      // Add participants if there are any valid ones
      if (validParticipants.length > 0) {
        const { error: participantsError } = await supabase
          .from('participants')
          .insert(
            validParticipants.map(p => ({
              group_id: groupId,
              name: p.name,
              email: p.email,
              phone: p.phone,
              telegram_id: p.telegram_id,
              unique_id: p.unique_id || null,  // Will be auto-generated if null
              is_active: true
            }))
          );
        
        if (participantsError) throw participantsError;
      }
      
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
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Participants</h3>
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
              marginBottom: 'var(--spacing-md)'
            }}>
              {/* Header row */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1.5fr 1fr 1fr 0.8fr 40px', 
                gap: '8px',
                marginBottom: '5px',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}>
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Telegram</div>
                <div>ID (Auto)</div>
                <div></div>
              </div>
              
              {/* Participant rows */}
              {participants.map((participant, index) => (
                <div key={index} style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr 1fr 1fr 0.8fr 40px',
                  gap: '8px',
                  marginBottom: '5px'
                }}>
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="form-control"
                    style={{ padding: '5px', fontSize: '0.9rem' }}
                  />
                  
                  <input
                    type="email"
                    value={participant.email}
                    onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                    placeholder="Email"
                    className="form-control"
                    style={{ padding: '5px', fontSize: '0.9rem' }}
                  />
                  
                  <input
                    type="tel"
                    value={participant.phone || ''}
                    onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                    placeholder="Phone"
                    className="form-control"
                    style={{ padding: '5px', fontSize: '0.9rem' }}
                  />
                  
                  <input
                    type="text"
                    value={participant.telegram_id || ''}
                    onChange={(e) => handleParticipantChange(index, 'telegram_id', e.target.value)}
                    placeholder="@username"
                    className="form-control"
                    style={{ padding: '5px', fontSize: '0.9rem' }}
                  />
                  
                  <input
                    type="text"
                    value={participant.unique_id || ''}
                    onChange={(e) => handleParticipantChange(index, 'unique_id', e.target.value)}
                    placeholder="Auto"
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