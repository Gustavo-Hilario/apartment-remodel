'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

/**
 * Session Provider Wrapper
 * Wraps the app with NextAuth SessionProvider
 */
export default function SessionProvider({ children }) {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}
