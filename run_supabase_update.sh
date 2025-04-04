#!/bin/bash

# Script to run the SQL update against Supabase
# Usage: ./run_supabase_update.sh [supabase_url] [service_role_key]

# Check if URL and key are provided as arguments
if [ "$#" -ne 2 ]; then
    # Try to extract values from supabase.js
    SUPABASE_URL=$(grep -o 'https://[^\"]*supabase.co' ./src/lib/supabase.js | head -1)
    SUPABASE_KEY=$(grep -o 'supabaseKey[^\"]*' ./src/lib/supabase.js | sed 's/supabaseKey: \"//g' | sed 's/\"//g')
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
        echo "Error: Couldn't extract Supabase URL and key from supabase.js"
        echo "Usage: $0 [supabase_url] [service_role_key]"
        exit 1
    fi
else
    SUPABASE_URL=$1
    SUPABASE_KEY=$2
fi

# Check if supabase_update.sql exists
if [ ! -f "supabase_update.sql" ]; then
    echo "Error: supabase_update.sql not found"
    exit 1
fi

echo "Running database update script against Supabase..."
echo "URL: $SUPABASE_URL"

# Use curl to run the SQL via the Postgres REST API
# Note: For security, you should use a service_role key or admin key here
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"$(cat supabase_update.sql | tr -d '\n' | sed 's/"/\\"/g')\"}"

echo ""
echo "Update completed. Check the Supabase dashboard to verify changes."

# Instructions for Supabase CLI alternative
echo ""
echo "Alternative method using Supabase CLI:"
echo "1. Install Supabase CLI: https://supabase.com/docs/guides/cli"
echo "2. Link your project: supabase link --project-ref <project-id>"
echo "3. Run the SQL: supabase db execute --file supabase_update.sql"