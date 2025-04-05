import Layout from '../components/Layout';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Layout title="Page Not Found">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>404</h1>
        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Page Not Found</h2>
        <p style={{ marginBottom: 'var(--spacing-lg)' }}>
          Sorry, the page you are looking for does not exist.
        </p>
        <Link href="/" className="button">
          Return to Home
        </Link>
      </div>
    </Layout>
  );
}