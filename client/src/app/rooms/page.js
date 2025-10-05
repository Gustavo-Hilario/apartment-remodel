'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner, Input } from '@/components/ui';
import { roomsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch (err) {
      setError(err.message);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <LoadingSpinner size="large" text="Loading rooms..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="rooms-page">
        <header className="page-header">
          <h1>🚪 Rooms</h1>
          <p>Manage room budgets and items</p>
        </header>

        {error && (
          <Card>
            <div style={{ padding: '20px', textAlign: 'center', color: '#ee0979' }}>
              <h3>❌ Error Loading Rooms</h3>
              <p>{error}</p>
              <Button onClick={loadRooms}>Try Again</Button>
            </div>
          </Card>
        )}

        {!loading && !error && (
          <div className="rooms-grid">
            {rooms.map((room) => {
              const remaining = (room.budget || 0) - (room.actual_spent || 0);
              const percentUsed = room.budget > 0 
                ? ((room.actual_spent / room.budget) * 100).toFixed(1)
                : 0;
              const progressColor = percentUsed > 100 
                ? '#ee0979' 
                : percentUsed > 80 
                ? '#f5576c' 
                : '#667eea';

              return (
                <Card key={room._id || room.slug} hoverable>
                  <div className="room-card">
                    <div className="room-header">
                      <h2>{room.name}</h2>
                      <span className={`status-badge ${room.status?.toLowerCase()}`}>
                        {room.status || 'Pending'}
                      </span>
                    </div>

                    <div className="room-stats">
                      <div className="stat">
                        <span className="stat-label">Budget</span>
                        <span className="stat-value">{formatCurrency(room.budget || 0)}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Spent</span>
                        <span className="stat-value spent">{formatCurrency(room.actual_spent || 0)}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Remaining</span>
                        <span className="stat-value" style={{ color: remaining >= 0 ? '#11998e' : '#ee0979' }}>
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>

                    <div className="progress-section">
                      <div className="progress-header">
                        <span>Progress</span>
                        <span>{percentUsed}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${Math.min(percentUsed, 100)}%`,
                            background: progressColor
                          }}
                        />
                      </div>
                      <div className="progress-info">
                        <span>{room.completed_items || 0} / {room.total_items || 0} items</span>
                        <span>{room.progress_percent || 0}% complete</span>
                      </div>
                    </div>

                    <div className="room-actions">
                      <Link href={`/rooms/${room.slug}`}>
                        <Button variant="primary" fullWidth icon="✏️">
                          Edit Items
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .rooms-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-header h1 {
          font-size: 2.5rem;
          margin: 0 0 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-header p {
          font-size: 1.1rem;
          color: #666;
          margin: 0;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }

        .room-card {
          padding: 4px;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }

        .room-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.planning {
          background: #e3f2fd;
          color: #1976d2;
        }

        .status-badge.pending {
          background: #fff3e0;
          color: #f57c00;
        }

        .status-badge.ordered {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .status-badge.completed {
          background: #e8f5e9;
          color: #388e3c;
        }

        .room-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 6px;
        }

        .stat-value {
          display: block;
          font-size: 1.25rem;
          font-weight: bold;
          color: #667eea;
        }

        .stat-value.spent {
          color: #ee0979;
        }

        .progress-section {
          margin-bottom: 20px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9rem;
          color: #666;
        }

        .progress-bar {
          height: 10px;
          background: #e5e5e5;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #999;
        }

        .room-actions {
          margin-top: 20px;
        }

        @media (max-width: 768px) {
          .rooms-grid {
            grid-template-columns: 1fr;
          }

          .page-header h1 {
            font-size: 2rem;
          }

          .room-stats {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      `}</style>
    </MainLayout>
  );
}
