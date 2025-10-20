/**
 * Navigation Component
 * 
 * Main navigation bar with links to all pages
 */

'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import './Navigation.css';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/timeline', label: 'Timeline', icon: '📅' },
    { href: '/products', label: 'Products', icon: '🛍️' },
    { href: '/budget', label: 'Budget', icon: '💰' },
    { href: '/rooms', label: 'Rooms', icon: '🚪' },
    { href: '/expenses', label: 'Expenses', icon: '📊' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link href="/">
            <span className="brand-icon">🏗️</span>
            <span className="brand-text">Apartment Remodel</span>
          </Link>
        </div>
        
        <ul className="nav-menu">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link 
                href={item.href}
                className={pathname === item.href ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          {session && (
            <div className="user-info" title={`${session.user.name} (${session.user.role})`}>
              <span className="user-name">{session.user.name}</span>
              {session.user.role === 'admin' && (
                <span className="role-badge">Admin</span>
              )}
            </div>
          )}
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            🔄 Refresh
          </button>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            🚪 Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
