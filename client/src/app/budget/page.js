/**
 * Budget Overview Page
 * 
 * View budget summary and progress
 */

'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, LoadingSpinner, Button } from '@/components/ui';
import { totalsAPI, categoriesAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

export default function BudgetPage() {
  const [totals, setTotals] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [totalsData, categoriesData] = await Promise.all([
        totalsAPI.get(),
        categoriesAPI.getAll(),
      ]);
      setTotals(totalsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <LoadingSpinner size="large" text="Loading budget data..." />
        </div>
      </MainLayout>
    );
  }

  const remaining = (totals?.totalBudget || 0) - (totals?.totalExpenses || 0);
  const percentUsed = totals?.totalBudget > 0 
    ? ((totals.totalExpenses / totals.totalBudget) * 100) 
    : 0;

  return (
    <MainLayout>
      <div className="budget-page">
        <header className="page-header">
          <h1>💰 Budget Overview</h1>
          <Button icon="📊">Export Report</Button>
        </header>

        {/* Main Budget Card */}
        <Card title="Project Budget Summary">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            <div className="budget-stat">
              <div className="stat-label">Total Budget</div>
              <div className="stat-value" style={{ color: '#667eea' }}>
                {formatCurrency(totals?.totalBudget || 0)}
              </div>
            </div>

            <div className="budget-stat">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value" style={{ color: '#ee0979' }}>
                {formatCurrency(totals?.totalExpenses || 0)}
              </div>
            </div>

            <div className="budget-stat">
              <div className="stat-label">Remaining</div>
              <div className="stat-value" style={{ color: remaining >= 0 ? '#11998e' : '#ee0979' }}>
                {formatCurrency(remaining)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span>Budget Used</span>
              <span className="progress-percent">{percentUsed.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${Math.min(percentUsed, 100)}%`,
                  background: percentUsed > 100 
                    ? 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'
                    : percentUsed > 80
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              />
            </div>
          </div>
        </Card>

        {/* Categories */}
        <Card title="📂 Budget by Category" className="categories-card">
          {categories.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              No categories found
            </p>
          ) : (
            <div className="categories-list">
              {categories.map((cat, index) => (
                <div key={index} className="category-item">
                  <div className="category-info">
                    <span className="category-name">{cat.category || 'Uncategorized'}</span>
                    <span className="category-count">{cat.count} items</span>
                  </div>
                  <div className="category-amount">
                    {formatCurrency(cat.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <style jsx>{`
        .budget-page {
          max-width: 1000px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 2rem;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .budget-stat {
          text-align: center;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
        }

        .progress-section {
          margin-top: 24px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-weight: 600;
          color: #333;
        }

        .progress-percent {
          color: #667eea;
          font-size: 1.2rem;
        }

        .progress-bar {
          height: 24px;
          background: #e5e5e5;
          border-radius: 12px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.5s ease;
          border-radius: 12px;
        }

        .categories-card {
          margin-top: 24px;
        }

        .categories-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .category-item:hover {
          background: #f0f0f0;
          transform: translateX(4px);
        }

        .category-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .category-name {
          font-weight: 600;
          color: #333;
        }

        .category-count {
          font-size: 0.85rem;
          color: #999;
        }

        .category-amount {
          font-size: 1.2rem;
          font-weight: bold;
          color: #667eea;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </MainLayout>
  );
}
