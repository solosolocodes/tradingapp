import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import supabase from '../../lib/supabase';

export default function CreateExperiment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Main experiment data
  const [experiment, setExperiment] = useState({
    title: '',
    description: '',
    status: 'draft'
  });
  
  // Group assignments
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [availableWallets, setAvailableWallets] = useState([]);
  
  // Fetch available groups, wallets and scenario templates
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch participant groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('participant_groups')
          .select('id, name, description, member_count')
          .eq('is_active', true)
          .order('name');
          
        if (groupsError) throw groupsError;
        setAvailableGroups(groupsData || []);
        
        // Fetch wallets
        const { data: walletsData, error: walletsError } = await supabase
          .from('wallets')
          .select('id, name')
          .order('name');
          
        if (walletsError) throw walletsError;
        setAvailableWallets(walletsData || []);
        
        // Fetch scenario templates
        const { data: scenariosData, error: scenariosError } = await supabase
          .from('scenario_templates')
          .select('id, title, description, duration, wallet_id, rounds, option_template')
          .eq('is_active', true)
          .order('title');
          
        if (scenariosError) throw scenariosError;
        setAvailableScenarios(scenariosData || []);
      } catch (error) {
        console.error('Error fetching groups, wallets, or scenarios:', error);
        setError('Error loading data. Please try again.');
      }
    }
    
    fetchData();
  }, []);
  
  // Intro screens
  const [introScreens, setIntroScreens] = useState([
    { title: 'Welcome', content: 'Welcome to this experiment.' }
  ]);
  
  // Scenarios
  const [scenarios, setScenarios] = useState([
    { 
      title: 'Scenario 1', 
      description: '',
      duration: 300, // duration in seconds
      wallet_id: null,
      scenario_template_id: null,
      options: [
        { text: 'Option A', value: 'A' },
        { text: 'Option B', value: 'B' }
      ]
    }
  ]);
  
  // Available scenario templates
  const [availableScenarios, setAvailableScenarios] = useState([]);
  
  // Break screens
  const [breakScreens, setBreakScreens] = useState([
    { title: 'Break', content: 'Take a short break before continuing.' }
  ]);
  
  // Survey questions
  const [surveyQuestions, setSurveyQuestions] = useState([
    { 
      question: 'How did you find this experiment?', 
      type: 'multiple_choice',
      options: [
        'Very difficult',
        'Somewhat difficult',
        'Neutral',
        'Somewhat easy',
        'Very easy'
      ]
    }
  ]);
  
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
      { title: `Intro ${introScreens.length + 1}`, content: '' }
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
  
  const handleScenarioWalletChange = (index, wallet_id) => {
    const newScenarios = [...scenarios];
    newScenarios[index] = {
      ...newScenarios[index],
      wallet_id: wallet_id === '' ? null : wallet_id
    };
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
  
  const handleScenarioOptionChange = (scenarioIndex, optionIndex, field, value) => {
    const newScenarios = [...scenarios];
    newScenarios[scenarioIndex].options[optionIndex] = {
      ...newScenarios[scenarioIndex].options[optionIndex],
      [field]: value
    };
    setScenarios(newScenarios);
  };
  
  const addScenarioOption = (scenarioIndex) => {
    const newScenarios = [...scenarios];
    newScenarios[scenarioIndex].options.push({
      text: `Option ${String.fromCharCode(65 + newScenarios[scenarioIndex].options.length)}`,
      value: String.fromCharCode(65 + newScenarios[scenarioIndex].options.length)
    });
    setScenarios(newScenarios);
  };
  
  const removeScenarioOption = (scenarioIndex, optionIndex) => {
    if (scenarios[scenarioIndex].options.length > 1) {
      const newScenarios = [...scenarios];
      newScenarios[scenarioIndex].options = newScenarios[scenarioIndex].options.filter(
        (_, i) => i !== optionIndex
      );
      setScenarios(newScenarios);
    }
  };
  
  const addScenario = () => {
    setScenarios([
      ...scenarios,
      {
        title: `Scenario ${scenarios.length + 1}`,
        description: '',
        duration: 300,
        scenario_template_id: null,
        wallet_id: null,
        options: [
          { text: 'Option A', value: 'A' },
          { text: 'Option B', value: 'B' }
        ]
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
      { title: `Break ${breakScreens.length + 1}`, content: 'Take a short break before continuing.' }
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
    newSurveyQuestions[questionIndex].options[optionIndex] = value;
    setSurveyQuestions(newSurveyQuestions);
  };
  
  const addSurveyOption = (questionIndex) => {
    const newSurveyQuestions = [...surveyQuestions];
    newSurveyQuestions[questionIndex].options.push(`Option ${newSurveyQuestions[questionIndex].options.length + 1}`);
    setSurveyQuestions(newSurveyQuestions);
  };
  
  const removeSurveyOption = (questionIndex, optionIndex) => {
    if (surveyQuestions[questionIndex].options.length > 1) {
      const newSurveyQuestions = [...surveyQuestions];
      newSurveyQuestions[questionIndex].options = newSurveyQuestions[questionIndex].options.filter(
        (_, i) => i !== optionIndex
      );
      setSurveyQuestions(newSurveyQuestions);
    }
  };
  
  const addSurveyQuestion = () => {
    setSurveyQuestions([
      ...surveyQuestions,
      {
        question: `Question ${surveyQuestions.length + 1}`,
        type: 'multiple_choice',
        options: ['Option 1', 'Option 2', 'Option 3']
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
  
  // Group assignment handlers
  const addGroupAssignment = (groupId) => {
    const group = availableGroups.find(g => g.id === groupId);
    if (!group) return;
    
    if (!assignedGroups.some(g => g.id === groupId)) {
      setAssignedGroups([
        ...assignedGroups, 
        { 
          id: group.id, 
          name: group.name, 
          member_count: group.member_count,
          is_control_group: false
        }
      ]);
    }
  };
  
  const removeGroupAssignment = (groupId) => {
    setAssignedGroups(assignedGroups.filter(g => g.id !== groupId));
  };
  
  const toggleControlGroup = (groupId) => {
    setAssignedGroups(assignedGroups.map(group => 
      group.id === groupId 
        ? { ...group, is_control_group: !group.is_control_group } 
        : group
    ));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate form
      if (!experiment.title) {
        throw new Error('Experiment title is required');
      }
      
      if (scenarios.length === 0) {
        throw new Error('At least one scenario is required');
      }
      
      // Create experiment in database
      const { data: experimentData, error: experimentError } = await supabase
        .from('experiments')
        .insert([
          {
            title: experiment.title,
            description: experiment.description,
            status: experiment.status,
            scenario_count: scenarios.length,
            participant_count: 0,
          }
        ])
        .select();
      
      if (experimentError) throw experimentError;
      
      const experimentId = experimentData[0].id;
      
      // Insert intro screens
      const { error: introError } = await supabase
        .from('experiment_intro_screens')
        .insert(
          introScreens.map((screen, index) => ({
            experiment_id: experimentId,
            title: screen.title,
            content: screen.content,
            order_index: index
          }))
        );
      
      if (introError) throw introError;
      
      // Insert scenarios
      const { error: scenariosError } = await supabase
        .from('experiment_scenarios')
        .insert(
          scenarios.map((scenario, index) => ({
            experiment_id: experimentId,
            title: scenario.title,
            description: scenario.description,
            duration: scenario.duration,
            wallet_id: scenario.wallet_id,
            scenario_template_id: scenario.scenario_template_id,
            order_index: index,
            options: scenario.options
          }))
        );
      
      if (scenariosError) throw scenariosError;
      
      // Insert group assignments if any
      if (assignedGroups.length > 0) {
        const { error: groupsError } = await supabase
          .from('experiment_group_assignments')
          .insert(
            assignedGroups.map(group => ({
              experiment_id: experimentId,
              group_id: group.id,
              is_active: true,
              is_control_group: group.is_control_group,
              assignment_date: new Date()
            }))
          );
          
        if (groupsError) throw groupsError;
      }
      
      // Insert break screens
      const { error: breaksError } = await supabase
        .from('experiment_break_screens')
        .insert(
          breakScreens.map((screen, index) => ({
            experiment_id: experimentId,
            title: screen.title,
            content: screen.content,
            order_index: index
          }))
        );
      
      if (breaksError) throw breaksError;
      
      // Insert survey questions
      const { error: surveyError } = await supabase
        .from('experiment_survey_questions')
        .insert(
          surveyQuestions.map((question, index) => ({
            experiment_id: experimentId,
            question: question.question,
            type: question.type,
            options: question.options,
            order_index: index
          }))
        );
      
      if (surveyError) throw surveyError;
      
      // Redirect to experiments list
      router.push('/experiments');
      
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
        <p className="mb-3">Design a behavioral economics experiment with multiple components</p>
        
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
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderLeft: '4px solid #607d8b' }}>
            <h2>Experiment Details</h2>
            
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-control"
                value={experiment.title}
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
                value={experiment.description}
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
                value={experiment.status}
                onChange={handleExperimentChange}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          {/* Intro Screens */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderLeft: '4px solid #8bc34a' }}>
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
            
            {introScreens.map((screen, index) => (
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
                    value={screen.title}
                    onChange={(e) => handleIntroScreenChange(index, 'title', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-control"
                    value={screen.content}
                    onChange={(e) => handleIntroScreenChange(index, 'content', e.target.value)}
                    rows="3"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Scenarios */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderLeft: '4px solid var(--color-primary)' }}>
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
            
            {scenarios.map((scenario, scenarioIndex) => (
              <div key={scenarioIndex} className="card" style={{ 
                marginBottom: 'var(--spacing-sm)', 
                backgroundColor: scenarioIndex % 2 === 0 ? 'var(--color-light)' : 'white',
                padding: '12px',
                borderLeft: '3px solid var(--color-primary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Scenario {scenarioIndex + 1}</h3>
                  <button 
                    type="button" 
                    onClick={() => removeScenario(scenarioIndex)}
                    className="button danger"
                    style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                    disabled={scenarios.length === 1}
                  >
                    Remove
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <select
                    className="form-control"
                    value={scenario.scenario_template_id || ''}
                    onChange={(e) => handleScenarioTemplateChange(scenarioIndex, e.target.value)}
                    style={{ fontWeight: 'bold' }}
                    required
                  >
                    <option value="">-- Select Scenario Template --</option>
                    {availableScenarios.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                {scenario.scenario_template_id && (
                  <div style={{ 
                    marginTop: '8px',
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '8px',
                    fontSize: '0.8rem',
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    padding: '6px',
                    borderRadius: '4px'
                  }}>
                    <div>
                      <div><strong>Duration:</strong> {scenario.duration || 0} sec</div>
                      <div><strong>Wallet:</strong> {availableWallets.find(w => w.id === scenario.wallet_id)?.name || 'None'}</div>
                    </div>
                    <div>
                      <div><strong>Options:</strong> {scenario.options?.length || 0}</div>
                      <div style={{ fontStyle: 'italic', color: 'var(--color-gray-dark)', fontSize: '0.75rem', marginTop: '3px' }}>
                        {availableScenarios.find(t => t.id === scenario.scenario_template_id)?.description?.substring(0, 60) || ''}
                        {(availableScenarios.find(t => t.id === scenario.scenario_template_id)?.description?.length || 0) > 60 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            ))}
          </div>
          
          {/* Break Screens */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderLeft: '4px solid #ff9800' }}>
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
            
            {breakScreens.map((screen, index) => (
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
                    value={screen.title}
                    onChange={(e) => handleBreakScreenChange(index, 'title', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-control"
                    value={screen.content}
                    onChange={(e) => handleBreakScreenChange(index, 'content', e.target.value)}
                    rows="3"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Participant Groups */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderLeft: '4px solid #9c27b0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h2>Participant Groups</h2>
              <select
                className="form-control"
                style={{ width: 'auto', display: 'inline-block' }}
                onChange={(e) => e.target.value && addGroupAssignment(e.target.value)}
                value=""
              >
                <option value="">-- Add a group --</option>
                {availableGroups
                  .filter(g => !assignedGroups.some(ag => ag.id === g.id))
                  .map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.member_count || 0} members)
                    </option>
                  ))
                }
              </select>
            </div>
            
            {assignedGroups.length === 0 ? (
              <p>No participant groups assigned yet. Assign groups to collect responses.</p>
            ) : (
              <div style={{ 
                border: '1px solid var(--color-gray)', 
                borderRadius: 'var(--border-radius)',
                margin: 'var(--spacing-md) 0',
                overflow: 'hidden'
              }}>
                <table style={{ margin: 0, width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Group Name</th>
                      <th>Members</th>
                      <th>Control Group</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedGroups.map(group => (
                      <tr key={group.id}>
                        <td>{group.name}</td>
                        <td>{group.member_count || 0}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={group.is_control_group} 
                            onChange={() => toggleControlGroup(group.id)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeGroupAssignment(group.id)}
                            className="button danger"
                            style={{ padding: '2px 5px', fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-dark)' }}>
              Tip: Control groups are used as baselines for comparing experiment results.
            </p>
          </div>
          
          {/* Survey Questions */}
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderLeft: '4px solid #2196f3' }}>
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
            
            {surveyQuestions.map((question, questionIndex) => (
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
                    value={question.question}
                    onChange={(e) => handleSurveyQuestionChange(questionIndex, 'question', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select
                    className="form-control"
                    value={question.type}
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
                    
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} style={{ 
                        display: 'flex', 
                        gap: 'var(--spacing-sm)', 
                        marginBottom: 'var(--spacing-sm)',
                        alignItems: 'center'
                      }}>
                        <input
                          type="text"
                          className="form-control"
                          value={option}
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
                    ))}
                  </div>
                )}
              </div>
            ))}
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