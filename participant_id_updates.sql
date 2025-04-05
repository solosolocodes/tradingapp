-- First, add columns for phone and telegram_id to participants table
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS telegram_id TEXT;

-- Create an index on unique_id for faster lookups
CREATE INDEX IF NOT EXISTS participants_unique_id_idx ON participants(unique_id);

-- Create a function to generate random alphanumeric IDs
CREATE OR REPLACE FUNCTION generate_unique_participant_id(length INT DEFAULT 10)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  result TEXT := '';
  i INT := 0;
  pos INT := 0;
BEGIN
  FOR i IN 1..length LOOP
    pos := 1 + CAST(random() * (length(chars) - 1) AS INT);
    result := result || substr(chars, pos, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Create a function to ensure the unique_id is actually unique
CREATE OR REPLACE FUNCTION ensure_unique_participant_id()
RETURNS TRIGGER AS $$
DECLARE
  attempts INT := 0;
  max_attempts INT := 5;
  id_exists BOOLEAN;
BEGIN
  -- If unique_id is not provided, generate one
  IF NEW.unique_id IS NULL OR NEW.unique_id = '' THEN
    LOOP
      -- Generate a new ID
      NEW.unique_id := generate_unique_participant_id(10);
      
      -- Check if it exists
      SELECT EXISTS (
        SELECT 1 FROM participants 
        WHERE unique_id = NEW.unique_id 
        AND id != NEW.id
      ) INTO id_exists;
      
      EXIT WHEN NOT id_exists OR attempts >= max_attempts;
      attempts := attempts + 1;
    END LOOP;
    
    IF id_exists THEN
      RAISE EXCEPTION 'Could not generate a unique ID after % attempts', max_attempts;
    END IF;
  ELSE
    -- If unique_id is provided manually, check if it's unique
    SELECT EXISTS (
      SELECT 1 FROM participants 
      WHERE unique_id = NEW.unique_id 
      AND id != NEW.id
    ) INTO id_exists;
    
    IF id_exists THEN
      RAISE EXCEPTION 'The provided unique_id "%" already exists', NEW.unique_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to ensure unique IDs for new participants and verify manually entered IDs
DROP TRIGGER IF EXISTS ensure_unique_participant_id_trigger ON participants;
CREATE TRIGGER ensure_unique_participant_id_trigger
BEFORE INSERT OR UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION ensure_unique_participant_id();

-- Update existing participants with generated IDs if they don't have one
UPDATE participants
SET unique_id = generate_unique_participant_id(10)
WHERE unique_id IS NULL OR unique_id = '';

-- Create a function to validate phone numbers (basic validation)
CREATE OR REPLACE FUNCTION validate_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation if phone is NULL or empty
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;
  
  -- Basic validation: at least 7 digits, optionally starting with + and containing spaces, dashes, or parentheses
  IF NOT NEW.phone ~ '^[+]?[0-9\s()\-]{7,}$' THEN
    RAISE EXCEPTION 'Invalid phone number format: %', NEW.phone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for phone validation
DROP TRIGGER IF EXISTS validate_phone_number_trigger ON participants;
CREATE TRIGGER validate_phone_number_trigger
BEFORE INSERT OR UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION validate_phone_number();

-- Examples of inserting participants with generated IDs
INSERT INTO participants (group_id, name, email, phone, telegram_id)
VALUES 
  ((SELECT id FROM participant_groups LIMIT 1), 'Test User', 'test@example.com', '+1234567890', '@testuser'),
  ((SELECT id FROM participant_groups LIMIT 1), 'Jane Doe', 'jane@example.com', '+9876543210', '@janedoe')
ON CONFLICT DO NOTHING;