-- Add metadata column to experiment_participants if it doesn't exist
ALTER TABLE experiment_participants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Check if the experiment_survey_responses table has proper foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'experiment_survey_responses_participant_id_fkey'
    ) THEN
        -- Add the missing foreign key constraint
        ALTER TABLE experiment_survey_responses
        ADD CONSTRAINT experiment_survey_responses_participant_id_fkey
        FOREIGN KEY (participant_id) REFERENCES experiment_participants(id)
        ON DELETE CASCADE;
    END IF;
END;
$$;

-- Create index on metadata fields for querying
CREATE INDEX IF NOT EXISTS experiment_participants_metadata_access_code_idx ON experiment_participants ((metadata->>'access_code'));

-- Update existing participant records to have empty metadata
UPDATE experiment_participants
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

-- Ensure experiment_scenario_responses has response_time column
ALTER TABLE experiment_scenario_responses
ALTER COLUMN response_time SET DEFAULT 0;

-- Add description of this script
COMMENT ON TABLE experiment_participants IS 'Table storing experiment participants with metadata including access codes and browser information';