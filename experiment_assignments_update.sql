-- Add wallet assignment field to experiment_scenarios table
ALTER TABLE experiment_scenarios
ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;

-- Create index for wallet_id
CREATE INDEX IF NOT EXISTS experiment_scenarios_wallet_id_idx ON experiment_scenarios(wallet_id);

-- Update existing experiment_group_assignments table if it doesn't have these fields
ALTER TABLE experiment_group_assignments
ADD COLUMN IF NOT EXISTS is_control_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Create index for control groups
CREATE INDEX IF NOT EXISTS experiment_group_assignments_control_group_idx ON experiment_group_assignments(experiment_id, is_control_group);

-- Create view for experiment assignment statistics
CREATE OR REPLACE VIEW experiment_assignment_stats AS
SELECT 
  e.id AS experiment_id,
  e.title AS experiment_title,
  count(DISTINCT ega.group_id) AS assigned_groups,
  count(DISTINCT p.id) AS potential_participants,
  count(DISTINCT ep.id) AS actual_participants,
  count(DISTINCT CASE WHEN ep.status = 'completed' THEN ep.id ELSE NULL END) AS completed_participants,
  CASE WHEN count(DISTINCT p.id) > 0 
    THEN round((count(DISTINCT CASE WHEN ep.status = 'completed' THEN ep.id ELSE NULL END)::numeric / count(DISTINCT p.id) * 100), 1)
    ELSE 0
  END AS completion_rate
FROM 
  experiments e
  LEFT JOIN experiment_group_assignments ega ON e.id = ega.experiment_id
  LEFT JOIN participant_groups pg ON ega.group_id = pg.id
  LEFT JOIN participants p ON pg.id = p.group_id
  LEFT JOIN experiment_participations ep ON e.id = ep.experiment_id AND p.id = ep.participant_id
GROUP BY
  e.id, e.title;

-- Generate some dummy data
-- -------------------------------------------------------------------

-- Create demo wallets if they don't exist
DO $$
DECLARE
  demo_wallet_id UUID;
  trading_wallet_id UUID;
  investment_wallet_id UUID;
BEGIN
  -- Check if demo wallet exists
  SELECT id INTO demo_wallet_id FROM wallets WHERE name = 'Demo Wallet' LIMIT 1;
  
  IF demo_wallet_id IS NULL THEN
    INSERT INTO wallets (name, description)
    VALUES ('Demo Wallet', 'Used for experiment simulations')
    RETURNING id INTO demo_wallet_id;
  END IF;
  
  -- Add Trading wallet
  SELECT id INTO trading_wallet_id FROM wallets WHERE name = 'Trading Wallet' LIMIT 1;
  
  IF trading_wallet_id IS NULL THEN
    INSERT INTO wallets (name, description)
    VALUES ('Trading Wallet', 'Short-term trading assets')
    RETURNING id INTO trading_wallet_id;
  END IF;
  
  -- Add Investment wallet
  SELECT id INTO investment_wallet_id FROM wallets WHERE name = 'Investment Wallet' LIMIT 1;
  
  IF investment_wallet_id IS NULL THEN
    INSERT INTO wallets (name, description)
    VALUES ('Investment Wallet', 'Long-term investment assets')
    RETURNING id INTO investment_wallet_id;
  END IF;
END;
$$;

-- Create demo participant groups if they don't exist
DO $$
DECLARE
  students_group_id UUID;
  professionals_group_id UUID;
  seniors_group_id UUID;
BEGIN
  -- Economics Students group
  SELECT id INTO students_group_id FROM participant_groups WHERE name = 'Economics Students' LIMIT 1;
  
  IF students_group_id IS NULL THEN
    INSERT INTO participant_groups (name, description, is_active)
    VALUES ('Economics Students', 'Students from economics department', TRUE)
    RETURNING id INTO students_group_id;
    
    -- Add participants to group
    INSERT INTO participants (group_id, name, email, phone, telegram_id)
    VALUES 
      (students_group_id, 'Alex Johnson', 'alex.j@university.edu', '+1234567890', '@alexj'),
      (students_group_id, 'Sarah Lee', 'slee@university.edu', '+1987654321', '@sarahlee'),
      (students_group_id, 'Mike Chen', 'mchen@university.edu', '+1122334455', '@mikechen'),
      (students_group_id, 'Emma Davis', 'edavis@university.edu', '+1555666777', '@emmad'),
      (students_group_id, 'Tom Wilson', 'twilson@university.edu', '+1444333222', '@tomw');
  END IF;
  
  -- Finance Professionals group
  SELECT id INTO professionals_group_id FROM participant_groups WHERE name = 'Finance Professionals' LIMIT 1;
  
  IF professionals_group_id IS NULL THEN
    INSERT INTO participant_groups (name, description, is_active)
    VALUES ('Finance Professionals', 'Working professionals in finance sector', TRUE)
    RETURNING id INTO professionals_group_id;
    
    -- Add participants to group
    INSERT INTO participants (group_id, name, email, phone, telegram_id)
    VALUES 
      (professionals_group_id, 'Jennifer Smith', 'jsmith@finance.com', '+1777888999', '@jensmith'),
      (professionals_group_id, 'Robert Brown', 'rbrown@finance.com', '+1666777888', '@robbrown'),
      (professionals_group_id, 'Lisa Wong', 'lwong@finance.com', '+1555444333', '@lisawong'),
      (professionals_group_id, 'David Martinez', 'dmartinez@finance.com', '+1444555666', '@davem');
  END IF;
  
  -- Senior Citizens group
  SELECT id INTO seniors_group_id FROM participant_groups WHERE name = 'Senior Citizens' LIMIT 1;
  
  IF seniors_group_id IS NULL THEN
    INSERT INTO participant_groups (name, description, is_active)
    VALUES ('Senior Citizens', 'Retirement-age participants', TRUE)
    RETURNING id INTO seniors_group_id;
    
    -- Add participants to group
    INSERT INTO participants (group_id, name, email, phone, telegram_id)
    VALUES 
      (seniors_group_id, 'Margaret Johnson', 'mjohnson@seniormail.com', '+1333222111', '@maggiej'),
      (seniors_group_id, 'George Thompson', 'gthompson@seniormail.com', '+1222333444', '@georget'),
      (seniors_group_id, 'Barbara Lewis', 'blewis@seniormail.com', '+1111222333', '@barbaral');
  END IF;
END;
$$;

-- Create demo experiments with scenarios, including wallet assignments and group assignments
DO $$
DECLARE
  risk_exp_id UUID;
  investment_exp_id UUID;
  students_group_id UUID;
  professionals_group_id UUID;
  seniors_group_id UUID;
  demo_wallet_id UUID;
  trading_wallet_id UUID;
  investment_wallet_id UUID;
BEGIN
  -- Get wallet IDs
  SELECT id INTO demo_wallet_id FROM wallets WHERE name = 'Demo Wallet' LIMIT 1;
  SELECT id INTO trading_wallet_id FROM wallets WHERE name = 'Trading Wallet' LIMIT 1;
  SELECT id INTO investment_wallet_id FROM wallets WHERE name = 'Investment Wallet' LIMIT 1;
  
  -- Get group IDs
  SELECT id INTO students_group_id FROM participant_groups WHERE name = 'Economics Students' LIMIT 1;
  SELECT id INTO professionals_group_id FROM participant_groups WHERE name = 'Finance Professionals' LIMIT 1;
  SELECT id INTO seniors_group_id FROM participant_groups WHERE name = 'Senior Citizens' LIMIT 1;
  
  -- 1. Risk Assessment Experiment
  SELECT id INTO risk_exp_id FROM experiments WHERE title = 'Risk Assessment Experiment' LIMIT 1;
  
  IF risk_exp_id IS NULL THEN
    INSERT INTO experiments (title, description, status, scenario_count, participant_count)
    VALUES ('Risk Assessment Experiment', 'Study how different groups assess financial risk', 'active', 3, 0)
    RETURNING id INTO risk_exp_id;
    
    -- Add intro screens
    INSERT INTO experiment_intro_screens (experiment_id, title, content, order_index)
    VALUES
      (risk_exp_id, 'Welcome to Risk Assessment', 'This experiment will test how you evaluate financial risks. Your responses will help us understand risk perception across different demographic groups.', 0),
      (risk_exp_id, 'Instructions', 'You will be presented with different scenarios involving financial decisions. Please select the option that best matches what you would do in real life.', 1);
    
    -- Add scenarios with wallet assignments
    INSERT INTO experiment_scenarios (experiment_id, title, description, duration, options, order_index, wallet_id)
    VALUES
      (risk_exp_id, 'Investment Choice', 'You have $10,000 to invest. Which option would you choose?', 180, 
       '[{"text": "Safe bonds with 3% guaranteed return", "value": "A"}, {"text": "Index fund with historical 7% average return", "value": "B"}, {"text": "Cryptocurrency with potential for high returns but high volatility", "value": "C"}]',
       0, demo_wallet_id),
      (risk_exp_id, 'Trading Decision', 'You own shares that have dropped 15% in value. What would you do?', 180, 
       '[{"text": "Sell immediately to prevent further losses", "value": "A"}, {"text": "Hold and wait for recovery", "value": "B"}, {"text": "Buy more at the lower price", "value": "C"}]',
       1, trading_wallet_id),
      (risk_exp_id, 'Retirement Planning', 'How would you allocate your retirement portfolio?', 180, 
       '[{"text": "Mostly bonds and fixed income (low risk)", "value": "A"}, {"text": "Balanced mix of stocks and bonds", "value": "B"}, {"text": "Mostly stocks with some alternative investments", "value": "C"}]',
       2, investment_wallet_id);
    
    -- Add break screens
    INSERT INTO experiment_break_screens (experiment_id, title, content, order_index)
    VALUES
      (risk_exp_id, 'Short Break', 'You have completed the first scenario. Take a moment to relax before continuing.', 0),
      (risk_exp_id, 'Another Break', 'Good job! Take another short break before the final scenario.', 1);
    
    -- Add survey questions
    INSERT INTO experiment_survey_questions (experiment_id, question, type, options, order_index)
    VALUES
      (risk_exp_id, 'How comfortable are you with financial risk in general?', 'multiple_choice', 
       '["Very uncomfortable", "Somewhat uncomfortable", "Neutral", "Somewhat comfortable", "Very comfortable"]', 0),
      (risk_exp_id, 'What is your primary goal when investing?', 'multiple_choice', 
       '["Preserving capital", "Generating income", "Long-term growth", "Maximum growth regardless of risk"]', 1),
      (risk_exp_id, 'How many years of investing experience do you have?', 'number', NULL, 2),
      (risk_exp_id, 'What factors most influence your investment decisions?', 'text', NULL, 3);
      
    -- Assign groups to experiment
    INSERT INTO experiment_group_assignments (experiment_id, group_id, is_active, is_control_group, assignment_date)
    VALUES
      (risk_exp_id, students_group_id, TRUE, FALSE, CURRENT_TIMESTAMP),
      (risk_exp_id, professionals_group_id, TRUE, FALSE, CURRENT_TIMESTAMP),
      (risk_exp_id, seniors_group_id, TRUE, TRUE, CURRENT_TIMESTAMP);
  END IF;
  
  -- 2. Investment Behavior Experiment
  SELECT id INTO investment_exp_id FROM experiments WHERE title = 'Investment Behavior Study' LIMIT 1;
  
  IF investment_exp_id IS NULL THEN
    INSERT INTO experiments (title, description, status, scenario_count, participant_count)
    VALUES ('Investment Behavior Study', 'Analyze how different groups make investment decisions under various market conditions', 'draft', 2, 0)
    RETURNING id INTO investment_exp_id;
    
    -- Add intro screens
    INSERT INTO experiment_intro_screens (experiment_id, title, content, order_index)
    VALUES
      (investment_exp_id, 'Investment Behavior Study', 'This experiment examines how people make investment decisions under different market conditions.', 0),
      (investment_exp_id, 'How It Works', 'You will see scenarios describing market situations and be asked to make investment decisions. Please consider each scenario carefully.', 1);
    
    -- Add scenarios with wallet assignments
    INSERT INTO experiment_scenarios (experiment_id, title, description, duration, options, order_index, wallet_id)
    VALUES
      (investment_exp_id, 'Bull Market', 'The market has been rising steadily for 3 years. How would you position your portfolio?', 240, 
       '[{"text": "Take profits and move to cash", "value": "A"}, {"text": "Hold current positions", "value": "B"}, {"text": "Increase equity exposure", "value": "C"}]',
       0, trading_wallet_id),
      (investment_exp_id, 'Market Crash', 'The market has crashed 30% in the last month. What action would you take?', 240, 
       '[{"text": "Sell to prevent further losses", "value": "A"}, {"text": "Do nothing and wait", "value": "B"}, {"text": "Buy more while prices are low", "value": "C"}]',
       1, investment_wallet_id);
    
    -- Add break screens
    INSERT INTO experiment_break_screens (experiment_id, title, content, order_index)
    VALUES
      (investment_exp_id, 'Take a Moment', 'Please take a short break before continuing to the next scenario.', 0);
    
    -- Add survey questions
    INSERT INTO experiment_survey_questions (experiment_id, question, type, options, order_index)
    VALUES
      (investment_exp_id, 'How would you rate your investment knowledge?', 'multiple_choice', 
       '["Novice", "Beginner", "Intermediate", "Advanced", "Expert"]', 0),
      (investment_exp_id, 'How often do you check your investments?', 'multiple_choice', 
       '["Daily", "Weekly", "Monthly", "Quarterly", "Annually or less"]', 1),
      (investment_exp_id, 'What is your investment time horizon?', 'multiple_choice', 
       '["Less than 1 year", "1-5 years", "6-10 years", "More than 10 years"]', 2);
      
    -- Assign groups to experiment
    INSERT INTO experiment_group_assignments (experiment_id, group_id, is_active, is_control_group, assignment_date)
    VALUES
      (investment_exp_id, students_group_id, TRUE, TRUE, CURRENT_TIMESTAMP),
      (investment_exp_id, professionals_group_id, TRUE, FALSE, CURRENT_TIMESTAMP);
  END IF;
END;
$$;