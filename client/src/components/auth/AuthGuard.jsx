'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

/**
 * AuthGuard Component
 * Protects routes by checking authentication status
 * Redirects to /login if not authenticated
 */
export default function AuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      // Skip auth check for login page
      if (pathname === '/login') {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      const authStatus = localStorage.getItem('isAuthenticated');
      const authTimestamp = localStorage.getItem('authTimestamp');

      // Check if authenticated and not expired (7 days)
      const isValid = authStatus === 'true' && authTimestamp &&
        (Date.now() - parseInt(authTimestamp)) < 7 * 24 * 60 * 60 * 1000;

      if (isValid) {
        setIsAuthenticated(true);
      } else {
        // Clear expired auth
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authTimestamp');
        router.push('/login');
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <LoadingSpinner size="large" />
          <p style={{ marginTop: '20px', fontSize: '1.1rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
