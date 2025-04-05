-- Add rounds column to both scenario tables if they don't exist
ALTER TABLE scenario_templates ADD COLUMN IF NOT EXISTS rounds INTEGER DEFAULT 3;
ALTER TABLE experiment_scenarios ADD COLUMN IF NOT EXISTS rounds INTEGER DEFAULT 3;

-- Update the copy_scenario_data_from_template function to include rounds
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
      round_duration,
      rounds
    INTO 
      NEW.title, 
      NEW.description, 
      NEW.duration, 
      NEW.wallet_id, 
      NEW.options,
      NEW.round_duration,
      NEW.rounds
    FROM 
      scenario_templates
    WHERE 
      id = NEW.scenario_template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing scenarios with default rounds
UPDATE scenario_templates 
SET rounds = 3 
WHERE rounds IS NULL;

UPDATE experiment_scenarios 
SET rounds = 3 
WHERE rounds IS NULL;

-- Copy rounds value from templates for existing experiment scenarios
UPDATE experiment_scenarios es
SET rounds = st.rounds
FROM scenario_templates st
WHERE es.scenario_template_id = st.id
AND es.scenario_template_id IS NOT NULL;