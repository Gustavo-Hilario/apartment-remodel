/**
 * Main Layout Component
 * 
 * Wraps all pages with consistent structure:
 * - Navigation bar
 * - Main content area
 * - Footer (optional)
 */

'use client';

import Navigation from './Navigation';
import './MainLayout.css';

export default function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <Navigation />
      <main className="main-content">
        {children}
      </main>
      <footer className="main-footer">
        <p>Apartment Remodel Tracker © 2025</p>
      </footer>
    </div>
  );
}
