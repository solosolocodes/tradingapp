import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import supabase from '../../../lib/supabase';

export default function EditExperiment() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Main experiment data
  const [experiment, setExperiment] = useState({
    title: '',
    description: '',
    status: 'draft'
  });
  
  // Intro screens
  const [introScreens, setIntroScreens] = useState([]);
  
  // Scenarios
  const [scenarios, setScenarios] = useState([]);
  
  // Available scenario templates
  const [availableScenarios, setAvailableScenarios] = useState([]);
  
  // Break screens
  const [breakScreens, setBreakScreens] = useState([]);
  
  // Survey questions
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
      
      // Fetch scenario templates
      const { data: scenariosData, error: scenariosTemplateError } = await supabase
        .from('scenario_templates')
        .select('id, title, description, duration, wallet_id, rounds, option_template')
        .eq('is_active', true)
        .order('title');
        
      if (scenariosTemplateError) throw scenariosTemplateError;
      setAvailableScenarios(scenariosData || []);
      
      // Fetch intro screens
      const { data: introData, error: introError } = await supabase
        .from('experiment_intro_screens')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (introError) throw introError;
      setIntroScreens(introData || []);
      
      // Fetch scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('experiment_scenarios')
        .select('*')
        .eq('experiment_id', id)
        .order('order_index');
      
      if (scenariosError) throw scenariosError;
      setScenarios(scenariosData || []);
      
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
  
  const handleExperimentChange = (e) => {
    const { name, value } = e.target;
    setExperiment({
      ...experiment,
      [name]: value
    });
  };
  
  // Handler for intro screens
  const handleIntroScreenChange = (index, field, value) => {
    const newIntroScreens = [...introScreens];
    newIntroScreens[index] = {
      ...newIntroScreens[index],
      [field]: value
    };
    setIntroScreens(newIntroScreens);
  };
  
  const addIntroScreen = () => {
    setIntroScreens([
      ...introScreens,
      { 
        experiment_id: id,
        title: `Intro ${introScreens.length + 1}`, 
        content: '',
        order_index: introScreens.length
      }
    ]);
  };
  
  const removeIntroScreen = (index) => {
    if (introScreens.length > 1) {
      setIntroScreens(introScreens.filter((_, i) => i !== index));
    }
  };
  
  // Handler for scenarios
  const handleScenarioChange = (index, field, value) => {
    const newScenarios = [...scenarios];
    newScenarios[index] = {
      ...newScenarios[index],
      [field]: value
    };
    setScenarios(newScenarios);
  };
  
  const handleScenarioOptionChange = (scenarioIndex, optionIndex, field, value) => {
    const newScenarios = [...scenarios];
    const options = [...newScenarios[scenarioIndex].options];
    options[optionIndex] = {
      ...options[optionIndex],
      [field]: value
    };
    newScenarios[scenarioIndex].options = options;
    setScenarios(newScenarios);
  };
  
  // Handle selecting a scenario template
  const handleScenarioTemplateChange = (index, templateId) => {
    const newScenarios = [...scenarios];
    
    if (templateId === '') {
      // If no template selected, just clear the template ID
      newScenarios[index] = {
        ...newScenarios[index],
        scenario_template_id: null
      };
    } else {
      // Find the selected template
      const template = availableScenarios.find(s => s.id === templateId);
      
      if (template) {
        // Update scenario with template data
        newScenarios[index] = {
          ...newScenarios[index],
          title: template.title,
          description: template.description || '',
          duration: template.duration,
          wallet_id: template.wallet_id,
          scenario_template_id: template.id,
          options: template.option_template || []
        };
      }
    }
    
    setScenarios(newScenarios);
  };
  
  const addScenarioOption = (scenarioIndex) => {
    const newScenarios = [...scenarios];
    const options = [...newScenarios[scenarioIndex].options] || [];
    options.push({
      text: `Option ${String.fromCharCode(65 + options.length)}`,
      value: String.fromCharCode(65 + options.length)
    });
    newScenarios[scenarioIndex].options = options;
    setScenarios(newScenarios);
  };
  
  const removeScenarioOption = (scenarioIndex, optionIndex) => {
    const newScenarios = [...scenarios];
    const options = [...newScenarios[scenarioIndex].options];
    
    if (options.length > 1) {
      newScenarios[scenarioIndex].options = options.filter((_, i) => i !== optionIndex);
      setScenarios(newScenarios);
    }
  };
  
  const addScenario = () => {
    setScenarios([
      ...scenarios,
      {
        experiment_id: id,
        title: `Scenario ${scenarios.length + 1}`,
        description: '',
        duration: 300,
        wallet_id: null,
        scenario_template_id: null,
        options: [
          { text: 'Option A', value: 'A' },
          { text: 'Option B', value: 'B' }
        ],
        order_index: scenarios.length
      }
    ]);
  };
  
  const removeScenario = (index) => {
    if (scenarios.length > 1) {
      setScenarios(scenarios.filter((_, i) => i !== index));
    } else {
      setError('You must have at least one scenario');
    }
  };
  
  // Handler for break screens
  const handleBreakScreenChange = (index, field, value) => {
    const newBreakScreens = [...breakScreens];
    newBreakScreens[index] = {
      ...newBreakScreens[index],
      [field]: value
    };
    setBreakScreens(newBreakScreens);
  };
  
  const addBreakScreen = () => {
    setBreakScreens([
      ...breakScreens,
      { 
        experiment_id: id,
        title: `Break ${breakScreens.length + 1}`, 
        content: 'Take a short break before continuing.',
        order_index: breakScreens.length
      }
    ]);
  };
  
  const removeBreakScreen = (index) => {
    setBreakScreens(breakScreens.filter((_, i) => i !== index));
  };
  
  // Handler for survey questions
  const handleSurveyQuestionChange = (index, field, value) => {
    const newSurveyQuestions = [...surveyQuestions];
    newSurveyQuestions[index] = {
      ...newSurveyQuestions[index],
      [field]: value
    };
    setSurveyQuestions(newSurveyQuestions);
  };
  
  const handleSurveyOptionChange = (questionIndex, optionIndex, value) => {
    const newSurveyQuestions = [...surveyQuestions];
    const options = [...newSurveyQuestions[questionIndex].options];
    options[optionIndex] = value;
    newSurveyQuestions[questionIndex].options = options;
    setSurveyQuestions(newSurveyQuestions);
  };
  
  const addSurveyOption = (questionIndex) => {
    const newSurveyQuestions = [...surveyQuestions];
    const options = [...newSurveyQuestions[questionIndex].options] || [];
    options.push(`Option ${options.length + 1}`);
    newSurveyQuestions[questionIndex].options = options;
    setSurveyQuestions(newSurveyQuestions);
  };
  
  const removeSurveyOption = (questionIndex, optionIndex) => {
    const newSurveyQuestions = [...surveyQuestions];
    const options = [...newSurveyQuestions[questionIndex].options];
    
    if (options.length > 1) {
      newSurveyQuestions[questionIndex].options = options.filter((_, i) => i !== optionIndex);
      setSurveyQuestions(newSurveyQuestions);
    }
  };
  
  const addSurveyQuestion = () => {
    setSurveyQuestions([
      ...surveyQuestions,
      {
        experiment_id: id,
        question: `Question ${surveyQuestions.length + 1}`,
        type: 'multiple_choice',
        options: ['Option 1', 'Option 2', 'Option 3'],
        order_index: surveyQuestions.length
      }
    ]);
  };
  
  const removeSurveyQuestion = (index) => {
    if (surveyQuestions.length > 1) {
      setSurveyQuestions(surveyQuestions.filter((_, i) => i !== index));
    } else {
      setError('You must have at least one survey question');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Validate form
      if (!experiment.title) {
        throw new Error('Experiment title is required');
      }
      
      if (scenarios.length === 0) {
        throw new Error('At least one scenario is required');
      }
      
      // Update experiment in database
      const { error: experimentError } = await supabase
        .from('experiments')
        .update({
          title: experiment.title,
          description: experiment.description,
          status: experiment.status,
          scenario_count: scenarios.length
        })
        .eq('id', id);
      
      if (experimentError) throw experimentError;
      
      // Delete existing components and recreate them
      // (this is simpler than determining which ones to update vs. create vs. delete)
      
      // Delete intro screens
      await supabase.from('experiment_intro_screens').delete().eq('experiment_id', id);
      
      // Insert updated intro screens
      if (introScreens.length > 0) {
        const { error: introError } = await supabase
          .from('experiment_intro_screens')
          .insert(
            introScreens.map((screen, index) => ({
              experiment_id: id,
              title: screen.title,
              content: screen.content,
              order_index: index
            }))
          );
        
        if (introError) throw introError;
      }
      
      // Delete scenarios
      await supabase.from('experiment_scenarios').delete().eq('experiment_id', id);
      
      // Insert updated scenarios
      if (scenarios.length > 0) {
        const { error: scenariosError } = await supabase
          .from('experiment_scenarios')
          .insert(
            scenarios.map((scenario, index) => ({
              experiment_id: id,
              title: scenario.title,
              description: scenario.description,
              duration: scenario.duration,
              wallet_id: scenario.wallet_id,
              scenario_template_id: scenario.scenario_template_id,
              options: scenario.options,
              order_index: index
            }))
          );
        
        if (scenariosError) throw scenariosError;
      }
      
      // Delete break screens
      await supabase.from('experiment_break_screens').delete().eq('experiment_id', id);
      
      // Insert updated break screens
      if (breakScreens.length > 0) {
        const { error: breaksError } = await supabase
          .from('experiment_break_screens')
          .insert(
            breakScreens.map((screen, index) => ({
              experiment_id: id,
              title: screen.title,
              content: screen.content,
              order_index: index
            }))
          );
        
        if (breaksError) throw breaksError;
      }
      
      // Delete survey questions
      await supabase.from('experiment_survey_questions').delete().eq('experiment_id', id);
      
      // Insert updated survey questions
      if (surveyQuestions.length > 0) {
        const { error: surveyError } = await supabase
          .from('experiment_survey_questions')
          .insert(
            surveyQuestions.map((question, index) => ({
              experiment_id: id,
              question: question.question,
              type: question.type,
              options: question.options,
              order_index: index
            }))
          );
        
        if (surveyError) throw surveyError;
      }
      
      // Redirect to experiments list
      router.push('/experiments');
      
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
  
  return (
    <Layout title="Edit Experiment">
      <div className="card">
        <h1>Edit Experiment</h1>
        <p className="mb-3">Update your behavioral economics experiment settings</p>
        
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
          {/* Main experiment details */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <h2>Experiment Details</h2>
            
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-control"
                value={experiment.title || ''}
                onChange={handleExperimentChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                value={experiment.description || ''}
                onChange={handleExperimentChange}
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                className="form-control"
                value={experiment.status || 'draft'}
                onChange={handleExperimentChange}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          {/* Intro Screens */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h2>Intro Screens</h2>
              <button 
                type="button" 
                className="button success" 
                onClick={addIntroScreen}
                style={{ padding: '5px 10px', fontSize: '0.9rem' }}
              >
                Add Intro Screen
              </button>
            </div>
            
            {introScreens.length === 0 ? (
              <p>No intro screens defined yet. Add one to get started.</p>
            ) : (
              introScreens.map((screen, index) => (
                <div key={index} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    <h3>Intro Screen {index + 1}</h3>
                    <button 
                      type="button" 
                      onClick={() => removeIntroScreen(index)}
                      className="button danger"
                      style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                      disabled={introScreens.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={screen.title || ''}
                      onChange={(e) => handleIntroScreenChange(index, 'title', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-control"
                      value={screen.content || ''}
                      onChange={(e) => handleIntroScreenChange(index, 'content', e.target.value)}
                      rows="3"
                      required
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Scenarios */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h2>Scenarios</h2>
              <button 
                type="button" 
                className="button success" 
                onClick={addScenario}
                style={{ padding: '5px 10px', fontSize: '0.9rem' }}
              >
                Add Scenario
              </button>
            </div>
            
            {scenarios.length === 0 ? (
              <p>No scenarios defined yet. Add one to get started.</p>
            ) : (
              scenarios.map((scenario, scenarioIndex) => (
                <div key={scenarioIndex} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    <h3>Scenario {scenarioIndex + 1}</h3>
                    <button 
                      type="button" 
                      onClick={() => removeScenario(scenarioIndex)}
                      className="button danger"
                      style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                      disabled={scenarios.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Select Scenario Template</label>
                    <select
                      className="form-control"
                      value={scenario.scenario_template_id || ''}
                      onChange={(e) => handleScenarioTemplateChange(scenarioIndex, e.target.value)}
                    >
                      <option value="">-- Create custom scenario --</option>
                      {availableScenarios.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                    
                    {scenario.scenario_template_id && (
                      <div style={{ 
                        marginTop: '5px', 
                        padding: '8px', 
                        backgroundColor: 'var(--color-light)', 
                        borderRadius: 'var(--border-radius)',
                        fontSize: '0.85rem'
                      }}>
                        {availableScenarios.find(t => t.id === scenario.scenario_template_id)?.description || ''}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={scenario.title || ''}
                      onChange={(e) => handleScenarioChange(scenarioIndex, 'title', e.target.value)}
                      required
                      disabled={scenario.scenario_template_id !== null}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      value={scenario.description || ''}
                      onChange={(e) => handleScenarioChange(scenarioIndex, 'description', e.target.value)}
                      rows="3"
                      required
                      disabled={scenario.scenario_template_id !== null}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Duration (seconds)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={scenario.duration || 300}
                      onChange={(e) => handleScenarioChange(scenarioIndex, 'duration', parseInt(e.target.value, 10))}
                      min="1"
                      required
                      disabled={scenario.scenario_template_id !== null}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Wallet</label>
                    {scenario.scenario_template_id && scenario.wallet_id ? (
                      <input
                        type="text"
                        className="form-control"
                        value={availableWallets && availableWallets.find ? 
                              (availableWallets.find(w => w.id === scenario.wallet_id)?.name || 'None') : 
                              'Loading...'}
                        disabled
                      />
                    ) : (
                      <select
                        className="form-control"
                        value={scenario.wallet_id || ''}
                        onChange={(e) => handleScenarioChange(scenarioIndex, 'wallet_id', e.target.value === '' ? null : e.target.value)}
                      >
                        <option value="">-- No wallet assigned --</option>
                        {availableWallets && availableWallets.map && availableWallets.map(wallet => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Options</label>
                      {!scenario.scenario_template_id && (
                        <button 
                          type="button" 
                          className="button success" 
                          onClick={() => addScenarioOption(scenarioIndex)}
                          style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                        >
                          Add Option
                        </button>
                      )}
                    </div>
                    
                    {scenario.scenario_template_id ? (
                      // Read-only view for template options
                      <div style={{ 
                        border: '1px solid var(--color-gray)', 
                        borderRadius: 'var(--border-radius)',
                        padding: '10px',
                        backgroundColor: 'white'
                      }}>
                        {scenario.options && scenario.options.length > 0 ? (
                          <table style={{ width: '100%', margin: 0 }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left' }}>Option</th>
                                <th style={{ textAlign: 'left' }}>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scenario.options.map((option, idx) => (
                                <tr key={idx}>
                                  <td>{option.text}</td>
                                  <td>{option.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p>No options defined for this template.</p>
                        )}
                      </div>
                    ) : (
                      // Editable options for custom scenarios
                      scenario.options && scenario.options.length > 0 ? (
                        scenario.options.map((option, optionIndex) => (
                          <div key={optionIndex} style={{ 
                            display: 'flex', 
                            gap: 'var(--spacing-sm)', 
                            marginBottom: 'var(--spacing-sm)',
                            alignItems: 'center'
                          }}>
                            <input
                              type="text"
                              className="form-control"
                              value={option.text || ''}
                              onChange={(e) => handleScenarioOptionChange(scenarioIndex, optionIndex, 'text', e.target.value)}
                              placeholder="Option text"
                              style={{ flex: 3 }}
                              required
                            />
                            <input
                              type="text"
                              className="form-control"
                              value={option.value || ''}
                              onChange={(e) => handleScenarioOptionChange(scenarioIndex, optionIndex, 'value', e.target.value)}
                              placeholder="Value"
                              style={{ flex: 1 }}
                              required
                            />
                            <button 
                              type="button" 
                              onClick={() => removeScenarioOption(scenarioIndex, optionIndex)}
                              className="button danger"
                              style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                              disabled={scenario.options.length === 1}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <p>No options defined yet.</p>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Break Screens */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h2>Break Screens</h2>
              <button 
                type="button" 
                className="button success" 
                onClick={addBreakScreen}
                style={{ padding: '5px 10px', fontSize: '0.9rem' }}
              >
                Add Break Screen
              </button>
            </div>
            
            {breakScreens.length === 0 ? (
              <p>No break screens defined yet. Add one to get started.</p>
            ) : (
              breakScreens.map((screen, index) => (
                <div key={index} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    <h3>Break Screen {index + 1}</h3>
                    <button 
                      type="button" 
                      onClick={() => removeBreakScreen(index)}
                      className="button danger"
                      style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={screen.title || ''}
                      onChange={(e) => handleBreakScreenChange(index, 'title', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-control"
                      value={screen.content || ''}
                      onChange={(e) => handleBreakScreenChange(index, 'content', e.target.value)}
                      rows="3"
                      required
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Survey Questions */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h2>Survey Questions</h2>
              <button 
                type="button" 
                className="button success" 
                onClick={addSurveyQuestion}
                style={{ padding: '5px 10px', fontSize: '0.9rem' }}
              >
                Add Question
              </button>
            </div>
            
            {surveyQuestions.length === 0 ? (
              <p>No survey questions defined yet. Add one to get started.</p>
            ) : (
              surveyQuestions.map((question, questionIndex) => (
                <div key={questionIndex} className="card" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    <h3>Question {questionIndex + 1}</h3>
                    <button 
                      type="button" 
                      onClick={() => removeSurveyQuestion(questionIndex)}
                      className="button danger"
                      style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                      disabled={surveyQuestions.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Question</label>
                    <input
                      type="text"
                      className="form-control"
                      value={question.question || ''}
                      onChange={(e) => handleSurveyQuestionChange(questionIndex, 'question', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Question Type</label>
                    <select
                      className="form-control"
                      value={question.type || 'multiple_choice'}
                      onChange={(e) => handleSurveyQuestionChange(questionIndex, 'type', e.target.value)}
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                    </select>
                  </div>
                  
                  {question.type === 'multiple_choice' && (
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Options</label>
                        <button 
                          type="button" 
                          className="button success" 
                          onClick={() => addSurveyOption(questionIndex)}
                          style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                        >
                          Add Option
                        </button>
                      </div>
                      
                      {question.options && question.options.length > 0 ? (
                        question.options.map((option, optionIndex) => (
                          <div key={optionIndex} style={{ 
                            display: 'flex', 
                            gap: 'var(--spacing-sm)', 
                            marginBottom: 'var(--spacing-sm)',
                            alignItems: 'center'
                          }}>
                            <input
                              type="text"
                              className="form-control"
                              value={option || ''}
                              onChange={(e) => handleSurveyOptionChange(questionIndex, optionIndex, e.target.value)}
                              style={{ flex: 1 }}
                              required
                            />
                            <button 
                              type="button" 
                              onClick={() => removeSurveyOption(questionIndex, optionIndex)}
                              className="button danger"
                              style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                              disabled={question.options.length === 1}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <p>No options defined yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
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
      </div>
    </Layout>
  );
}