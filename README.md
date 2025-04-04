# Crypto Trading and Behavioral Experiments Platform

A comprehensive platform for crypto trading simulation and behavioral economics experiments. Built with Next.js and Supabase.

## Features

### Wallet Management
- Create and manage multiple crypto wallets
- Track assets, their quantities, and current values
- Visualize wallet contents with clear asset listings
- Monitor buy and sell transactions
- View transaction history with filtering
- Update spot prices for assets

### Experiment System
- Create and manage behavioral economics experiments
- Add participant groups with auto-generated IDs
- Design multi-round experiment flow with intro and break screens
- Add surveys with multiple question types
- Assign control and experimental groups
- View experiment results and participant data

### Scenario Management System
- Create reusable scenario templates
- Configure multi-round asset price scenarios
- Import/export price data via CSV
- Link scenarios to specific wallets and experiments
- Define response options for participants
- Set scenario duration and activation status

### Reporting
- Export transaction data
- Analyze experiment results
- Track participant responses
- Compare group performance

## Technologies Used

- **Next.js** - React framework for the frontend
- **Supabase** - PostgreSQL database with authentication and real-time features
- **Custom CSS** - Clean, responsive design using CSS variables and modern techniques
- **CSV Data Exchange** - Import/export functionality for bulk data operations

## Getting Started

### Prerequisites

- Node.js (14.x or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/crypto-tracker.git
cd crypto-tracker
```

2. Install dependencies
```
npm install
```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the SQL scripts to set up your database schema:
   - `scenarios_schema.sql` - Sets up the scenario management system
   - `participant_id_updates.sql` - Configures participant ID generation

5. Start the development server
```
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Database Schema

The application uses the following main tables in Supabase:

### Wallets
- `id` (UUID, primary key)
- `name` (string)
- `description` (string, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Assets
- `id` (UUID, primary key)
- `wallet_id` (UUID, foreign key to wallets)
- `asset_symbol` (string)
- `name` (string)
- `price_spot` (decimal)
- `amount` (decimal)
- `is_reference` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Transactions
- `id` (UUID, primary key)
- `wallet_id` (UUID, foreign key to wallets)
- `asset_id` (UUID, foreign key to assets)
- `transaction_type` (enum: 'buy', 'sell')
- `amount` (decimal)
- `price_per_unit` (decimal)
- `transaction_date` (date)
- `notes` (string, optional)
- `created_at` (timestamp)

### Experiments
- `id` (UUID, primary key)
- `title` (string)
- `description` (string)
- `status` (enum: 'draft', 'active', 'completed')
- `participant_count` (integer)
- `scenario_count` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Participant Groups
- `id` (UUID, primary key)
- `name` (string)
- `description` (string)
- `member_count` (integer)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Participants
- `id` (UUID, primary key)
- `group_id` (UUID, foreign key to participant_groups)
- `participant_id` (string) - Auto-generated 10-character ID
- `name` (string)
- `email` (string)
- `phone` (string, optional)
- `telegram_id` (string, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Scenario Templates
- `id` (UUID, primary key)
- `title` (string)
- `description` (string)
- `duration` (integer) - in seconds
- `wallet_id` (UUID, foreign key to wallets)
- `rounds` (integer)
- `option_template` (JSONB)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Scenario Asset Prices
- `id` (UUID, primary key)
- `scenario_id` (UUID, foreign key to scenario_templates)
- `asset_symbol` (string)
- `asset_name` (string)
- `round_number` (integer)
- `price` (decimal)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Experiment Scenarios
- `id` (UUID, primary key)
- `experiment_id` (UUID, foreign key to experiments)
- `scenario_template_id` (UUID, foreign key to scenario_templates)
- `title` (string)
- `description` (string)
- `duration` (integer)
- `wallet_id` (UUID, foreign key to wallets)
- `options` (JSONB)
- `order_index` (integer)
- `created_at` (timestamp)

## User Guide

### Managing Wallets

1. **Create a Wallet**:
   - Navigate to the Wallets page
   - Click "Create Wallet"
   - Enter a name and description
   - Submit the form

2. **Add Assets to a Wallet**:
   - Open a wallet's detail page
   - Click "Add Asset"
   - Enter the asset symbol, name, spot price, and amount
   - Check "Reference Asset" for stable currencies (optional)
   - Submit the form

3. **Record Transactions**:
   - From the wallet detail page
   - Click "Add Transaction"
   - Select the asset, transaction type (buy/sell), amount, and price
   - Enter the transaction date and optional notes
   - Submit the form

### Creating Experiments

1. **Set Up Participant Groups**:
   - Navigate to the Groups page
   - Click "Create Group"
   - Enter group details and add participants
   - Each participant receives an auto-generated ID

2. **Create Scenarios**:
   - Navigate to the Scenarios page
   - Click "Create Scenario"
   - Select a wallet and set the number of rounds
   - Configure asset prices for each round (manually or via CSV import)
   - Define response options
   - Save the scenario template

3. **Design an Experiment**:
   - Navigate to the Experiments page
   - Click "Create Experiment"
   - Fill in basic experiment details
   - Add intro screens for instructions
   - Select scenarios from your templates
   - Add break screens between scenarios
   - Create survey questions
   - Assign participant groups
   - Set control groups if needed
   - Save the experiment

### Using CSV Import/Export for Scenarios

1. **Export Template CSV**:
   - From the scenario creation/edit page
   - Click "Export Template CSV" button
   - Edit the downloaded CSV file in your preferred spreadsheet application
   - Maintain the format: rounds as rows, assets as columns

2. **Import CSV Data**:
   - From the scenario creation/edit page
   - Click "Import CSV" button
   - Select your CSV file with the price data
   - The system will validate and import the data
   - Review the imported prices in the table

3. **CSV Format Requirements**:
   - First column must be "Round" with values like "Round 1", "Round 2"
   - Asset columns should have headers in the format "SYMBOL (Name)"
   - Price values must be numeric

## Deployment

This application can be easily deployed to Vercel:

1. Push your code to a Git repository
2. Import the project to Vercel
3. Set the environment variables in the Vercel dashboard
4. Deploy!

## License

MIT