import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';
import ExperimentSections from '../../../components/ExperimentSections';

export default function EditExperiment() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [activeTab, setActiveTab] = useState('sections');
  
  // Main experiment data
  const [experimentData, setExperimentData] = useState({
    title: '',
    description: '',
    status: 'draft'
  });
  
  // Selected groups for the experiment
  const [selectedGroups, setSelectedGroups] = useState([]);
  
  useEffect(() => {
    if (id) {
      fetchExperimentData();
      fetchGroups();
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
      
      // Fetch assigned groups
      const { data: groupAssignments, error: groupsError } = await supabase
        .from('experiment_group_assignments')
        .select(`
          group_id,
          is_control_group,
          participant_groups (
            id,
            name
          )
        `)
        .eq('experiment_id', id)
        .eq('is_active', true);
      
      if (groupsError) throw groupsError;
      
      // Format groups for state
      const groups = (groupAssignments || []).map(assignment => ({
        id: assignment.group_id,
        name: assignment.participant_groups.name,
        is_control_group: assignment.is_control_group
      }));
      
      setSelectedGroups(groups);
      
    } catch (error) {
      console.error('Error fetching experiment data:', error);
      setError('Error loading experiment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch available participant groups
  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      
      const { data, error } = await supabase
        .from('participant_groups')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setAvailableGroups(data || []);
    } catch (error) {
      console.error('Error fetching participant groups:', error);
    } finally {
      setLoadingGroups(false);
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
  
  // Handle group selection
  const handleGroupSelect = (e) => {
    const groupId = e.target.value;
    if (groupId && !selectedGroups.some(g => g.id === groupId)) {
      const group = availableGroups.find(g => g.id === groupId);
      if (group) {
        setSelectedGroups([...selectedGroups, { 
          id: group.id, 
          name: group.name,
          is_control_group: false
        }]);
      }
    }
  };

  // Remove group from selection
  const handleRemoveGroup = (groupId) => {
    setSelectedGroups(selectedGroups.filter(g => g.id !== groupId));
  };

  // Toggle control group status
  const handleToggleControlGroup = (groupId) => {
    setSelectedGroups(selectedGroups.map(g => 
      g.id === groupId ? {...g, is_control_group: !g.is_control_group} : g
    ));
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
      
      // Update group assignments
      
      // 1. Deactivate all current assignments
      const { error: deactivateError } = await supabase
        .from('experiment_group_assignments')
        .update({ is_active: false })
        .eq('experiment_id', id);
      
      if (deactivateError) throw deactivateError;
      
      // 2. Add new assignments for selected groups
      if (selectedGroups.length > 0) {
        const groupAssignments = selectedGroups.map(group => ({
          experiment_id: id,
          group_id: group.id,
          is_control_group: group.is_control_group,
          is_active: true
        }));
        
        const { error: assignmentError } = await supabase
          .from('experiment_group_assignments')
          .insert(groupAssignments);
        
        if (assignmentError) throw assignmentError;
      }
      
      // Stay on the page but show success message
      setError(null);
      alert('Experiment updated successfully');
      
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
  
  // Tabs bar style
  const tabStyle = {
    display: 'flex',
    borderBottom: '1px solid var(--color-gray)',
    marginBottom: 'var(--spacing-md)'
  };
  
  const tabItemStyle = (isActive) => ({
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal',
    borderBottom: isActive ? '3px solid var(--color-primary)' : 'none',
    color: isActive ? 'var(--color-primary)' : 'inherit'
  });
  
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
        
        {/* Tabs navigation */}
        <div style={tabStyle}>
          <div 
            style={tabItemStyle(activeTab === 'basic')}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </div>
          <div 
            style={tabItemStyle(activeTab === 'sections')}
            onClick={() => setActiveTab('sections')}
          >
            Experiment Sections
          </div>
        </div>
        
        {/* Basic info tab */}
        {activeTab === 'basic' && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
              {/* Left side - Experiment Info */}
              <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Experiment Info</h2>
                
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
              </div>
              
              {/* Right side - Participant Groups */}
              <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Participant Groups</h2>
                
                {loadingGroups ? (
                  <p>Loading available groups...</p>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="groupSelect">Add Group</label>
                      <select
                        id="groupSelect"
                        className="form-control"
                        onChange={handleGroupSelect}
                        value=""
                      >
                        <option value="">Select a group to add...</option>
                        {availableGroups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                      <label className="form-label">Selected Groups</label>
                      {selectedGroups.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: 'var(--color-gray-dark)' }}>
                          No groups selected. Select groups from the dropdown above.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                          {selectedGroups.map(group => (
                            <div 
                              key={group.id}
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'white',
                                borderRadius: 'var(--border-radius)',
                                border: '1px solid var(--color-gray)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <span>{group.name}</span>
                                {group.is_control_group && (
                                  <span 
                                    style={{ 
                                      backgroundColor: 'var(--color-warning)',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '10px',
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    Control
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button 
                                  type="button" 
                                  className="button"
                                  style={{ 
                                    padding: '2px 6px', 
                                    fontSize: '0.8rem',
                                    backgroundColor: group.is_control_group ? 'var(--color-gray)' : 'var(--color-warning)'
                                  }}
                                  onClick={() => handleToggleControlGroup(group.id)}
                                >
                                  {group.is_control_group ? 'Remove Control' : 'Set as Control'}
                                </button>
                                <button 
                                  type="button" 
                                  className="danger"
                                  style={{ padding: '2px 6px', fontSize: '0.8rem' }}
                                  onClick={() => handleRemoveGroup(group.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
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
        )}
        
        {/* Sections tab */}
        {activeTab === 'sections' && (
          <div>
            <ExperimentSections experimentId={id} compact={true} />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
              <Link href="/experiments" className="button">
                Back to Experiments
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}