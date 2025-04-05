import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function ViewExperiment() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [introScreens, setIntroScreens] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [breakScreens, setBreakScreens] = useState([]);
  const [surveyQuestions, setSurveyQuestions] = useState([]);
  const [participantGroups, setParticipantGroups] = useState([]);
  const [wallets, setWallets] = useState({});
  
  useEffect(() => {
    if (id) {
      fetchExperimentData();
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
      
      setExperiment(experimentData);
      
      // Fetch intro screens
      const { data: introData, error: introError } = await supabase
        .from('experiment_intro_screens')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (introError) throw introError;
      setIntroScreens(introData || []);
      
      // Fetch scenarios with wallet_id
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('experiment_scenarios')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (scenariosError) throw scenariosError;
      setScenarios(scenariosData || []);
      
      // Get wallet IDs to fetch wallet names
      const walletIds = scenariosData
        .filter(s => s.wallet_id)
        .map(s => s.wallet_id);
      
      if (walletIds.length > 0) {
        const { data: walletsData, error: walletsError } = await supabase
          .from('wallets')
          .select('id, name')
          .in('id', walletIds);
        
        if (!walletsError && walletsData) {
          const walletMap = {};
          walletsData.forEach(wallet => {
            walletMap[wallet.id] = wallet.name;
          });
          setWallets(walletMap);
        }
      }
      
      // Fetch participant groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('experiment_group_assignments')
        .select(`
          group_id,
          is_control_group,
          participant_groups (
            id,
            name,
            member_count
          )
        `)
        .eq('experiment_id', id)
        .eq('is_active', true);
        
      if (!groupsError && groupsData) {
        const groups = groupsData.map(assignment => ({
          ...assignment.participant_groups,
          is_control_group: assignment.is_control_group
        }));
        setParticipantGroups(groups);
      }
      
      // Fetch break screens
      const { data: breaksData, error: breaksError } = await supabase
        .from('experiment_break_screens')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (breaksError) throw breaksError;
      setBreakScreens(breaksData || []);
      
      // Fetch survey questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('experiment_survey_questions')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (questionsError) throw questionsError;
      setSurveyQuestions(questionsData || []);
      
    } catch (error) {
      console.error('Error fetching experiment data:', error);
      setError('Error loading experiment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
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
  
  async function handleDelete() {
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
          router.push('/experiments');
        }
      } catch (error) {
        console.error('Error deleting experiment:', error);
        alert('An unexpected error occurred');
      }
    }
  }
  
  async function handleStatusChange(newStatus) {
    try {
      const { error } = await supabase
        .from('experiments')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) {
        console.error('Error updating experiment status:', error);
        alert(`Error updating status: ${error.message}`);
      } else {
        // Refresh data
        fetchExperimentData();
      }
    } catch (error) {
      console.error('Error updating experiment status:', error);
      alert('An unexpected error occurred');
    }
  }
  
  if (loading) {
    return (
      <Layout title="View Experiment">
        <div className="card">
          <h1>Experiment Details</h1>
          <p>Loading experiment data...</p>
        </div>
      </Layout>
    );
  }
  
  if (error || !experiment) {
    return (
      <Layout title="Error">
        <div className="card">
          <h1>Error</h1>
          <p>{error || 'Experiment not found'}</p>
          <Link href="/experiments" className="button">
            Back to Experiments
          </Link>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title={experiment.title}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{experiment.title}</h1>
            <p style={{ color: 'var(--color-gray-dark)', marginBottom: 'var(--spacing-sm)' }}>
              Created: {new Date(experiment.created_at).toLocaleDateString()}
            </p>
            
            <div style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              {getStatusBadge(experiment.status)}
              <span style={{ marginLeft: 'var(--spacing-md)' }}>
                <strong>Scenarios:</strong> {scenarios.length || 0}
              </span>
              <span style={{ marginLeft: 'var(--spacing-md)' }}>
                <strong>Participants:</strong> {experiment.participant_count || 0}
              </span>
            </div>
            
            <p>{experiment.description}</p>
            
            {/* Participant Groups */}
            {participantGroups.length > 0 && (
              <div className="card" style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.1rem' }}>
                  Participant Groups ({participantGroups.length})
                </h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {participantGroups.map(group => (
                    <div 
                      key={group.id}
                      style={{ 
                        padding: '10px', 
                        borderRadius: 'var(--border-radius)',
                        border: '1px solid var(--color-gray)',
                        backgroundColor: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: '150px'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        marginBottom: '5px'
                      }}>
                        <span style={{ fontWeight: 'bold' }}>{group.name}</span>
                        {group.is_control_group && (
                          <span 
                            title="Control Group"
                            style={{ 
                              backgroundColor: 'var(--color-warning)',
                              color: 'white',
                              padding: '1px 5px',
                              borderRadius: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}
                          >
                            Control
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        <strong>{group.member_count || 0}</strong> members
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Link 
                href={`/experiments/${id}/edit`} 
                className="button" 
                style={{ backgroundColor: 'var(--color-warning)' }}
              >
                Edit
              </Link>
              <button 
                className="danger" 
                onClick={handleDelete}
              >
                Delete
              </button>
              <Link 
                href={`/experiments/${id}/preview`} 
                className="button" 
                style={{ backgroundColor: 'var(--color-info)' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Preview
              </Link>
            </div>
            
            {experiment.status === 'active' && (
              <>
                <Link 
                  href={`/experiments/${id}/results`} 
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
                
                <Link 
                  href={`/experiments/${id}/preview?participate=true`} 
                  className="button" 
                  style={{ 
                    display: 'block', 
                    marginTop: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-success)',
                    color: 'white',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    padding: '15px 0',
                    fontSize: '1.2rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    border: '2px solid var(--color-success-dark, #2e7d32)'
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DO EXPERIMENT
                </Link>
              </>
            )}
            
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              {experiment.status === 'draft' && (
                <button 
                  className="button success" 
                  style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                  onClick={() => handleStatusChange('active')}
                >
                  Activate Experiment
                </button>
              )}
              
              {experiment.status === 'active' && (
                <button 
                  className="button" 
                  style={{ width: '100%', marginBottom: 'var(--spacing-sm)', backgroundColor: 'var(--color-info)' }}
                  onClick={() => handleStatusChange('completed')}
                >
                  Mark as Completed
                </button>
              )}
              
              {experiment.status === 'completed' && (
                <button 
                  className="button warning" 
                  style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                  onClick={() => handleStatusChange('active')}
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <h2>Experiment Flow</h2>
            <p className="mb-2">This is the sequence participants will experience:</p>
            
            <ol style={{ marginLeft: 'var(--spacing-md)', lineHeight: '1.8' }}>
              {introScreens.length > 0 && (
                <li><strong>Introduction:</strong> {introScreens.length} intro screen(s)</li>
              )}
              
              {scenarios.map((scenario, index) => (
                <li key={index}>
                  <strong>Scenario {index + 1}:</strong> {scenario.title} 
                  {breakScreens[index] && (
                    <> followed by <strong>break</strong></>
                  )}
                </li>
              ))}
              
              <li><strong>Post-Experiment Survey:</strong> {surveyQuestions.length} question(s)</li>
            </ol>
          </div>
          
          {/* Intro Screens */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Intro Screens ({introScreens.length})</h2>
            
            {introScreens.length === 0 ? (
              <p>No intro screens defined.</p>
            ) : (
              introScreens.map((screen, index) => (
                <div key={index} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <h3>{screen.title}</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{screen.content}</p>
                </div>
              ))
            )}
          </div>
          
          {/* Scenarios */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Scenarios ({scenarios.length})</h2>
            
            {scenarios.length === 0 ? (
              <p>No scenarios defined.</p>
            ) : (
              scenarios.map((scenario, index) => (
                <div key={index} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3>{scenario.title}</h3>
                      {scenario.wallet_id && wallets[scenario.wallet_id] && (
                        <span
                          title="Assigned Wallet"
                          style={{ 
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.8rem'
                          }}
                        >
                          Wallet: {wallets[scenario.wallet_id]}
                        </span>
                      )}
                    </div>
                    <span style={{ 
                      backgroundColor: 'var(--color-gray-dark)', 
                      color: 'white', 
                      borderRadius: 'var(--border-radius)',
                      padding: '3px 8px',
                      fontSize: '0.8rem'
                    }}>
                      {scenario.duration} seconds
                    </span>
                  </div>
                  
                  <p style={{ marginTop: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    {scenario.description}
                  </p>
                  
                  <div>
                    <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Options:</h4>
                    {scenario.options && scenario.options.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {scenario.options.map((option, optionIndex) => (
                          <div key={optionIndex} style={{ 
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'white',
                            borderRadius: 'var(--border-radius)',
                            border: '1px solid var(--color-gray)'
                          }}>
                            <strong>{option.value}:</strong> {option.text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No options defined for this scenario.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Break Screens */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Break Screens ({breakScreens.length})</h2>
            
            {breakScreens.length === 0 ? (
              <p>No break screens defined.</p>
            ) : (
              breakScreens.map((screen, index) => (
                <div key={index} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <h3>{screen.title}</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{screen.content}</p>
                </div>
              ))
            )}
          </div>
          
          {/* Survey Questions */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Survey Questions ({surveyQuestions.length})</h2>
            
            {surveyQuestions.length === 0 ? (
              <p>No survey questions defined.</p>
            ) : (
              surveyQuestions.map((question, index) => (
                <div key={index} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                    <h3>Question {index + 1}</h3>
                    <span style={{ 
                      backgroundColor: 'var(--color-primary)', 
                      color: 'white', 
                      borderRadius: 'var(--border-radius)',
                      padding: '3px 8px',
                      fontSize: '0.8rem'
                    }}>
                      {question.type === 'multiple_choice' ? 'Multiple Choice' : 
                       question.type === 'text' ? 'Text Input' : 'Number Input'}
                    </span>
                  </div>
                  
                  <p style={{ marginBottom: 'var(--spacing-md)' }}>{question.question}</p>
                  
                  {question.type === 'multiple_choice' && question.options && (
                    <div>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Options:</h4>
                      <ul style={{ marginLeft: 'var(--spacing-md)' }}>
                        {question.options.map((option, optionIndex) => (
                          <li key={optionIndex} style={{ marginBottom: 'var(--spacing-sm)' }}>
                            {option}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
          <Link href="/experiments" className="button" style={{ paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
            Back to Experiments
          </Link>
        </div>
      </div>
    </Layout>
  );
}