-- First ensure the round_duration column exists in both tables
ALTER TABLE scenario_templates ADD COLUMN IF NOT EXISTS round_duration INTEGER DEFAULT 10;
ALTER TABLE experiment_scenarios ADD COLUMN IF NOT EXISTS round_duration INTEGER DEFAULT 10;

-- Update the copy_scenario_data_from_template function to include round_duration
CREATE OR REPLACE FUNCTION copy_scenario_data_from_template()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if scenario_template_id is set
  IF NEW.scenario_template_id IS NOT NULL THEN
    -- Get data from template
    SELECT 
      title, 
      description, 
      duration, 
      wallet_id, 
      option_template,
      round_duration
    INTO 
      NEW.title, 
      NEW.description, 
      NEW.duration, 
      NEW.wallet_id, 
      NEW.options,
      NEW.round_duration
    FROM 
      scenario_templates
    WHERE 
      id = NEW.scenario_template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing experiment scenarios with round_duration from their templates
UPDATE experiment_scenarios es
SET round_duration = st.round_duration
FROM scenario_templates st
WHERE es.scenario_template_id = st.id
AND es.round_duration IS NULL;