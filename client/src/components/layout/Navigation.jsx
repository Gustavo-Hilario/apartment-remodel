/**
 * Navigation Component
 * 
 * Main navigation bar with links to all pages
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import './Navigation.css';

export default function Navigation() {
  const pathname = usePathname();

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
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            🔄 Refresh
          </button>
        </div>
      </div>
    </nav>
  );
}
