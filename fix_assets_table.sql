-- Fix the assets table structure to include necessary columns
-- This script checks for and adds the price_spot column if missing

DO $$
BEGIN
  -- Check if price_spot column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'assets' 
    AND column_name = 'price_spot'
  ) THEN
    -- Add the price_spot column
    ALTER TABLE assets ADD COLUMN price_spot DECIMAL DEFAULT 0;
    RAISE NOTICE 'Added price_spot column to assets table';
  ELSE
    RAISE NOTICE 'price_spot column already exists in assets table';
  END IF;
  
  -- Check if is_reference column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'assets' 
    AND column_name = 'is_reference'
  ) THEN
    -- Add the is_reference column
    ALTER TABLE assets ADD COLUMN is_reference BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_reference column to assets table';
  ELSE
    RAISE NOTICE 'is_reference column already exists in assets table';
  END IF;
  
  -- Check if table structure is now valid
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'assets' 
    AND column_name = 'price_spot'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'assets' 
    AND column_name = 'is_reference'
  ) THEN
    RAISE NOTICE 'Assets table structure is now valid and ready for the reset script';
  ELSE
    RAISE EXCEPTION 'Could not verify assets table structure after updates';
  END IF;
END;
$$;