import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import supabase from '../../../lib/supabase';

export default function ExperimentPreview() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [introScreens, setIntroScreens] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [breakScreens, setBreakScreens] = useState([]);
  const [surveyQuestions, setSurveyQuestions] = useState([]);
  
  // Current state tracking
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSection, setCurrentSection] = useState('intro'); // intro, scenario, break, survey, completed
  const [responses, setResponses] = useState({
    scenarios: {},
    survey: {}
  });
  
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
  
  const handleNext = () => {
    // Logic to move to the next step based on current section
    if (currentSection === 'intro') {
      if (currentStep < introScreens.length - 1) {
        // Move to next intro screen
        setCurrentStep(currentStep + 1);
      } else {
        // Move to first scenario
        setCurrentSection('scenario');
        setCurrentStep(0);
      }
    } else if (currentSection === 'scenario') {
      // Check if there's a break screen after this scenario
      if (breakScreens[currentStep]) {
        setCurrentSection('break');
        setCurrentStep(currentStep);
      } else if (currentStep < scenarios.length - 1) {
        // Move to next scenario
        setCurrentStep(currentStep + 1);
      } else {
        // Move to survey
        setCurrentSection('survey');
        setCurrentStep(0);
      }
    } else if (currentSection === 'break') {
      if (currentStep < scenarios.length - 1) {
        // Move to next scenario
        setCurrentSection('scenario');
        setCurrentStep(currentStep + 1);
      } else {
        // Move to survey
        setCurrentSection('survey');
        setCurrentStep(0);
      }
    } else if (currentSection === 'survey') {
      if (currentStep < surveyQuestions.length - 1) {
        // Move to next survey question
        setCurrentStep(currentStep + 1);
      } else {
        // Complete the experiment
        setCurrentSection('completed');
      }
    }
  };
  
  const handleScenarioResponse = (scenarioId, response) => {
    setResponses({
      ...responses,
      scenarios: {
        ...responses.scenarios,
        [scenarioId]: response
      }
    });
  };
  
  const handleSurveyResponse = (questionId, response) => {
    setResponses({
      ...responses,
      survey: {
        ...responses.survey,
        [questionId]: response
      }
    });
  };
  
  const handleSubmit = async () => {
    try {
      // In a real implementation, this would submit the responses to the database
      console.log('Responses submitted:', responses);
      
      // For preview, just show a success message
      alert('Responses submitted successfully!');
      
      // Redirect back to the experiment view page
      window.close();
      
    } catch (error) {
      console.error('Error submitting responses:', error);
      setError('Error submitting responses. Please try again.');
    }
  };
  
  // Determine if the Next button should be disabled
  const isNextDisabled = () => {
    if (currentSection === 'scenario') {
      const currentScenario = scenarios[currentStep];
      return !currentScenario || !responses.scenarios[currentScenario.id];
    }
    
    if (currentSection === 'survey') {
      const currentQuestion = surveyQuestions[currentStep];
      return !currentQuestion || !responses.survey[currentQuestion.id];
    }
    
    return false;
  };
  
  // Render the current step based on the section
  const renderCurrentStep = () => {
    if (currentSection === 'intro' && introScreens.length > 0) {
      const introScreen = introScreens[currentStep];
      
      return (
        <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
          <h2>{introScreen.title}</h2>
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            margin: 'var(--spacing-md) 0' 
          }}>
            {introScreen.content}
          </div>
        </div>
      );
    }
    
    if (currentSection === 'scenario' && scenarios.length > 0) {
      const scenario = scenarios[currentStep];
      const selectedOption = responses.scenarios[scenario.id];
      
      return (
        <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
          <h2>{scenario.title}</h2>
          <p style={{ 
            whiteSpace: 'pre-wrap', 
            margin: 'var(--spacing-md) 0' 
          }}>
            {scenario.description}
          </p>
          
          <div style={{ margin: 'var(--spacing-md) 0' }}>
            <h3>Choose an option:</h3>
            
            {scenario.options && scenario.options.map((option, index) => (
              <div 
                key={index} 
                className="card" 
                style={{ 
                  marginBottom: 'var(--spacing-sm)',
                  backgroundColor: selectedOption === option.value ? 'var(--color-primary)' : 'white',
                  color: selectedOption === option.value ? 'white' : 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleScenarioResponse(scenario.id, option.value)}
              >
                <strong>{option.value}:</strong> {option.text}
              </div>
            ))}
          </div>
          
          <div style={{ 
            textAlign: 'center',
            margin: 'var(--spacing-md) 0',
            fontSize: '0.9rem',
            color: 'var(--color-gray-dark)'
          }}>
            Time remaining: {scenario.duration} seconds
          </div>
        </div>
      );
    }
    
    if (currentSection === 'break' && breakScreens.length > 0) {
      const breakScreen = breakScreens[currentStep];
      
      return (
        <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
          <h2>{breakScreen.title}</h2>
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            margin: 'var(--spacing-md) 0' 
          }}>
            {breakScreen.content}
          </div>
        </div>
      );
    }
    
    if (currentSection === 'survey' && surveyQuestions.length > 0) {
      const question = surveyQuestions[currentStep];
      const selectedResponse = responses.survey[question.id];
      
      return (
        <div className="card" style={{ backgroundColor: 'var(--color-light)' }}>
          <h2>Survey Question {currentStep + 1}</h2>
          <p style={{ 
            margin: 'var(--spacing-md) 0',
            fontWeight: '500'
          }}>
            {question.question}
          </p>
          
          {question.type === 'multiple_choice' && (
            <div style={{ margin: 'var(--spacing-md) 0' }}>
              {question.options && question.options.map((option, index) => (
                <div 
                  key={index} 
                  className="card" 
                  style={{ 
                    marginBottom: 'var(--spacing-sm)',
                    backgroundColor: selectedResponse === option ? 'var(--color-primary)' : 'white',
                    color: selectedResponse === option ? 'white' : 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleSurveyResponse(question.id, option)}
                >
                  {option}
                </div>
              ))}
            </div>
          )}
          
          {question.type === 'text' && (
            <div style={{ margin: 'var(--spacing-md) 0' }}>
              <textarea
                className="form-control"
                value={selectedResponse || ''}
                onChange={(e) => handleSurveyResponse(question.id, e.target.value)}
                rows="4"
                placeholder="Enter your response here..."
              ></textarea>
            </div>
          )}
          
          {question.type === 'number' && (
            <div style={{ margin: 'var(--spacing-md) 0' }}>
              <input
                type="number"
                className="form-control"
                value={selectedResponse || ''}
                onChange={(e) => handleSurveyResponse(question.id, e.target.value)}
                placeholder="Enter a number..."
              />
            </div>
          )}
        </div>
      );
    }
    
    if (currentSection === 'completed') {
      return (
        <div className="card" style={{ 
          backgroundColor: 'var(--color-success)', 
          color: 'white',
          textAlign: 'center'
        }}>
          <h2>Experiment Completed!</h2>
          <p style={{ margin: 'var(--spacing-md) 0' }}>
            Thank you for participating in this experiment.
          </p>
          <p>
            Your responses have been recorded.
          </p>
        </div>
      );
    }
    
    return <p>No content available for this step.</p>;
  };
  
  // Progress bar calculation
  const calculateProgress = () => {
    let totalSteps = introScreens.length + scenarios.length + breakScreens.length + surveyQuestions.length;
    let completedSteps = 0;
    
    if (currentSection === 'intro') {
      completedSteps = currentStep;
    } else if (currentSection === 'scenario') {
      completedSteps = introScreens.length + currentStep;
    } else if (currentSection === 'break') {
      completedSteps = introScreens.length + currentStep + 1;
    } else if (currentSection === 'survey') {
      completedSteps = introScreens.length + scenarios.length + breakScreens.length + currentStep;
    } else if (currentSection === 'completed') {
      completedSteps = totalSteps;
    }
    
    return (completedSteps / totalSteps) * 100;
  };
  
  if (loading) {
    return (
      <Layout title="Experiment Preview">
        <div className="card">
          <h1>Loading Experiment...</h1>
          <p>Please wait while we prepare the experiment for you.</p>
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
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title={`${experiment.title} - Preview`}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <h1>{experiment.title}</h1>
          <p>This is a preview of how participants will see the experiment.</p>
          
          {/* Progress bar */}
          <div style={{ 
            height: '6px', 
            backgroundColor: 'var(--color-gray)', 
            borderRadius: 'var(--border-radius)',
            margin: 'var(--spacing-md) 0' 
          }}>
            <div style={{ 
              height: '100%', 
              width: `${calculateProgress()}%`, 
              backgroundColor: 'var(--color-success)',
              borderRadius: 'var(--border-radius)',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            color: 'var(--color-gray-dark)'
          }}>
            <div>
              Section: {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
            </div>
            <div>
              Step {
                currentSection === 'completed' 
                  ? 'Complete' 
                  : `${currentStep + 1} of ${
                      currentSection === 'intro' ? introScreens.length :
                      currentSection === 'scenario' ? scenarios.length :
                      currentSection === 'break' ? breakScreens.length :
                      surveyQuestions.length
                    }`
              }
            </div>
          </div>
        </div>
        
        {/* Current step content */}
        {renderCurrentStep()}
        
        {/* Navigation buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          marginTop: 'var(--spacing-md)'
        }}>
          {currentSection !== 'completed' ? (
            <button 
              className="button success" 
              onClick={handleNext}
              disabled={isNextDisabled()}
              style={{ 
                opacity: isNextDisabled() ? 0.7 : 1,
                cursor: isNextDisabled() ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          ) : (
            <button 
              className="button success" 
              onClick={handleSubmit}
            >
              Finish & Submit
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}