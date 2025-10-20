'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

/**
 * AuthGuard Component
 * Protects routes by checking NextAuth session
 * Redirects to /login if not authenticated
 */
export default function AuthGuard({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const publicPaths = ['/login', '/signup'];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (status === 'loading') return; // Still loading session

    if (!session && !isPublicPath) {
      // Not authenticated and trying to access protected route
      router.push('/login');
    } else if (session && isPublicPath) {
      // Authenticated but on login/signup page, redirect to home
      router.push('/');
    }
  }, [session, status, pathname, router, isPublicPath]);

  // Show loading spinner while checking authentication
  if (status === 'loading') {
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

  // Don't render protected content if not authenticated
  if (!session && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
