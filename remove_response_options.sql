-- Script to remove the option_template column from scenario_templates
-- and the options column from experiment_scenarios

-- First update any existing records to have empty options
UPDATE scenario_templates 
SET option_template = '[]'::jsonb
WHERE option_template IS NOT NULL;

UPDATE experiment_scenarios 
SET options = '[]'::jsonb
WHERE options IS NOT NULL;

-- We'll keep the columns in the database but just not use them in the UI
-- This avoids having to update any SQL triggers or other code that might reference these columns
-- In a production environment, you might want to properly drop these columns