import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

// Section types
const SECTION_TYPES = {
  INFO: 'info',
  SCENARIO: 'scenario',
  SURVEY: 'survey',
  BREAK: 'break'
};

export default function ExperimentSections({ experimentId, compact = true }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingSectionType, setAddingSectionType] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  
  // Section data for create/edit
  const [infoData, setInfoData] = useState({ title: '', content: '' });
  const [surveyType, setSurveyType] = useState('demographic');
  const [availableScenarios, setAvailableScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  
  // Fetch data on load
  useEffect(() => {
    if (experimentId) {
      fetchSections();
      fetchAvailableScenarios();
    }
  }, [experimentId]);
  
  // Fetch all sections for the experiment
  const fetchSections = async () => {
    try {
      setLoading(true);
      
      // Fetch intro screens
      const { data: infoScreens, error: infoError } = await supabase
        .from('experiment_intro_screens')
        .select('id, title, content, order_index')
        .eq('experiment_id', experimentId)
        .order('order_index');
      
      if (infoError) throw infoError;
      
      // Fetch scenarios
      const { data: scenarios, error: scenariosError } = await supabase
        .from('experiment_scenarios')
        .select(`
          id, title, description, duration, options, order_index,
          wallet_id, wallets:wallet_id (name)
        `)
        .eq('experiment_id', experimentId)
        .order('order_index');
      
      if (scenariosError) throw scenariosError;
      
      // Fetch break screens
      const { data: breakScreens, error: breakError } = await supabase
        .from('experiment_break_screens')
        .select('id, title, content, order_index')
        .eq('experiment_id', experimentId)
        .order('order_index');
      
      if (breakError) throw breakError;
      
      // Fetch survey questions
      const { data: surveyQuestions, error: surveyError } = await supabase
        .from('experiment_survey_questions')
        .select('id, question, type, options, order_index, is_demographic')
        .eq('experiment_id', experimentId)
        .order('order_index');
      
      if (surveyError) throw surveyError;
      
      // Format and combine sections
      const formattedInfoScreens = (infoScreens || []).map(screen => ({
        id: `info-${screen.id}`,
        type: SECTION_TYPES.INFO,
        originalId: screen.id,
        title: screen.title,
        content: screen.content,
        order_index: screen.order_index
      }));
      
      const formattedScenarios = (scenarios || []).map(scenario => ({
        id: `scenario-${scenario.id}`,
        type: SECTION_TYPES.SCENARIO,
        originalId: scenario.id,
        title: scenario.title,
        description: scenario.description,
        duration: scenario.duration,
        options: scenario.options,
        wallet_name: scenario.wallets?.name,
        order_index: scenario.order_index
      }));
      
      const formattedBreaks = (breakScreens || []).map(screen => ({
        id: `break-${screen.id}`,
        type: SECTION_TYPES.BREAK,
        originalId: screen.id,
        title: screen.title,
        content: screen.content,
        order_index: screen.order_index
      }));
      
      // Group survey questions
      const surveyGroups = {};
      (surveyQuestions || []).forEach(question => {
        const groupKey = question.is_demographic ? 'demographic' : 'custom';
        if (!surveyGroups[groupKey]) {
          surveyGroups[groupKey] = {
            id: `survey-${groupKey}`,
            type: SECTION_TYPES.SURVEY,
            title: question.is_demographic ? 'Demographic Survey' : 'Custom Survey',
            questions: [],
            is_demographic: question.is_demographic,
            order_index: question.order_index
          };
        }
        surveyGroups[groupKey].questions.push({
          id: question.id,
          question: question.question,
          type: question.type,
          options: question.options
        });
      });
      
      const formattedSurveys = Object.values(surveyGroups);
      
      // Combine all sections and sort by order_index
      const allSections = [
        ...formattedInfoScreens,
        ...formattedScenarios,
        ...formattedBreaks,
        ...formattedSurveys
      ].sort((a, b) => a.order_index - b.order_index);
      
      setSections(allSections);
      
    } catch (error) {
      console.error('Error fetching experiment sections:', error);
      setError('Failed to load experiment sections. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch available scenarios for selection
  const fetchAvailableScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('scenario_templates')
        .select('id, title')
        .order('title');
        
      if (error) throw error;
      
      setAvailableScenarios(data || []);
    } catch (error) {
      console.error('Error fetching available scenarios:', error);
    }
  };
  
  // Create default sections for a new experiment
  const createDefaultSections = async (experimentId) => {
    try {
      const defaultSections = [
        // Welcome screen
        {
          type: SECTION_TYPES.INFO,
          title: 'Welcome to the Experiment',
          content: 'Thank you for participating in this experiment. Your responses will help us better understand economic decision-making.',
          order_index: 0
        },
        // Instructions screen
        {
          type: SECTION_TYPES.INFO,
          title: 'Instructions',
          content: 'In this experiment, you will be presented with several scenarios. In each scenario, you will need to make financial decisions based on the information provided. Take your time to consider each option carefully.',
          order_index: 1
        },
        // First scenario
        {
          type: SECTION_TYPES.SCENARIO,
          order_index: 2
        },
        // Info screen before second scenario
        {
          type: SECTION_TYPES.INFO,
          title: 'Next Scenario',
          content: 'You have completed the first scenario. Let\'s move on to the next one. Remember, each scenario is independent of the others.',
          order_index: 3
        },
        // Second scenario
        {
          type: SECTION_TYPES.SCENARIO,
          order_index: 4
        },
        // Info screen before third scenario
        {
          type: SECTION_TYPES.INFO,
          title: 'Final Scenario',
          content: 'You\'re doing great! This is the final scenario. After this, you will complete a short survey.',
          order_index: 5
        },
        // Third scenario
        {
          type: SECTION_TYPES.SCENARIO,
          order_index: 6
        },
        // Survey
        {
          type: SECTION_TYPES.SURVEY,
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
      
      // If no scenario templates exist, create a dummy one
      let dummyScenarioId = null;
      if (!scenarioTemplates || scenarioTemplates.length === 0) {
        const { data: newTemplate, error: createError } = await supabase
          .from('scenario_templates')
          .insert({
            title: 'Investment Decision',
            description: 'Choose how to allocate your investment funds.',
            duration: 60,
            options: [
              { value: 'option_a', text: 'Invest in Stock A' },
              { value: 'option_b', text: 'Invest in Stock B' },
              { value: 'option_c', text: 'Keep funds in cash' }
            ]
          })
          .select()
          .single();
          
        if (createError) throw createError;
        dummyScenarioId = newTemplate.id;
      }
      
      // Insert each default section
      for (const section of defaultSections) {
        if (section.type === SECTION_TYPES.INFO) {
          await supabase
            .from('experiment_intro_screens')
            .insert({
              experiment_id: experimentId,
              title: section.title,
              content: section.content,
              order_index: section.order_index
            });
        } 
        else if (section.type === SECTION_TYPES.SCENARIO) {
          // Use available templates or the dummy one
          const templateToUse = scenarioTemplates && scenarioTemplates.length > 0
            ? scenarioTemplates[Math.floor(Math.random() * scenarioTemplates.length)]
            : {
                id: dummyScenarioId,
                title: 'Investment Decision',
                description: 'Choose how to allocate your investment funds.',
                duration: 60,
                options: [
                  { value: 'option_a', text: 'Invest in Stock A' },
                  { value: 'option_b', text: 'Invest in Stock B' },
                  { value: 'option_c', text: 'Keep funds in cash' }
                ]
              };
              
          await supabase
            .from('experiment_scenarios')
            .insert({
              experiment_id: experimentId,
              title: templateToUse.title,
              description: templateToUse.description,
              duration: templateToUse.duration,
              options: templateToUse.options,
              order_index: section.order_index
            });
        }
        else if (section.type === SECTION_TYPES.SURVEY && section.is_demographic) {
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
      return false;
    }
  };

  // Create new section
  const handleCreateSection = async (type) => {
    try {
      let newSection;
      let response;
      
      // Get the highest order_index
      const maxOrderIndex = sections.length > 0 
        ? Math.max(...sections.map(s => s.order_index))
        : -1;
      
      const newOrderIndex = maxOrderIndex + 1;
      
      switch (type) {
        case SECTION_TYPES.INFO:
          response = await supabase
            .from('experiment_intro_screens')
            .insert({
              experiment_id: experimentId,
              title: infoData.title,
              content: infoData.content,
              order_index: newOrderIndex
            })
            .select()
            .single();
            
          if (response.error) throw response.error;
          
          newSection = {
            id: `info-${response.data.id}`,
            type: SECTION_TYPES.INFO,
            originalId: response.data.id,
            title: response.data.title,
            content: response.data.content,
            order_index: response.data.order_index
          };
          break;
          
        case SECTION_TYPES.SCENARIO:
          if (!selectedScenarioId) {
            throw new Error('Please select a scenario template');
          }
          
          // Get scenario template data
          const { data: templateData, error: templateError } = await supabase
            .from('scenario_templates')
            .select('title, description, duration, options')
            .eq('id', selectedScenarioId)
            .single();
            
          if (templateError) throw templateError;
          
          response = await supabase
            .from('experiment_scenarios')
            .insert({
              experiment_id: experimentId,
              title: templateData.title,
              description: templateData.description,
              duration: templateData.duration,
              options: templateData.option_template || [],
              order_index: newOrderIndex
            })
            .select()
            .single();
            
          if (response.error) throw response.error;
          
          newSection = {
            id: `scenario-${response.data.id}`,
            type: SECTION_TYPES.SCENARIO,
            originalId: response.data.id,
            title: response.data.title,
            description: response.data.description,
            duration: response.data.duration,
            options: response.data.options,
            order_index: response.data.order_index
          };
          break;
          
        case SECTION_TYPES.BREAK:
          response = await supabase
            .from('experiment_break_screens')
            .insert({
              experiment_id: experimentId,
              title: 'Break Screen',
              content: 'Take a moment to reflect before continuing.',
              order_index: newOrderIndex
            })
            .select()
            .single();
            
          if (response.error) throw response.error;
          
          newSection = {
            id: `break-${response.data.id}`,
            type: SECTION_TYPES.BREAK,
            originalId: response.data.id,
            title: response.data.title,
            content: response.data.content,
            order_index: response.data.order_index
          };
          break;
          
        case SECTION_TYPES.SURVEY:
          // For demographic survey, insert pre-defined questions
          if (surveyType === 'demographic') {
            const demographicQuestions = [
              {
                experiment_id: experimentId,
                question: 'What is your age?',
                type: 'number',
                options: null,
                order_index: newOrderIndex,
                is_demographic: true
              },
              {
                experiment_id: experimentId,
                question: 'What is your gender?',
                type: 'multiple_choice',
                options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
                order_index: newOrderIndex,
                is_demographic: true
              },
              {
                experiment_id: experimentId,
                question: 'What is your highest level of education?',
                type: 'multiple_choice',
                options: ['High School', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate', 'Other'],
                order_index: newOrderIndex,
                is_demographic: true
              },
              {
                experiment_id: experimentId,
                question: 'How experienced are you with investing?',
                type: 'multiple_choice',
                options: ['No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'],
                order_index: newOrderIndex,
                is_demographic: true
              },
              {
                experiment_id: experimentId,
                question: 'How experienced are you with cryptocurrency?',
                type: 'multiple_choice',
                options: ['No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'],
                order_index: newOrderIndex,
                is_demographic: true
              }
            ];
            
            response = await supabase
              .from('experiment_survey_questions')
              .insert(demographicQuestions)
              .select();
              
            if (response.error) throw response.error;
            
            newSection = {
              id: `survey-demographic`,
              type: SECTION_TYPES.SURVEY,
              title: 'Demographic Survey',
              questions: demographicQuestions.map(q => ({
                id: null, // We'll update after fetch
                question: q.question,
                type: q.type,
                options: q.options
              })),
              is_demographic: true,
              order_index: newOrderIndex
            };
          } else {
            // For custom survey, insert a placeholder question
            response = await supabase
              .from('experiment_survey_questions')
              .insert({
                experiment_id: experimentId,
                question: 'How would you rate this experiment?',
                type: 'multiple_choice',
                options: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
                order_index: newOrderIndex,
                is_demographic: false
              })
              .select()
              .single();
              
            if (response.error) throw response.error;
            
            newSection = {
              id: `survey-custom`,
              type: SECTION_TYPES.SURVEY,
              title: 'Custom Survey',
              questions: [{
                id: response.data.id,
                question: response.data.question,
                type: response.data.type,
                options: response.data.options
              }],
              is_demographic: false,
              order_index: newOrderIndex
            };
          }
          break;
          
        default:
          throw new Error('Invalid section type');
      }
      
      // Add new section to state
      setSections([...sections, newSection]);
      
      // Reset form data
      setInfoData({ title: '', content: '' });
      setSelectedScenarioId('');
      setSurveyType('demographic');
      setAddingSectionType(null);
      
    } catch (error) {
      console.error('Error creating section:', error);
      setError(error.message);
    }
  };
  
  // Delete section
  const handleDeleteSection = async (sectionId, type, originalId) => {
    if (!confirm('Are you sure you want to delete this section? This cannot be undone.')) {
      return;
    }
    
    try {
      let response;
      
      switch (type) {
        case SECTION_TYPES.INFO:
          response = await supabase
            .from('experiment_intro_screens')
            .delete()
            .eq('id', originalId);
          break;
          
        case SECTION_TYPES.SCENARIO:
          response = await supabase
            .from('experiment_scenarios')
            .delete()
            .eq('id', originalId);
          break;
          
        case SECTION_TYPES.BREAK:
          response = await supabase
            .from('experiment_break_screens')
            .delete()
            .eq('id', originalId);
          break;
          
        case SECTION_TYPES.SURVEY:
          // For surveys, find and delete all associated questions
          const isSurveyDemographic = sectionId === 'survey-demographic';
          
          response = await supabase
            .from('experiment_survey_questions')
            .delete()
            .eq('experiment_id', experimentId)
            .eq('is_demographic', isSurveyDemographic);
          break;
          
        default:
          throw new Error('Invalid section type');
      }
      
      if (response.error) throw response.error;
      
      // Remove section from state
      setSections(sections.filter(s => s.id !== sectionId));
      
    } catch (error) {
      console.error('Error deleting section:', error);
      setError(error.message);
    }
  };
  
  // Move section up/down
  const handleMoveSection = async (sectionId, direction) => {
    try {
      const currentIndex = sections.findIndex(s => s.id === sectionId);
      if (currentIndex === -1) return;
      
      // Check boundaries
      if (direction === 'up' && currentIndex === 0) return;
      if (direction === 'down' && currentIndex === sections.length - 1) return;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Swap order_index values
      const currentSection = sections[currentIndex];
      const targetSection = sections[targetIndex];
      
      const updatedSections = [...sections];
      updatedSections[currentIndex] = { ...currentSection, order_index: targetSection.order_index };
      updatedSections[targetIndex] = { ...targetSection, order_index: currentSection.order_index };
      
      // Update in database based on section type
      const updateSection = async (section) => {
        const { type, originalId, order_index } = section;
        
        switch (type) {
          case SECTION_TYPES.INFO:
            return supabase
              .from('experiment_intro_screens')
              .update({ order_index })
              .eq('id', originalId);
              
          case SECTION_TYPES.SCENARIO:
            return supabase
              .from('experiment_scenarios')
              .update({ order_index })
              .eq('id', originalId);
              
          case SECTION_TYPES.BREAK:
            return supabase
              .from('experiment_break_screens')
              .update({ order_index })
              .eq('id', originalId);
              
          case SECTION_TYPES.SURVEY:
            // For surveys, update all associated questions
            const isSurveyDemographic = section.id === 'survey-demographic';
            
            return supabase
              .from('experiment_survey_questions')
              .update({ order_index })
              .eq('experiment_id', experimentId)
              .eq('is_demographic', isSurveyDemographic);
              
          default:
            throw new Error('Invalid section type');
        }
      };
      
      await updateSection(updatedSections[currentIndex]);
      await updateSection(updatedSections[targetIndex]);
      
      // Sort by order_index
      setSections(updatedSections.sort((a, b) => a.order_index - b.order_index));
      
    } catch (error) {
      console.error('Error moving section:', error);
      setError(error.message);
    }
  };
  
  // Render Add Section Form
  const renderAddSectionForm = () => {
    if (!addingSectionType) return null;
    
    // Info page form
    if (addingSectionType === SECTION_TYPES.INFO) {
      return (
        <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>Add Information Page</h3>
          
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-control"
              value={infoData.title}
              onChange={(e) => setInfoData({ ...infoData, title: e.target.value })}
              placeholder="Welcome to the experiment"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              className="form-control"
              value={infoData.content}
              onChange={(e) => setInfoData({ ...infoData, content: e.target.value })}
              placeholder="Enter information for participants..."
              rows="3"
              required
            />
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="button success"
              onClick={() => handleCreateSection(SECTION_TYPES.INFO)}
              disabled={!infoData.title || !infoData.content}
            >
              Add Page
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setAddingSectionType(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    // Scenario selection form
    if (addingSectionType === SECTION_TYPES.SCENARIO) {
      return (
        <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>Add Scenario</h3>
          
          <div className="form-group">
            <label className="form-label">Select Scenario</label>
            <select
              className="form-control"
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              required
            >
              <option value="">Select a scenario...</option>
              {availableScenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.title}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="button success"
              onClick={() => handleCreateSection(SECTION_TYPES.SCENARIO)}
              disabled={!selectedScenarioId}
            >
              Add Scenario
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setAddingSectionType(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    // Survey form
    if (addingSectionType === SECTION_TYPES.SURVEY) {
      return (
        <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>Add Survey</h3>
          
          <div className="form-group">
            <label className="form-label">Survey Type</label>
            <select
              className="form-control"
              value={surveyType}
              onChange={(e) => setSurveyType(e.target.value)}
            >
              <option value="demographic">Demographic Survey</option>
              <option value="custom">Custom Survey</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="button success"
              onClick={() => handleCreateSection(SECTION_TYPES.SURVEY)}
            >
              Add Survey
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setAddingSectionType(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    // Break screen form
    if (addingSectionType === SECTION_TYPES.BREAK) {
      return (
        <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-light)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>Add Break Screen</h3>
          <p>A break screen will be added with default content.</p>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="button success"
              onClick={() => handleCreateSection(SECTION_TYPES.BREAK)}
            >
              Add Break Screen
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setAddingSectionType(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Get appropriate icon and color for section type
  const getSectionTypeStyles = (type) => {
    switch (type) {
      case SECTION_TYPES.INFO:
        return {
          icon: 'ℹ️',
          color: 'var(--color-info)',
          text: 'Information'
        };
      case SECTION_TYPES.SCENARIO:
        return {
          icon: '📊',
          color: 'var(--color-primary)',
          text: 'Scenario'
        };
      case SECTION_TYPES.SURVEY:
        return {
          icon: '📝',
          color: 'var(--color-success)',
          text: 'Survey'
        };
      case SECTION_TYPES.BREAK:
        return {
          icon: '⏸️',
          color: 'var(--color-warning)',
          text: 'Break'
        };
      default:
        return {
          icon: '📄',
          color: 'var(--color-gray)',
          text: 'Section'
        };
    }
  };
  
  if (loading) {
    return <p>Loading experiment sections...</p>;
  }
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? 'var(--spacing-sm)' : 'var(--spacing-md)' }}>
        <h2 style={{ margin: 0, fontSize: compact ? '1.2rem' : '1.5rem' }}>Experiment Flow</h2>
        
        {!addingSectionType && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>Add:</label>
            <select
              className="form-control"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setAddingSectionType(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{ 
                minWidth: compact ? '120px' : '150px',
                padding: compact ? '4px 8px' : 'var(--spacing-sm)',
                fontSize: compact ? '0.85rem' : 'inherit'
              }}
            >
              <option value="">+ Add Section</option>
              <option value={SECTION_TYPES.INFO}>Information Page</option>
              <option value={SECTION_TYPES.SCENARIO}>Scenario</option>
              <option value={SECTION_TYPES.SURVEY}>Survey</option>
              <option value={SECTION_TYPES.BREAK}>Break Screen</option>
            </select>
          </div>
        )}
      </div>
      
      {error && (
        <div style={{ 
          backgroundColor: 'var(--color-danger)', 
          color: 'white', 
          padding: 'var(--spacing-sm)', 
          borderRadius: 'var(--border-radius)',
          marginBottom: 'var(--spacing-md)'
        }}>
          {error}
        </div>
      )}
      
      {/* Add Section Form */}
      {renderAddSectionForm()}
      
      {/* Section List */}
      {sections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-sm)', backgroundColor: 'var(--color-light)' }}>
          <p style={{ fontSize: '0.9rem' }}>No sections have been added yet. Use the dropdown above to add sections.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: compact ? '8px' : 'var(--spacing-md)', backgroundColor: 'var(--color-light)', margin: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sections.map((section, index) => {
              const typeStyles = getSectionTypeStyles(section.type);
              
              return (
                <div 
                  key={section.id}
                  style={{ 
                    backgroundColor: 'white',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-gray)',
                    borderLeft: `3px solid ${typeStyles.color}`,
                    marginBottom: compact ? '4px' : '6px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Section Header */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: compact ? '4px 8px' : 'var(--spacing-sm)',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      borderBottom: editingSectionId === section.id ? '1px solid var(--color-gray)' : 'none'
                    }}
                    onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: typeStyles.color,
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '10px',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </span>
                      
                      <span style={{ 
                        backgroundColor: 'var(--color-light)',
                        padding: '1px 4px',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        whiteSpace: 'nowrap'
                      }}>
                        {typeStyles.icon}
                      </span>
                      
                      <span style={{ 
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.85rem'
                      }}>
                        {section.title}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="button"
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleMoveSection(section.id, 'up');
                        }}
                        disabled={index === 0}
                        style={{ 
                          padding: '0px 3px', 
                          fontSize: '0.7rem',
                          minWidth: '18px',
                          height: '18px',
                          lineHeight: '1'
                        }}
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(section.id, 'down');
                        }}
                        disabled={index === sections.length - 1}
                        style={{ 
                          padding: '0px 3px', 
                          fontSize: '0.7rem',
                          minWidth: '18px',
                          height: '18px',
                          lineHeight: '1'
                        }}
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSectionId(editingSectionId === section.id ? null : section.id);
                        }}
                        style={{ 
                          padding: '0px 3px', 
                          fontSize: '0.7rem',
                          backgroundColor: editingSectionId === section.id ? 'var(--color-success)' : 'var(--color-warning)',
                          minWidth: '18px',
                          height: '18px',
                          lineHeight: '1'
                        }}
                        title={editingSectionId === section.id ? "Done Editing" : "Edit Section"}
                      >
                        {editingSectionId === section.id ? "✓" : "✏️"}
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id, section.type, section.originalId);
                        }}
                        style={{ 
                          padding: '0px 3px', 
                          fontSize: '0.7rem',
                          minWidth: '18px',
                          height: '18px',
                          lineHeight: '1'
                        }}
                        title="Delete Section"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {/* Expandable Edit Area */}
                  {editingSectionId === section.id && (
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-light)' }}>
                      {/* Different edit forms based on section type */}
                      {section.type === SECTION_TYPES.INFO && (
                        <div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Title</label>
                            <input
                              type="text"
                              className="form-control"
                              value={section.title}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], title: e.target.value };
                                setSections(updatedSections);
                                
                                // Update in database
                                supabase
                                  .from('experiment_intro_screens')
                                  .update({ title: e.target.value })
                                  .eq('id', section.originalId)
                                  .then(({ error }) => {
                                    if (error) console.error('Error updating title:', error);
                                  });
                              }}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Content</label>
                            <textarea
                              className="form-control"
                              value={section.content}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], content: e.target.value };
                                setSections(updatedSections);
                                
                                // Update in database
                                supabase
                                  .from('experiment_intro_screens')
                                  .update({ content: e.target.value })
                                  .eq('id', section.originalId)
                                  .then(({ error }) => {
                                    if (error) console.error('Error updating content:', error);
                                  });
                              }}
                              rows="3"
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {section.type === SECTION_TYPES.SCENARIO && (
                        <div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Scenario Title</label>
                            <input
                              type="text"
                              className="form-control"
                              value={section.title}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], title: e.target.value };
                                setSections(updatedSections);
                                
                                // Update in database
                                supabase
                                  .from('experiment_scenarios')
                                  .update({ title: e.target.value })
                                  .eq('id', section.originalId)
                                  .then(({ error }) => {
                                    if (error) console.error('Error updating scenario title:', error);
                                  });
                              }}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Description</label>
                            <textarea
                              className="form-control"
                              value={section.description}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], description: e.target.value };
                                setSections(updatedSections);
                                
                                // Update in database
                                supabase
                                  .from('experiment_scenarios')
                                  .update({ description: e.target.value })
                                  .eq('id', section.originalId)
                                  .then(({ error }) => {
                                    if (error) console.error('Error updating scenario description:', error);
                                  });
                              }}
                              rows="2"
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Duration (seconds)</label>
                            <input
                              type="number"
                              className="form-control"
                              value={section.duration}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], duration: e.target.value };
                                setSections(updatedSections);
                                
                                // Update in database
                                supabase
                                  .from('experiment_scenarios')
                                  .update({ duration: e.target.value })
                                  .eq('id', section.originalId)
                                  .then(({ error }) => {
                                    if (error) console.error('Error updating scenario duration:', error);
                                  });
                              }}
                              min="5"
                              max="600"
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Change Scenario</label>
                            <select
                              className="form-control"
                              value=""
                              onChange={async (e) => {
                                if (!e.target.value) return;
                                
                                try {
                                  // Get template details
                                  const { data: template, error: templateError } = await supabase
                                    .from('scenario_templates')
                                    .select('title, description, duration, option_template')
                                    .eq('id', e.target.value)
                                    .single();
                                  
                                  if (templateError) throw templateError;
                                  
                                  // Update in database
                                  const { error: updateError } = await supabase
                                    .from('experiment_scenarios')
                                    .update({
                                      title: template.title,
                                      description: template.description,
                                      duration: template.duration,
                                      options: template.option_template || []
                                    })
                                    .eq('id', section.originalId);
                                  
                                  if (updateError) throw updateError;
                                  
                                  // Update state
                                  const updatedSections = [...sections];
                                  const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                  updatedSections[sectionIndex] = { 
                                    ...updatedSections[sectionIndex], 
                                    title: template.title,
                                    description: template.description,
                                    duration: template.duration,
                                    options: template.option_template || []
                                  };
                                  setSections(updatedSections);
                                  
                                  // Reset select
                                  e.target.value = '';
                                } catch (error) {
                                  console.error('Error changing scenario template:', error);
                                  setError(`Failed to change scenario: ${error.message}`);
                                }
                              }}
                              style={{ fontSize: '0.85rem' }}
                            >
                              <option value="">Select a scenario template...</option>
                              {availableScenarios.map(scenario => (
                                <option key={scenario.id} value={scenario.id}>{scenario.title}</option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Response Options */}
                          <div style={{ marginTop: 'var(--spacing-sm)' }}>
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Response Options</label>
                            {(!section.options || section.options.length === 0) ? (
                              <p style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>No response options defined.</p>
                            ) : (
                              <div style={{ 
                                maxHeight: '120px', 
                                overflowY: 'auto', 
                                border: '1px solid var(--color-gray)', 
                                borderRadius: 'var(--border-radius)',
                                backgroundColor: 'white',
                                padding: '4px'
                              }}>
                                {section.options.map((option, optionIndex) => (
                                  <div 
                                    key={optionIndex}
                                    style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      fontSize: '0.8rem',
                                      padding: '2px 4px',
                                      backgroundColor: optionIndex % 2 === 0 ? 'white' : 'var(--color-light)',
                                      borderRadius: '4px',
                                      marginBottom: '2px'
                                    }}
                                  >
                                    <div>{option.text}</div>
                                    <div style={{ 
                                      color: 'var(--color-gray-dark)', 
                                      backgroundColor: 'var(--color-light)',
                                      padding: '0 4px',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem'
                                    }}>
                                      {option.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {section.type === SECTION_TYPES.BREAK && (
                        <div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Title</label>
                            <input
                              type="text"
                              className="form-control"
                              value={section.title}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], title: e.target.value };
                                setSections(updatedSections);
                                
                                // Update in database
                                supabase
                                  .from('experiment_break_screens')
                                  .update({ title: e.target.value })
                                  .eq('id', section.originalId)
                                  .then(({ error }) => {
                                    if (error) console.error('Error updating break title:', error);
                                  });
                              }}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Content</label>
                            <textarea
                              className="form-control"
                              value={section.content}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], content: e.target.value };
                                setSections(updatedSections);
                                
                                // Update in database
                                supabase
                                  .from('experiment_break_screens')
                                  .update({ content: e.target.value })
                                  .eq('id', section.originalId)
                                  .then(({ error }) => {
                                    if (error) console.error('Error updating break content:', error);
                                  });
                              }}
                              rows="3"
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {section.type === SECTION_TYPES.SURVEY && (
                        <div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Survey Type</label>
                            <div style={{ 
                              display: 'inline-block', 
                              padding: '3px 8px', 
                              backgroundColor: section.is_demographic ? 'var(--color-info)' : 'var(--color-success)',
                              color: 'white',
                              borderRadius: 'var(--border-radius)',
                              fontSize: '0.8rem'
                            }}>
                              {section.is_demographic ? 'Demographic Survey' : 'Custom Survey'}
                            </div>
                          </div>
                          
                          {/* Survey Questions */}
                          <div style={{ marginTop: 'var(--spacing-sm)' }}>
                            <label className="form-label" style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Questions ({section.questions ? section.questions.length : 0})</span>
                              <button
                                type="button"
                                className="button"
                                onClick={() => {
                                  // Add new question logic
                                  const newQuestion = {
                                    experiment_id: experimentId,
                                    question: 'New Question',
                                    type: 'multiple_choice',
                                    options: ['Option A', 'Option B', 'Option C'],
                                    order_index: section.order_index,
                                    is_demographic: section.is_demographic
                                  };
                                  
                                  supabase
                                    .from('experiment_survey_questions')
                                    .insert(newQuestion)
                                    .select()
                                    .single()
                                    .then(({ data, error }) => {
                                      if (error) {
                                        console.error('Error adding question:', error);
                                        return;
                                      }
                                      
                                      // Update state
                                      const updatedSections = [...sections];
                                      const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                      
                                      // Add new question to section
                                      const updatedQuestions = [
                                        ...(updatedSections[sectionIndex].questions || []),
                                        {
                                          id: data.id,
                                          question: data.question,
                                          type: data.type,
                                          options: data.options
                                        }
                                      ];
                                      
                                      updatedSections[sectionIndex].questions = updatedQuestions;
                                      setSections(updatedSections);
                                    });
                                }}
                                style={{ 
                                  padding: '1px 4px', 
                                  fontSize: '0.7rem',
                                  minHeight: '20px',
                                  backgroundColor: 'var(--color-success)'
                                }}
                              >
                                + Add Question
                              </button>
                            </label>
                            
                            {(!section.questions || section.questions.length === 0) ? (
                              <p style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>No questions defined. Click "Add Question" to add a question.</p>
                            ) : (
                              <div style={{ 
                                maxHeight: '250px', 
                                overflowY: 'auto', 
                                border: '1px solid var(--color-gray)', 
                                borderRadius: 'var(--border-radius)',
                                backgroundColor: 'white'
                              }}>
                                {section.questions.map((question, questionIndex) => (
                                  <div 
                                    key={questionIndex}
                                    style={{ 
                                      padding: '6px',
                                      borderBottom: questionIndex < section.questions.length - 1 ? '1px solid var(--color-gray)' : 'none',
                                      backgroundColor: 'white'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={question.question}
                                        onChange={(e) => {
                                          // Update question text in state
                                          const updatedSections = [...sections];
                                          const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                          updatedSections[sectionIndex].questions[questionIndex].question = e.target.value;
                                          setSections(updatedSections);
                                          
                                          // Update in database
                                          supabase
                                            .from('experiment_survey_questions')
                                            .update({ question: e.target.value })
                                            .eq('id', question.id)
                                            .then(({ error }) => {
                                              if (error) console.error('Error updating question:', error);
                                            });
                                        }}
                                        style={{ fontSize: '0.85rem', flex: 1, marginRight: '4px' }}
                                      />
                                      
                                      <select
                                        className="form-control"
                                        value={question.type}
                                        onChange={(e) => {
                                          // Update question type in state
                                          const updatedSections = [...sections];
                                          const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                          updatedSections[sectionIndex].questions[questionIndex].type = e.target.value;
                                          setSections(updatedSections);
                                          
                                          // Update in database
                                          supabase
                                            .from('experiment_survey_questions')
                                            .update({ type: e.target.value })
                                            .eq('id', question.id)
                                            .then(({ error }) => {
                                              if (error) console.error('Error updating question type:', error);
                                            });
                                        }}
                                        style={{ fontSize: '0.85rem', width: '120px' }}
                                      >
                                        <option value="text">Text Input</option>
                                        <option value="multiple_choice">Multiple Choice</option>
                                        <option value="number">Number</option>
                                      </select>
                                      
                                      <button
                                        type="button"
                                        className="danger"
                                        onClick={() => {
                                          // Delete question
                                          if (!confirm(`Delete question: "${question.question}"?`)) return;
                                          
                                          supabase
                                            .from('experiment_survey_questions')
                                            .delete()
                                            .eq('id', question.id)
                                            .then(({ error }) => {
                                              if (error) {
                                                console.error('Error deleting question:', error);
                                                return;
                                              }
                                              
                                              // Update state
                                              const updatedSections = [...sections];
                                              const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                              updatedSections[sectionIndex].questions = updatedSections[sectionIndex].questions.filter(
                                                (_, i) => i !== questionIndex
                                              );
                                              setSections(updatedSections);
                                            });
                                        }}
                                        style={{ 
                                          padding: '0px 4px', 
                                          fontSize: '0.7rem',
                                          minWidth: '20px',
                                          marginLeft: '4px'
                                        }}
                                        title="Delete Question"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    
                                    {/* Options for multiple choice */}
                                    {question.type === 'multiple_choice' && (
                                      <div style={{ marginTop: '4px' }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span>Options</span>
                                          <button
                                            type="button"
                                            className="button"
                                            onClick={() => {
                                              // Add new option
                                              const updatedSections = [...sections];
                                              const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                              const options = [...(updatedSections[sectionIndex].questions[questionIndex].options || []), 'New Option'];
                                              
                                              // Update in state
                                              updatedSections[sectionIndex].questions[questionIndex].options = options;
                                              setSections(updatedSections);
                                              
                                              // Update in database
                                              supabase
                                                .from('experiment_survey_questions')
                                                .update({ options })
                                                .eq('id', question.id)
                                                .then(({ error }) => {
                                                  if (error) console.error('Error adding option:', error);
                                                });
                                            }}
                                            style={{ 
                                              padding: '0px 4px', 
                                              fontSize: '0.7rem',
                                              minHeight: '18px'
                                            }}
                                          >
                                            +
                                          </button>
                                        </label>
                                        
                                        <div style={{ 
                                          display: 'flex', 
                                          flexDirection: 'column', 
                                          gap: '2px',
                                          marginTop: '2px'
                                        }}>
                                          {(question.options || []).map((option, optionIndex) => (
                                            <div key={optionIndex} style={{ display: 'flex', gap: '4px' }}>
                                              <input
                                                type="text"
                                                className="form-control"
                                                value={option}
                                                onChange={(e) => {
                                                  // Update option in state
                                                  const updatedSections = [...sections];
                                                  const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                                  const options = [...updatedSections[sectionIndex].questions[questionIndex].options];
                                                  options[optionIndex] = e.target.value;
                                                  
                                                  updatedSections[sectionIndex].questions[questionIndex].options = options;
                                                  setSections(updatedSections);
                                                  
                                                  // Update in database
                                                  supabase
                                                    .from('experiment_survey_questions')
                                                    .update({ options })
                                                    .eq('id', question.id)
                                                    .then(({ error }) => {
                                                      if (error) console.error('Error updating option:', error);
                                                    });
                                                }}
                                                style={{ fontSize: '0.8rem', flex: 1 }}
                                              />
                                              <button
                                                type="button"
                                                className="danger"
                                                onClick={() => {
                                                  // Remove option
                                                  const updatedSections = [...sections];
                                                  const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
                                                  const options = updatedSections[sectionIndex].questions[questionIndex].options.filter(
                                                    (_, i) => i !== optionIndex
                                                  );
                                                  
                                                  updatedSections[sectionIndex].questions[questionIndex].options = options;
                                                  setSections(updatedSections);
                                                  
                                                  // Update in database
                                                  supabase
                                                    .from('experiment_survey_questions')
                                                    .update({ options })
                                                    .eq('id', question.id)
                                                    .then(({ error }) => {
                                                      if (error) console.error('Error removing option:', error);
                                                    });
                                                }}
                                                style={{ 
                                                  padding: '0px 4px', 
                                                  fontSize: '0.7rem',
                                                  minWidth: '20px'
                                                }}
                                                title="Remove Option"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}// Added a comment
