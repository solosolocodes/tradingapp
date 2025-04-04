# Crypto Tracker Simple

A simple web application to track cryptocurrency investments built with Next.js and Supabase.

## Features

- Manage multiple crypto wallets
- Track buy and sell transactions
- View transaction history 
- Simple, clean interface with modern CSS

## Technologies Used

- Next.js - React framework
- Supabase - Backend and database
- Modern CSS - No frameworks, just clean CSS variables and custom properties

## Getting Started

### Prerequisites

- Node.js (14.x or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/crypto-tracker-simple.git
cd crypto-tracker-simple
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

4. Start the development server
```
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deployment

This application can be easily deployed to Vercel:

1. Push your code to a Git repository
2. Import the project to Vercel
3. Set the environment variables in the Vercel dashboard
4. Deploy!

## Database Schema

The application uses two main tables in Supabase:

### Wallets Table
- id (UUID, primary key)
- name (string)
- description (string, optional)
- created_at (timestamp)
- user_id (string, foreign key to auth.users)

### Transactions Table
- id (UUID, primary key)
- wallet_id (UUID, foreign key to wallets.id)
- transaction_type (enum: 'buy', 'sell')
- crypto_symbol (string)
- amount (float)
- price_per_unit (float)
- transaction_date (date)
- notes (string, optional)
- created_at (timestamp)

## License

MIT