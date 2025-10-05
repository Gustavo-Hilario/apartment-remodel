'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { roomsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

export default function RoomEditorPage() {
  const params = useParams();
  const router = useRouter();
  const roomSlug = params.slug;

  const [roomData, setRoomData] = useState(null);
  const [items, setItems] = useState([]);
  const [roomBudget, setRoomBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadRoom = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getOne(roomSlug);
      if (data.success && data.roomData) {
        setRoomData(data.roomData);
        setItems(data.roomData.items || []);
        setRoomBudget(data.roomData.budget || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomSlug) {
      loadRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug]);

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;

    // Recalculate subtotal when quantity or prices change
    if (['quantity', 'budgetRate', 'actualRate'].includes(field)) {
      const item = updatedItems[index];
      item.subtotal = (item.quantity || 0) * (item.budgetRate || 0);
    }

    setItems(updatedItems);
  };

  const addNewItem = () => {
    const newItem = {
      description: '',
      category: 'Other',
      quantity: 1,
      unit: 'unit',
      budgetRate: 0,
      actualRate: 0,
      subtotal: 0,
      status: 'Pending',
      favorite: false,
      imageUrl: '',
      links: [],
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const deleteItem = (index) => {
    if (confirm('Delete this item?')) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    }
  };

  const saveRoom = async () => {
    try {
      setSaving(true);
      const updatedRoomData = {
        ...roomData,
        budget: roomBudget,
        items: items,
      };
      
      await roomsAPI.save(roomSlug, updatedRoomData);
      alert('Room saved successfully!');
      loadRoom(); // Reload to get updated totals
    } catch (err) {
      alert('Error saving room: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <LoadingSpinner size="large" text="Loading room..." />
        </div>
      </MainLayout>
    );
  }

  if (error || !roomData) {
    return (
      <MainLayout>
        <Card>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h3>❌ Error Loading Room</h3>
            <p>{error || 'Room not found'}</p>
            <Button onClick={() => router.push('/rooms')}>Back to Rooms</Button>
          </div>
        </Card>
      </MainLayout>
    );
  }

  const totalBudget = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalActual = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.actualRate || 0)), 0);
  const difference = roomBudget - totalActual;

  return (
    <MainLayout>
      <div className="room-editor">
        <header className="editor-header">
          <div>
            <Button 
              variant="secondary" 
              onClick={() => router.push('/rooms')}
              icon="←"
            >
              Back to Rooms
            </Button>
            <h1>✏️ {roomData.name}</h1>
          </div>
          <div className="header-actions">
            <Button 
              variant="success" 
              onClick={saveRoom}
              disabled={saving}
              icon="💾"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </header>

        {/* Budget Summary Cards */}
        <div className="budget-summary">
          <Card>
            <div className="summary-stat">
              <span className="stat-label">Room Budget</span>
              <input
                type="number"
                className="budget-input"
                value={roomBudget}
                onChange={(e) => setRoomBudget(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
              <span className="stat-value budget">{formatCurrency(roomBudget)}</span>
            </div>
          </Card>
          <Card>
            <div className="summary-stat">
              <span className="stat-label">Expected Total (Items)</span>
              <span className="stat-value expected">{formatCurrency(totalBudget)}</span>
            </div>
          </Card>
          <Card>
            <div className="summary-stat">
              <span className="stat-label">Actual Total</span>
              <span className="stat-value actual">{formatCurrency(totalActual)}</span>
            </div>
          </Card>
          <Card>
            <div className="summary-stat">
              <span className="stat-label">Difference</span>
              <span 
                className="stat-value difference" 
                style={{ color: difference >= 0 ? '#11998e' : '#ee0979' }}
              >
                {formatCurrency(difference)}
              </span>
            </div>
          </Card>
        </div>

        {/* Items Table */}
        <Card>
          <div className="table-header">
            <h2>Room Items</h2>
            <Button 
              variant="primary" 
              onClick={addNewItem}
              icon="➕"
            >
              Add Item
            </Button>
          </div>

          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>#</th>
                  <th style={{ width: '40px' }}>⭐</th>
                  <th style={{ width: '200px' }}>Description</th>
                  <th style={{ width: '120px' }}>Category</th>
                  <th style={{ width: '80px' }}>Qty</th>
                  <th style={{ width: '80px' }}>Unit</th>
                  <th style={{ width: '100px' }}>Budget Rate</th>
                  <th style={{ width: '100px' }}>Actual Rate</th>
                  <th style={{ width: '100px' }}>Subtotal</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="favorite-cell">
                      <button
                        className={`favorite-btn ${item.favorite ? 'active' : ''}`}
                        onClick={() => handleItemChange(index, 'favorite', !item.favorite)}
                        title="Mark as favorite"
                      >
                        ⭐
                      </button>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </td>
                    <td>
                      <select
                        value={item.category || 'Other'}
                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                      >
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Flooring">Flooring</option>
                        <option value="Painting">Painting</option>
                        <option value="Carpentry">Carpentry</option>
                        <option value="Products">Products</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Fixtures">Fixtures</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity || 0}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.unit || 'unit'}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="unit"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.budgetRate || 0}
                        onChange={(e) => handleItemChange(index, 'budgetRate', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.actualRate || 0}
                        onChange={(e) => handleItemChange(index, 'actualRate', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="subtotal-cell">
                      {formatCurrency(item.subtotal || 0)}
                    </td>
                    <td>
                      <select
                        value={item.status || 'Pending'}
                        onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                      >
                        <option value="Planning">Planning</option>
                        <option value="Pending">Pending</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => deleteItem(index)}
                        title="Delete item"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="bottom-actions">
          <Button 
            variant="secondary" 
            onClick={() => router.push('/rooms')}
          >
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={saveRoom}
            disabled={saving}
            icon="💾"
            size="large"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .room-editor {
          max-width: 1600px;
          margin: 0 auto;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .editor-header h1 {
          font-size: 2rem;
          margin: 10px 0 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .budget-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-stat {
          text-align: center;
          padding: 10px;
        }

        .stat-label {
          display: block;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .stat-value {
          display: block;
          font-size: 1.8rem;
          font-weight: bold;
        }

        .stat-value.budget {
          color: #667eea;
        }

        .stat-value.actual {
          color: #ee0979;
        }

        .stat-value.expected {
          color: #764ba2;
        }

        .stat-value.items {
          color: #764ba2;
        }

        .budget-input {
          width: 100%;
          max-width: 200px;
          padding: 8px 12px;
          margin: 10px auto;
          border: 2px solid #667eea;
          border-radius: 6px;
          font-size: 1.1rem;
          text-align: center;
          font-weight: 600;
          box-sizing: border-box;
        }

        .budget-input:focus {
          outline: none;
          border-color: #764ba2;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .table-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
        }

        .items-table thead {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .items-table th {
          padding: 12px 8px;
          text-align: left;
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .items-table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }

        .items-table tbody tr:hover {
          background: #f8f9fa;
        }

        .items-table input,
        .items-table select {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .items-table input[type="number"] {
          text-align: right;
        }

        .items-table input:focus,
        .items-table select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }

        .subtotal-cell {
          font-weight: bold;
          color: #667eea;
          text-align: right;
        }

        .delete-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .delete-btn:hover {
          opacity: 1;
        }

        .favorite-cell {
          text-align: center;
          padding: 4px;
        }

        .favorite-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.3rem;
          padding: 4px;
          opacity: 0.3;
          transition: all 0.2s;
          filter: grayscale(100%);
        }

        .favorite-btn:hover {
          opacity: 0.7;
          filter: grayscale(0%);
          transform: scale(1.2);
        }

        .favorite-btn.active {
          opacity: 1;
          filter: grayscale(0%);
        }

        .bottom-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
        }

        @media (max-width: 768px) {
          .editor-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .budget-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .table-wrapper {
            border-radius: 0;
            margin: 0 -20px;
          }
        }
      `}</style>
    </MainLayout>
  );
}
