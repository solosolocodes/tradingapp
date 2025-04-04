import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import supabase from '../../lib/supabase';

export default function CreateExperiment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  
  // Main experiment data
  const [experimentData, setExperimentData] = useState({
    title: '',
    description: '',
    status: 'draft'
  });

  // Selected groups for the experiment
  const [selectedGroups, setSelectedGroups] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

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

  // Create default sections for a new experiment
  const createDefaultSections = async (experimentId) => {
    try {
      const defaultSections = [
        // Welcome screen
        {
          type: 'info',
          title: 'Welcome to the Experiment',
          content: 'Thank you for participating in this experiment. Your responses will help us better understand economic decision-making.',
          order_index: 0
        },
        // Instructions screen
        {
          type: 'info',
          title: 'Instructions',
          content: 'In this experiment, you will be presented with several scenarios. In each scenario, you will need to make financial decisions based on the information provided. Take your time to consider each option carefully.',
          order_index: 1
        },
        // First scenario
        {
          type: 'scenario',
          order_index: 2
        },
        // Info screen before second scenario
        {
          type: 'info',
          title: 'Next Scenario',
          content: 'You have completed the first scenario. Let\'s move on to the next one. Remember, each scenario is independent of the others.',
          order_index: 3
        },
        // Second scenario
        {
          type: 'scenario',
          order_index: 4
        },
        // Info screen before third scenario
        {
          type: 'info',
          title: 'Final Scenario',
          content: 'You\'re doing great! This is the final scenario. After this, you will complete a short survey.',
          order_index: 5
        },
        // Third scenario
        {
          type: 'scenario',
          order_index: 6
        },
        // Survey
        {
          type: 'survey',
          is_demographic: true,
          order_index: 7
        }
      ];
      
      // Get default scenario template for use in scenarios
      const { data: scenarioTemplates, error: scenarioError } = await supabase
        .from('scenario_templates')
        .select('id, title, description, duration, option_template')
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (scenarioError) throw scenarioError;
      
      // If no scenario templates exist, create dummy ones
      let dummyScenarioIds = [];
      if (!scenarioTemplates || scenarioTemplates.length === 0) {
        const dummyScenarios = [
          {
            title: 'Investment Decision',
            description: 'Choose how to allocate your investment funds.',
            duration: 60,
            option_template: [
              { value: 'option_a', text: 'Invest in Stock A' },
              { value: 'option_b', text: 'Invest in Stock B' },
              { value: 'option_c', text: 'Keep funds in cash' }
            ]
          },
          {
            title: 'Market Timing',
            description: 'Decide when to enter or exit the market.',
            duration: 45,
            option_template: [
              { value: 'buy', text: 'Buy now' },
              { value: 'wait', text: 'Wait for a better entry point' },
              { value: 'sell', text: 'Sell current holdings' }
            ]
          },
          {
            title: 'Cryptocurrency Trade',
            description: 'Make a decision about your cryptocurrency holdings.',
            duration: 60,
            option_template: [
              { value: 'hold', text: 'Hold for long term' },
              { value: 'trade', text: 'Trade for short term gains' },
              { value: 'exit', text: 'Exit position completely' }
            ]
          }
        ];
        
        for (const scenario of dummyScenarios) {
          const { data: newTemplate, error: createError } = await supabase
            .from('scenario_templates')
            .insert(scenario)
            .select()
            .single();
            
          if (createError) throw createError;
          dummyScenarioIds.push(newTemplate.id);
        }
      }
      
      const availableTemplates = scenarioTemplates?.length > 0 
        ? scenarioTemplates 
        : dummyScenarioIds.map((id, index) => ({
            id,
            ...([
              {
                title: 'Investment Decision',
                description: 'Choose how to allocate your investment funds.',
                duration: 60,
                option_template: [
                  { value: 'option_a', text: 'Invest in Stock A' },
                  { value: 'option_b', text: 'Invest in Stock B' },
                  { value: 'option_c', text: 'Keep funds in cash' }
                ]
              },
              {
                title: 'Market Timing',
                description: 'Decide when to enter or exit the market.',
                duration: 45,
                option_template: [
                  { value: 'buy', text: 'Buy now' },
                  { value: 'wait', text: 'Wait for a better entry point' },
                  { value: 'sell', text: 'Sell current holdings' }
                ]
              },
              {
                title: 'Cryptocurrency Trade',
                description: 'Make a decision about your cryptocurrency holdings.',
                duration: 60,
                option_template: [
                  { value: 'hold', text: 'Hold for long term' },
                  { value: 'trade', text: 'Trade for short term gains' },
                  { value: 'exit', text: 'Exit position completely' }
                ]
              }
            ][index])
          }));
      
      // Insert each default section
      for (const section of defaultSections) {
        if (section.type === 'info') {
          await supabase
            .from('experiment_intro_screens')
            .insert({
              experiment_id: experimentId,
              title: section.title,
              content: section.content,
              order_index: section.order_index
            });
        } 
        else if (section.type === 'scenario') {
          // Use available templates
          const templateIndex = section.order_index % availableTemplates.length;
          const templateToUse = availableTemplates[templateIndex];
              
          await supabase
            .from('experiment_scenarios')
            .insert({
              experiment_id: experimentId,
              title: templateToUse.title,
              description: templateToUse.description,
              duration: templateToUse.duration,
              options: templateToUse.option_template || [],
              order_index: section.order_index
            });
        }
        else if (section.type === 'survey' && section.is_demographic) {
          const demographicQuestions = [
            {
              experiment_id: experimentId,
              question: 'What is your age?',
              type: 'number',
              options: null,
              order_index: section.order_index,
              is_demographic: true
            },
            {
              experiment_id: experimentId,
              question: 'What is your gender?',
              type: 'multiple_choice',
              options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
              order_index: section.order_index,
              is_demographic: true
            },
            {
              experiment_id: experimentId,
              question: 'What is your highest level of education?',
              type: 'multiple_choice',
              options: ['High School', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate', 'Other'],
              order_index: section.order_index,
              is_demographic: true
            },
            {
              experiment_id: experimentId,
              question: 'How experienced are you with investing?',
              type: 'multiple_choice',
              options: ['No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'],
              order_index: section.order_index,
              is_demographic: true
            },
            {
              experiment_id: experimentId,
              question: 'How experienced are you with cryptocurrency?',
              type: 'multiple_choice',
              options: ['No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'],
              order_index: section.order_index,
              is_demographic: true
            }
          ];
          
          await supabase
            .from('experiment_survey_questions')
            .insert(demographicQuestions);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error creating default sections:', error);
      throw error;
    }
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
          scenario_count: 3, // We'll add 3 scenarios
          participant_count: 0,
        }])
        .select();
      
      if (insertError) throw insertError;
      
      const experimentId = data[0].id;
      
      // Create group assignments if groups are selected
      if (selectedGroups.length > 0) {
        const groupAssignments = selectedGroups.map(group => ({
          experiment_id: experimentId,
          group_id: group.id,
          is_control_group: group.is_control_group,
          is_active: true
        }));
        
        const { error: assignmentError } = await supabase
          .from('experiment_group_assignments')
          .insert(groupAssignments);
        
        if (assignmentError) throw assignmentError;
      }
      
      // Create default sections
      await createDefaultSections(experimentId);
      
      // Redirect to experiment edit page with sections tab active
      router.push(`/experiments/${experimentId}/edit?tab=sections`);
      
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