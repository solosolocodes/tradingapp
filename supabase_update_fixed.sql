-- SQL script to update Supabase schema for crypto-tracker-simple-clean
-- This script fixes option field naming inconsistencies and updates tables

-- Step 1: Check if we need to add option_template column to scenario_templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'scenario_templates'
                AND column_name = 'option_template') THEN
    ALTER TABLE public.scenario_templates
    ADD COLUMN option_template JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Step 2: Check if we need to migrate data from options to option_template
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'scenario_templates'
             AND column_name = 'options') THEN
    -- Copy data from options to option_template where option_template is null or empty
    UPDATE public.scenario_templates
    SET option_template = options
    WHERE (option_template IS NULL OR option_template = '[]'::jsonb) AND options IS NOT NULL;
    
    -- Remove options column if it exists
    ALTER TABLE public.scenario_templates DROP COLUMN IF EXISTS options;
  END IF;
END $$;

-- Step 3: Make sure scenario_count is correctly updated in experiments
UPDATE public.experiments e
SET scenario_count = (
  SELECT COUNT(*)
  FROM public.experiment_scenarios s
  WHERE s.experiment_id = e.id
)
WHERE TRUE;

-- Step 4: Make sure experiment_scenarios uses option_template data for options
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'experiment_scenarios'
                AND column_name = 'options') THEN
    ALTER TABLE public.experiment_scenarios
    ADD COLUMN options JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Step 5: Create default option_template for scenario_templates if it's empty
UPDATE public.scenario_templates
SET option_template = '[{"value": "option_a", "text": "Option A"}, {"value": "option_b", "text": "Option B"}]'::jsonb
WHERE option_template IS NULL OR option_template = '[]'::jsonb;

-- Step 6: Create default options for experiment_scenarios if empty
UPDATE public.experiment_scenarios
SET options = '[{"value": "option_a", "text": "Option A"}, {"value": "option_b", "text": "Option B"}]'::jsonb
WHERE options IS NULL OR options = '[]'::jsonb;

-- Step 7: Create default experiment_intro_screens to ensure experiments have intro content
INSERT INTO public.experiment_intro_screens (experiment_id, title, content, order_index)
SELECT e.id, 'Welcome to the Experiment', 'Thank you for participating in this experiment. Your responses will help us better understand economic decision-making.', 0
FROM public.experiments e
WHERE NOT EXISTS (
  SELECT 1 FROM public.experiment_intro_screens eis
  WHERE eis.experiment_id = e.id
) AND e.id IS NOT NULL;

-- Step 8: Check if is_demographic column exists, add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'experiment_survey_questions'
                AND column_name = 'is_demographic') THEN
    ALTER TABLE public.experiment_survey_questions
    ADD COLUMN is_demographic BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Step 9: Create default demographic survey questions if none exist
INSERT INTO public.experiment_survey_questions (experiment_id, question, type, options, order_index, is_demographic)
SELECT e.id, 'What is your age?', 'number', NULL, 0, TRUE
FROM public.experiments e
WHERE NOT EXISTS (
  SELECT 1 FROM public.experiment_survey_questions sq
  WHERE sq.experiment_id = e.id AND sq.is_demographic = TRUE
) AND e.id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'experiment_survey_questions'
  AND column_name = 'is_demographic'
);

INSERT INTO public.experiment_survey_questions (experiment_id, question, type, options, order_index, is_demographic)
SELECT e.id, 'What is your gender?', 'multiple_choice', ARRAY['Male', 'Female', 'Non-binary', 'Prefer not to say'], 1, TRUE
FROM public.experiments e
WHERE EXISTS (
  SELECT 1 FROM public.experiment_survey_questions sq
  WHERE sq.experiment_id = e.id AND sq.is_demographic = TRUE
) AND NOT EXISTS (
  SELECT 1 FROM public.experiment_survey_questions sq
  WHERE sq.experiment_id = e.id AND sq.question = 'What is your gender?'
) AND e.id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'experiment_survey_questions'
  AND column_name = 'is_demographic'
);

-- Step 10: Update RLS policies to ensure proper access to experiment_scenarios
ALTER TABLE public.experiment_scenarios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'experiment_scenarios' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" 
    ON public.experiment_scenarios FOR SELECT 
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'experiment_scenarios' AND policyname = 'Enable insert for authenticated users only'
  ) THEN  
    CREATE POLICY "Enable insert for authenticated users only" 
    ON public.experiment_scenarios FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'experiment_scenarios' AND policyname = 'Enable update for authenticated users only'
  ) THEN
    CREATE POLICY "Enable update for authenticated users only" 
    ON public.experiment_scenarios FOR UPDATE 
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Step 11: Fix any experiment sections that have null fields
UPDATE public.experiment_intro_screens
SET title = 'Information Page'
WHERE title IS NULL;

UPDATE public.experiment_intro_screens
SET content = 'Please read this information carefully.'
WHERE content IS NULL;

UPDATE public.experiment_break_screens
SET title = 'Break Screen'
WHERE title IS NULL;

UPDATE public.experiment_break_screens
SET content = 'Take a moment to reflect before continuing.'
WHERE content IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS experiment_scenarios_experiment_id_idx ON public.experiment_scenarios (experiment_id);
CREATE INDEX IF NOT EXISTS experiment_intro_screens_experiment_id_idx ON public.experiment_intro_screens (experiment_id);
CREATE INDEX IF NOT EXISTS experiment_survey_questions_experiment_id_idx ON public.experiment_survey_questions (experiment_id);
CREATE INDEX IF NOT EXISTS experiment_break_screens_experiment_id_idx ON public.experiment_break_screens (experiment_id);