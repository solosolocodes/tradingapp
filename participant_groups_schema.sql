-- Create participant group tables if they don't exist

-- Main participant groups table
CREATE TABLE IF NOT EXISTS participant_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES participant_groups(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  unique_id TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email),
  UNIQUE(unique_id)
);

-- Group assignments to experiments
CREATE TABLE IF NOT EXISTS experiment_group_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  group_id UUID REFERENCES participant_groups(id) ON DELETE CASCADE,
  assignment_date TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  participation_link TEXT GENERATED ALWAYS AS (
    'https://tradingapp.vercel.app/participate/' || experiment_id || '/' || group_id
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, group_id)
);

-- Participant participation record
CREATE TABLE IF NOT EXISTS experiment_participations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  group_id UUID REFERENCES participant_groups(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('invited', 'started', 'completed', 'abandoned')) DEFAULT 'invited',
  invite_sent_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  completion_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS participants_group_id_idx ON participants(group_id);
CREATE INDEX IF NOT EXISTS experiment_group_assignments_experiment_id_idx ON experiment_group_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_group_assignments_group_id_idx ON experiment_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS experiment_participations_experiment_id_idx ON experiment_participations(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_participations_participant_id_idx ON experiment_participations(participant_id);
CREATE INDEX IF NOT EXISTS experiment_participations_group_id_idx ON experiment_participations(group_id);

-- Enable Row Level Security
ALTER TABLE participant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_participations ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo purposes)
CREATE POLICY "Allow anonymous access to participant_groups" ON participant_groups
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to participants" ON participants
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_group_assignments" ON experiment_group_assignments
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to experiment_participations" ON experiment_participations
  FOR ALL USING (true);

-- Create function to update participant count in groups
CREATE OR REPLACE FUNCTION update_participant_group_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE participant_groups
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE participant_groups
    SET member_count = member_count - 1
    WHERE id = OLD.group_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.group_id <> OLD.group_id THEN
    -- If participant was moved to a different group
    UPDATE participant_groups
    SET member_count = member_count - 1
    WHERE id = OLD.group_id;
    
    UPDATE participant_groups
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update participant count in groups
CREATE TRIGGER update_participant_group_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON participants
FOR EACH ROW
EXECUTE FUNCTION update_participant_group_count();

-- Create some sample data
INSERT INTO participant_groups (name, description, is_active)
VALUES 
  ('Economics Students', 'Students from economics department', TRUE),
  ('Psychology Lab', 'Participants from psychology research lab', TRUE);

-- Insert sample participants
INSERT INTO participants (group_id, name, email, unique_id, is_active)
VALUES
  ((SELECT id FROM participant_groups WHERE name = 'Economics Students'), 'John Doe', 'john.doe@example.com', 'ECON001', TRUE),
  ((SELECT id FROM participant_groups WHERE name = 'Economics Students'), 'Jane Smith', 'jane.smith@example.com', 'ECON002', TRUE),
  ((SELECT id FROM participant_groups WHERE name = 'Psychology Lab'), 'Alice Brown', 'alice.brown@example.com', 'PSYCH001', TRUE),
  ((SELECT id FROM participant_groups WHERE name = 'Psychology Lab'), 'Bob Wilson', 'bob.wilson@example.com', 'PSYCH002', TRUE);