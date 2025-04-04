-- Create experiment tables if they don't exist

-- Main experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'active', 'completed')) DEFAULT 'draft',
  scenario_count INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID
);

-- Intro screens for experiments
CREATE TABLE IF NOT EXISTS experiment_intro_screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenarios for experiments
CREATE TABLE IF NOT EXISTS experiment_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 300, -- in seconds
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Break screens between scenarios
CREATE TABLE IF NOT EXISTS experiment_break_screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey questions for after the experiment
CREATE TABLE IF NOT EXISTS experiment_survey_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT CHECK (type IN ('multiple_choice', 'text', 'number')) DEFAULT 'multiple_choice',
  options JSONB DEFAULT '[]'::jsonb, -- For multiple choice questions
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants in experiments
CREATE TABLE IF NOT EXISTS experiment_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL, -- Could be email, user ID, or anonymous ID
  status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant responses to scenarios
CREATE TABLE IF NOT EXISTS experiment_scenario_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES experiment_scenarios(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES experiment_participants(id) ON DELETE CASCADE,
  response TEXT NOT NULL, -- The option value selected
  response_time INTEGER, -- Time taken to respond in milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participant responses to survey questions
CREATE TABLE IF NOT EXISTS experiment_survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  question_id UUID REFERENCES experiment_survey_questions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES experiment_participants(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS experiment_intro_screens_experiment_id_idx ON experiment_intro_screens(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_scenarios_experiment_id_idx ON experiment_scenarios(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_break_screens_experiment_id_idx ON experiment_break_screens(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_survey_questions_experiment_id_idx ON experiment_survey_questions(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_participants_experiment_id_idx ON experiment_participants(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_scenario_responses_experiment_id_idx ON experiment_scenario_responses(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_scenario_responses_participant_id_idx ON experiment_scenario_responses(participant_id);
CREATE INDEX IF NOT EXISTS experiment_survey_responses_experiment_id_idx ON experiment_survey_responses(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_survey_responses_participant_id_idx ON experiment_survey_responses(participant_id);

-- Enable Row Level Security
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_intro_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_break_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_scenario_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_survey_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo purposes)
CREATE POLICY "Allow anonymous access to experiments" ON experiments
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_intro_screens" ON experiment_intro_screens
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_scenarios" ON experiment_scenarios
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_break_screens" ON experiment_break_screens
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_survey_questions" ON experiment_survey_questions
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_participants" ON experiment_participants
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_scenario_responses" ON experiment_scenario_responses
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_survey_responses" ON experiment_survey_responses
  FOR ALL USING (true);

-- Create function to update participant count
CREATE OR REPLACE FUNCTION update_experiment_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE experiments
    SET participant_count = participant_count + 1
    WHERE id = NEW.experiment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update participant count
CREATE TRIGGER update_experiment_participant_count_trigger
AFTER INSERT ON experiment_participants
FOR EACH ROW
EXECUTE FUNCTION update_experiment_participant_count();

-- Create demo experiment
INSERT INTO experiments (
  id, 
  title, 
  description, 
  status, 
  scenario_count, 
  participant_count
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Economic Decision Making',
  'A sample experiment to study decision making under different economic scenarios',
  'active',
  2,
  0
);

-- Add intro screens
INSERT INTO experiment_intro_screens (
  experiment_id,
  title,
  content,
  order_index
)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Welcome', 'Welcome to this economic decision making experiment. You will be presented with different scenarios where you need to make choices. Your choices will be anonymously recorded.', 0),
  ('00000000-0000-0000-0000-000000000001', 'Instructions', 'Please read each scenario carefully and select the option that best represents your decision. There are no right or wrong answers - we are interested in your natural decision making process.', 1);

-- Add scenarios
INSERT INTO experiment_scenarios (
  experiment_id,
  title,
  description,
  duration,
  options,
  order_index
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Resource Allocation',
    'You have 100 tokens that you can allocate between yourself and an anonymous partner. How would you split the tokens?',
    300,
    '[
      {"text": "Keep all 100 tokens for yourself", "value": "A"},
      {"text": "Split 50/50 (50 tokens each)", "value": "B"},
      {"text": "Give all 100 tokens to your partner", "value": "C"}
    ]',
    0
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Risk Assessment',
    'You can choose between a guaranteed payment of 50 tokens, or a 50% chance of receiving 100 tokens (and 50% chance of receiving nothing). Which would you prefer?',
    300,
    '[
      {"text": "Guaranteed 50 tokens", "value": "A"},
      {"text": "50% chance of 100 tokens", "value": "B"}
    ]',
    1
  );

-- Add break screen
INSERT INTO experiment_break_screens (
  experiment_id,
  title,
  content,
  order_index
)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Short Break', 'You have completed the first scenario. Please take a short break before continuing to the next scenario.', 0);

-- Add survey questions
INSERT INTO experiment_survey_questions (
  experiment_id,
  question,
  type,
  options,
  order_index
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'How would you rate your confidence in the decisions you made?',
    'multiple_choice',
    '["Very low", "Low", "Moderate", "High", "Very high"]',
    0
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'What factors influenced your decisions the most?',
    'text',
    null,
    1
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'On a scale from 1-10, how much did you enjoy participating in this experiment?',
    'number',
    null,
    2
  );