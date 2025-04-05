import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function ExperimentResults() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [scenarioResponses, setScenarioResponses] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [surveyQuestions, setSurveyQuestions] = useState([]);
  
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
      
      // Fetch scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('experiment_scenarios')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (scenariosError) throw scenariosError;
      setScenarios(scenariosData || []);
      
      // Fetch survey questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('experiment_survey_questions')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (questionsError) throw questionsError;
      setSurveyQuestions(questionsData || []);
      
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('experiment_participants')
        .select('*')
        .eq('experiment_id', id)
        .order('created_at', { ascending: false });
      
      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);
      
      // Fetch scenario responses
      const { data: scenarioResponsesData, error: scenarioResponsesError } = await supabase
        .from('experiment_scenario_responses')
        .select('*')
        .eq('experiment_id', id);
      
      if (scenarioResponsesError) throw scenarioResponsesError;
      setScenarioResponses(scenarioResponsesData || []);
      
      // Fetch survey responses
      const { data: surveyResponsesData, error: surveyResponsesError } = await supabase
        .from('experiment_survey_responses')
        .select('*')
        .eq('experiment_id', id);
      
      if (surveyResponsesError) throw surveyResponsesError;
      setSurveyResponses(surveyResponsesData || []);
      
    } catch (error) {
      console.error('Error fetching experiment data:', error);
      setError('Error loading experiment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const calculateScenarioStats = (scenarioId) => {
    const scenarioData = scenarios.find(s => s.id === scenarioId);
    
    if (!scenarioData || !scenarioData.options) {
      return { options: [], total: 0 };
    }
    
    const responses = scenarioResponses.filter(r => r.scenario_id === scenarioId);
    const total = responses.length;
    
    const options = scenarioData.options.map(option => {
      const count = responses.filter(r => r.response === option.value).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      
      return {
        ...option,
        count,
        percentage
      };
    });
    
    const avgResponseTime = responses.length > 0 
      ? Math.round(responses.reduce((sum, r) => sum + (r.response_time || 0), 0) / responses.length) 
      : 0;
    
    return {
      options,
      total,
      avgResponseTime
    };
  };
  
  const calculateSurveyStats = (questionId) => {
    const questionData = surveyQuestions.find(q => q.id === questionId);
    
    if (!questionData) {
      return { type: 'unknown', data: [] };
    }
    
    const responses = surveyResponses.filter(r => r.question_id === questionId);
    const total = responses.length;
    
    if (questionData.type === 'multiple_choice' && questionData.options) {
      const optionCounts = {};
      
      // Initialize all options with 0 count
      questionData.options.forEach(option => {
        optionCounts[option] = 0;
      });
      
      // Count responses
      responses.forEach(response => {
        if (optionCounts[response.response] !== undefined) {
          optionCounts[response.response]++;
        }
      });
      
      // Format data for display
      const data = Object.entries(optionCounts).map(([option, count]) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return { option, count, percentage };
      });
      
      return {
        type: 'multiple_choice',
        data,
        total
      };
    } else if (questionData.type === 'number') {
      // Calculate statistics for number responses
      const values = responses
        .map(r => parseFloat(r.response))
        .filter(n => !isNaN(n));
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = values.length > 0 ? Math.round((sum / values.length) * 10) / 10 : 0;
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      
      return {
        type: 'number',
        data: { avg, min, max },
        total
      };
    } else {
      // Text responses, just return the list
      return {
        type: 'text',
        data: responses.map(r => r.response),
        total
      };
    }
  };
  
  const getStatusBadge = (status) => {
    let style = {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 'var(--border-radius)',
      fontSize: '0.8rem',
      fontWeight: '500'
    };
    
    switch(status) {
      case 'in_progress':
        return <span style={{...style, backgroundColor: 'var(--color-warning)'}}>In Progress</span>;
      case 'completed':
        return <span style={{...style, backgroundColor: 'var(--color-success)', color: 'white'}}>Completed</span>;
      case 'abandoned':
        return <span style={{...style, backgroundColor: 'var(--color-danger)', color: 'white'}}>Abandoned</span>;
      default:
        return <span style={{...style, backgroundColor: 'var(--color-gray)'}}>Unknown</span>;
    }
  };
  
  if (loading) {
    return (
      <Layout title="Experiment Results">
        <div className="card">
          <h1>Experiment Results</h1>
          <p>Loading data...</p>
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
    <Layout title={`${experiment.title} - Results`}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h1>Results: {experiment.title}</h1>
          <Link href={`/experiments/${id}`} className="button">
            Back to Experiment
          </Link>
        </div>
        
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Summary</h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-md)'
            }}>
              <div className="card" style={{ textAlign: 'center', margin: 0 }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {participants.length}
                </div>
                <div>Total Participants</div>
              </div>
              
              <div className="card" style={{ textAlign: 'center', margin: 0 }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                  {participants.filter(p => p.status === 'completed').length}
                </div>
                <div>Completed</div>
              </div>
              
              <div className="card" style={{ textAlign: 'center', margin: 0 }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>
                  {participants.filter(p => p.status !== 'completed').length}
                </div>
                <div>In Progress/Abandoned</div>
              </div>
            </div>
            
            <p>
              Created: {new Date(experiment.created_at).toLocaleDateString()}
              {experiment.status === 'completed' && experiment.updated_at && (
                <span> · Completed: {new Date(experiment.updated_at).toLocaleDateString()}</span>
              )}
            </p>
          </div>
        </div>
        
        {/* Scenario Results */}
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Scenario Results</h2>
          
          {scenarios.length === 0 ? (
            <p>No scenarios defined in this experiment.</p>
          ) : (
            scenarios.map((scenario, index) => {
              const stats = calculateScenarioStats(scenario.id);
              
              return (
                <div key={index} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <h3>{scenario.title}</h3>
                  <p style={{ marginBottom: 'var(--spacing-md)' }}>{scenario.description}</p>
                  
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <p><strong>Total Responses:</strong> {stats.total}</p>
                    {stats.avgResponseTime > 0 && (
                      <p><strong>Average Response Time:</strong> {stats.avgResponseTime} ms</p>
                    )}
                  </div>
                  
                  {stats.options.length > 0 && (
                    <div>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Response Distribution:</h4>
                      
                      {stats.options.map((option, optIndex) => (
                        <div key={optIndex} style={{ marginBottom: 'var(--spacing-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{option.value}:</strong> {option.text}
                            </div>
                            <div>
                              {option.count} ({option.percentage}%)
                            </div>
                          </div>
                          
                          <div style={{ 
                            height: '10px', 
                            backgroundColor: 'var(--color-gray)', 
                            borderRadius: 'var(--border-radius)' 
                          }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${option.percentage}%`, 
                              backgroundColor: 'var(--color-primary)',
                              borderRadius: 'var(--border-radius)'
                            }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Survey Results */}
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Survey Results</h2>
          
          {surveyQuestions.length === 0 ? (
            <p>No survey questions defined in this experiment.</p>
          ) : (
            surveyQuestions.map((question, index) => {
              const stats = calculateSurveyStats(question.id);
              
              return (
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
                  
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <p><strong>Total Responses:</strong> {stats.total}</p>
                  </div>
                  
                  {stats.type === 'multiple_choice' && (
                    <div>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Response Distribution:</h4>
                      
                      {stats.data.map((item, itemIndex) => (
                        <div key={itemIndex} style={{ marginBottom: 'var(--spacing-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              {item.option}
                            </div>
                            <div>
                              {item.count} ({item.percentage}%)
                            </div>
                          </div>
                          
                          <div style={{ 
                            height: '10px', 
                            backgroundColor: 'var(--color-gray)', 
                            borderRadius: 'var(--border-radius)' 
                          }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${item.percentage}%`, 
                              backgroundColor: 'var(--color-primary)',
                              borderRadius: 'var(--border-radius)'
                            }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {stats.type === 'number' && (
                    <div>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Statistics:</h4>
                      <p><strong>Average:</strong> {stats.data.avg}</p>
                      <p><strong>Minimum:</strong> {stats.data.min}</p>
                      <p><strong>Maximum:</strong> {stats.data.max}</p>
                    </div>
                  )}
                  
                  {stats.type === 'text' && (
                    <div>
                      <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Responses:</h4>
                      {stats.data.length === 0 ? (
                        <p>No responses yet.</p>
                      ) : (
                        <ul style={{ marginLeft: 'var(--spacing-lg)' }}>
                          {stats.data.map((response, respIndex) => (
                            <li key={respIndex} style={{ marginBottom: 'var(--spacing-sm)' }}>
                              {response}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Participant List */}
        <div className="card">
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Participant Details</h2>
          
          {participants.length === 0 ? (
            <p>No participants have taken this experiment yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Participant ID</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => {
                    const startTime = new Date(participant.started_at);
                    const endTime = participant.completed_at ? new Date(participant.completed_at) : null;
                    const duration = endTime 
                      ? Math.round((endTime - startTime) / 1000 / 60) 
                      : null;
                    
                    return (
                      <tr key={index}>
                        <td>{participant.participant_code}</td>
                        <td>{getStatusBadge(participant.status)}</td>
                        <td>{startTime.toLocaleString()}</td>
                        <td>{endTime ? endTime.toLocaleString() : '-'}</td>
                        <td>{duration ? `${duration} min` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}