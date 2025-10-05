'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { totalsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';

export default function Home() {
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTotals();
  }, []);

  const loadTotals = async () => {
    try {
      setLoading(true);
      const data = await totalsAPI.get();
      setTotals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' }}>
            🏗️ Apartment Remodel Dashboard
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#666' }}>
            Track your renovation budget, expenses, and progress
          </p>
        </header>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <LoadingSpinner size="large" text="Loading project data..." />
          </div>
        )}

        {error && (
          <Card>
            <div style={{ padding: '20px', textAlign: 'center', color: '#ee0979' }}>
              <h3>❌ Error Loading Data</h3>
              <p>{error}</p>
              <Button onClick={loadTotals}>Try Again</Button>
            </div>
          </Card>
        )}

        {!loading && !error && totals && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <Card title="💰 Total Budget" hoverable>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea', textAlign: 'center', padding: '20px 0' }}>
                  {formatCurrency(totals.totalBudget || 0)}
                </div>
              </Card>

              <Card title="💸 Total Spent" hoverable>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ee0979', textAlign: 'center', padding: '20px 0' }}>
                  {formatCurrency(totals.totalExpenses || 0)}
                </div>
              </Card>

              <Card title="💵 Remaining" hoverable>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#11998e', textAlign: 'center', padding: '20px 0' }}>
                  {formatCurrency((totals.totalBudget || 0) - (totals.totalExpenses || 0))}
                </div>
              </Card>

              <Card title="📊 Budget Used" hoverable>
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#764ba2' }}>
                    {totals.totalBudget > 0 ? ((totals.totalExpenses / totals.totalBudget) * 100).toFixed(1) : 0}%
                  </div>
                  <div style={{ width: '100%', height: '12px', background: '#e5e5e5', borderRadius: '6px', overflow: 'hidden', marginTop: '16px' }}>
                    <div style={{ width: `${totals.totalBudget > 0 ? (totals.totalExpenses / totals.totalBudget) * 100 : 0}%`, height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              </Card>
            </div>

            <Card title="🚀 Quick Actions">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <Link href="/products"><Button variant="primary" fullWidth icon="🛍️">View Products</Button></Link>
                <Link href="/budget"><Button variant="success" fullWidth icon="💰">Budget Overview</Button></Link>
                <Link href="/rooms"><Button variant="warning" fullWidth icon="🚪">Manage Rooms</Button></Link>
                <Link href="/test-api"><Button variant="secondary" fullWidth icon="🧪">Test API</Button></Link>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
              <Card title="📈 Project Stats">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Rooms:</span><strong>{totals.totalRooms || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Products:</span><strong>{totals.totalProducts || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Expenses:</span><strong>{totals.expenseCount || 0}</strong>
                  </div>
                </div>
              </Card>

              <Card title="ℹ️ About">
                <p style={{ margin: 0, lineHeight: '1.6', color: '#666' }}>
                  This application helps you track your apartment renovation budget, manage products, monitor expenses, and keep your remodeling project organized and on budget.
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
