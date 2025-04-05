ALTER TABLE scenario_templates ADD COLUMN IF NOT EXISTS round_duration INTEGER DEFAULT 10;
ALTER TABLE experiment_scenarios ADD COLUMN IF NOT EXISTS round_duration INTEGER DEFAULT 10;
