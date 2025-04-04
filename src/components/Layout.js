import Link from 'next/link';
import Head from 'next/head';

export default function Layout({ children, title = 'TradingApp' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="A simple cryptocurrency tracker app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <header>
        <div className="container">
          <nav>
            <div className="app-title">TradingApp</div>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/wallets">Wallets</Link></li>
              <li><Link href="/transactions">Transactions</Link></li>
              <li><Link href="/experiments">Experiments</Link></li>
              <li><Link href="/groups">Groups</Link></li>
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="container">
        {children}
      </main>
      
      <footer className="container mt-4 mb-2" style={{ textAlign: 'center', color: 'var(--color-gray-dark)' }}>
        <p>© {new Date().getFullYear()} Crypto Tracker</p>
      </footer>
    </>
  );
}