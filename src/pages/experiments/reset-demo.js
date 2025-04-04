import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import supabase from '../../lib/supabase';
import ExperimentSections from '../../components/ExperimentSections';

const experimentTitles = [
  "Investment Decision Experiment",
  "Risk Preference Study",
  "Market Behavior Analysis",
  "Cryptocurrency Trading Simulation",
  "Financial Decision Making"
];

const experimentDescriptions = [
  "This experiment evaluates investment decisions under different market conditions.",
  "A study to understand risk preferences in financial decision making scenarios.",
  "Analysis of participant behavior in simulated market conditions.",
  "Simulation of cryptocurrency trading decisions and strategy evaluation.",
  "Study of financial decision making behaviors in controlled scenarios."
];

export default function ResetDemoExperiments() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [sectionsComponent, setSectionsComponent] = useState(null);
  
  // Reset experiments function - delete old, create new
  const resetExperiments = async () => {
    try {
      setLoading(true);
      setProgress('Deleting existing experiments...');
      
      // Delete all existing experiments
      const { error: deleteError } = await supabase
        .from('experiments')
        .delete()
        .gt('id', 0);
        
      if (deleteError) throw deleteError;
      
      setProgress('Creating new experiments with default sections...');
      
      // Create 5 new experiments with default settings
      for (let i = 0; i < 5; i++) {
        setProgress(`Creating experiment ${i+1} of 5...`);
        
        // Create experiment
        const { data: experimentData, error: experimentError } = await supabase
          .from('experiments')
          .insert({
            title: experimentTitles[i],
            description: experimentDescriptions[i],
            status: i < 2 ? 'active' : 'draft',
            scenario_count: 3,
            participant_count: 0
          })
          .select()
          .single();
          
        if (experimentError) throw experimentError;
        
        // Create default sections
        await createDefaultSections(experimentData.id);
        
        // Add delay to prevent potential rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setProgress('All experiments created successfully!');
      setIsComplete(true);
      
    } catch (error) {
      console.error('Error resetting experiments:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
      
      // Create a dummy scenario template if none exists
      const { data: scenarioTemplates, error: scenarioError } = await supabase
        .from('scenario_templates')
        .select('id, title, description, duration, options')
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
            options: [
              { value: 'option_a', text: 'Invest in Stock A' },
              { value: 'option_b', text: 'Invest in Stock B' },
              { value: 'option_c', text: 'Keep funds in cash' }
            ]
          },
          {
            title: 'Market Timing',
            description: 'Decide when to enter or exit the market.',
            duration: 45,
            options: [
              { value: 'buy', text: 'Buy now' },
              { value: 'wait', text: 'Wait for a better entry point' },
              { value: 'sell', text: 'Sell current holdings' }
            ]
          },
          {
            title: 'Cryptocurrency Trade',
            description: 'Make a decision about your cryptocurrency holdings.',
            duration: 60,
            options: [
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
                options: [
                  { value: 'option_a', text: 'Invest in Stock A' },
                  { value: 'option_b', text: 'Invest in Stock B' },
                  { value: 'option_c', text: 'Keep funds in cash' }
                ]
              },
              {
                title: 'Market Timing',
                description: 'Decide when to enter or exit the market.',
                duration: 45,
                options: [
                  { value: 'buy', text: 'Buy now' },
                  { value: 'wait', text: 'Wait for a better entry point' },
                  { value: 'sell', text: 'Sell current holdings' }
                ]
              },
              {
                title: 'Cryptocurrency Trade',
                description: 'Make a decision about your cryptocurrency holdings.',
                duration: 60,
                options: [
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
              options: templateToUse.options,
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
  
  return (
    <Layout title="Reset Demo Experiments">
      <div className="card">
        <h1>Reset Experiment Data</h1>
        
        <p className="mb-3">
          This utility will delete all existing experiments and create 5 new demo experiments 
          with the default structure: welcome screen, instructions, three scenarios with info 
          screens between them, and a demographic survey at the end.
        </p>
        
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
        
        {progress && (
          <div style={{ 
            backgroundColor: 'var(--color-light)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--border-radius)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <p><strong>Progress:</strong> {progress}</p>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button 
            className="button danger" 
            onClick={resetExperiments}
            disabled={loading || isComplete}
          >
            {loading ? 'Working...' : isComplete ? 'Completed' : 'Reset Experiments'}
          </button>
          
          <button 
            className="button" 
            onClick={() => router.push('/experiments')}
          >
            Back to Experiments
          </button>
        </div>
        
        {isComplete && (
          <div style={{ 
            backgroundColor: 'var(--color-success)', 
            color: 'white',
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--border-radius)',
            marginTop: 'var(--spacing-md)'
          }}>
            <p style={{ marginBottom: 'var(--spacing-sm)' }}>
              <strong>Success!</strong> 5 new demo experiments have been created with the default sections.
            </p>
            <button 
              className="button"
              style={{ backgroundColor: 'white', color: 'var(--color-success)' }}
              onClick={() => router.push('/experiments')}
            >
              Go to Experiments List
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}