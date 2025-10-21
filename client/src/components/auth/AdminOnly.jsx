/**
 * AdminOnly Component
 *
 * Conditionally renders children only if the current user is an admin.
 * Non-admin users will not see the wrapped content.
 *
 * Usage:
 * <AdminOnly>
 *   <Button>Add Product</Button>
 * </AdminOnly>
 */

'use client';

import { useSession } from 'next-auth/react';

export default function AdminOnly({ children }) {
  const { data: session, status } = useSession();

  // Do not render anything while loading
  if (status === 'loading') {
    return null;
  }

  // Only render children if user is authenticated AND is an admin
  if (session?.user?.role === 'admin') {
    return <>{children}</>;
  }

  // Non-admin users see nothing
  return null;
}
