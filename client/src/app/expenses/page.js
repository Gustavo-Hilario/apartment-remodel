/**
 * Expenses Page (Main Project Costs)
 * 
 * Manage main project expenses and manual costs
 */

'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { expensesAPI, roomsAPI, categoriesAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [openRoomDropdown, setOpenRoomDropdown] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, roomsData, categoriesData] = await Promise.all([
        expensesAPI.getAll(),
        roomsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);
      
      if (expensesData.success) {
        setExpenses(expensesData.expenses || []);
      }
      
      // Build rooms list from API
      const roomsList = [{ value: 'all', label: 'All Rooms (Split Equally)' }];
      if (Array.isArray(roomsData)) {
        roomsData.forEach(room => {
          roomsList.push({
            value: room.slug,
            label: room.name
          });
        });
      }
      setRooms(roomsList);
      
      // Build categories list from API
      const categoriesList = [];
      if (Array.isArray(categoriesData)) {
        categoriesData.forEach(cat => {
          if (cat.category && !categoriesList.includes(cat.category)) {
            categoriesList.push(cat.category);
          }
        });
      }
      // Add common categories if not in DB
      const commonCategories = ['Services', 'Labor', 'Materials', 'Products', 'Transport', 'Permits', 'Professional Fees', 'Other'];
      commonCategories.forEach(cat => {
        if (!categoriesList.includes(cat)) {
          categoriesList.push(cat);
        }
      });
      setCategories(categoriesList);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setExpenses([]);
      setRooms([{ value: 'all', label: 'All Rooms (Split Equally)' }]);
      setCategories(['Other']);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await expensesAPI.save(expenses);
      await loadData();
    } catch (err) {
      console.error('Error saving expenses:', err);
      alert('Failed to save expenses');
    } finally {
      setSaving(false);
    }
  };

  const addExpense = () => {
    const newExpense = {
      description: '',
      amount: 0,
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      rooms: [], // Array of room slugs
      roomCategory: '',
    };
    setExpenses([newExpense, ...expenses]);
  };

  const deleteExpense = (index) => {
    if (confirm('Delete this expense?')) {
      setExpenses(expenses.filter((_, i) => i !== index));
    }
  };

  const handleExpenseChange = (index, field, value) => {
    const updated = [...expenses];
    updated[index][field] = value;
    setExpenses(updated);
  };

  const toggleRoom = (expenseIndex, roomValue) => {
    const updated = [...expenses];
    const expense = updated[expenseIndex];
    
    // Ensure rooms is an array
    if (!expense.rooms) {
      expense.rooms = [];
    }
    
    if (roomValue === 'all') {
      // Toggle all rooms
      const allRoomValues = rooms.filter(r => r.value !== 'all').map(r => r.value);
      expense.rooms = expense.rooms.length === allRoomValues.length ? [] : allRoomValues;
    } else {
      // Toggle individual room
      const index = expense.rooms.indexOf(roomValue);
      if (index > -1) {
        expense.rooms.splice(index, 1);
      } else {
        expense.rooms.push(roomValue);
      }
    }
    
    setExpenses(updated);
  };

  const getRoomDisplay = (expenseRooms) => {
    if (!expenseRooms || expenseRooms.length === 0) return 'No rooms';
    
    const allRoomValues = rooms.filter(r => r.value !== 'all').map(r => r.value);
    if (expenseRooms.length === allRoomValues.length) {
      return 'All Rooms (Split Equally)';
    }
    
    if (expenseRooms.length === 1) {
      const room = rooms.find(r => r.value === expenseRooms[0]);
      return room ? room.label : expenseRooms[0];
    }
    
    return `${expenseRooms.length} rooms selected`;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const getSortedExpenses = () => {
    const sorted = [...expenses].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'amount') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortBy === 'date') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted.map((expense, index) => ({
      ...expense,
      originalIndex: expenses.indexOf(expense),
    }));
  };

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + (parseFloat(exp.amount) || 0),
    0
  );

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <LoadingSpinner size="large" text="Loading expenses..." />
        </div>
      </MainLayout>
    );
  }

  const sortedExpenses = getSortedExpenses();

  return (
    <MainLayout>
      <div className="expenses-page">
        <header className="editor-header">
          <div>
            <h1>💰 Main Project Costs</h1>
            <p className="subtitle">Manual expenses and completed items</p>
          </div>
          <div className="header-actions">
            <Button onClick={addExpense} icon="➕">
              Add Expense
            </Button>
            <Button onClick={handleSave} disabled={saving} icon="💾">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="expense-summary">
          <Card>
            <div className="summary-stat">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value" style={{ color: '#ee0979' }}>
                {formatCurrency(totalExpenses)}
              </div>
            </div>
          </Card>
          <Card>
            <div className="summary-stat">
              <div className="stat-label">Number of Expenses</div>
              <div className="stat-value" style={{ color: '#667eea' }}>
                {expenses.length}
              </div>
            </div>
          </Card>
        </div>

        {/* Expenses Table */}
        <Card>
          <div className="table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('description')}
                  >
                    Description {sortBy === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('category')}
                  >
                    Category {sortBy === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {sortBy === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ width: '200px' }}>
                    Rooms (Split Equally)
                  </th>
                  <th style={{ width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      No expenses yet. Click "Add Expense" to create one.
                    </td>
                  </tr>
                ) : (
                  sortedExpenses.map((expense) => (
                    <tr key={expense.originalIndex}>
                      <td style={{ textAlign: 'center' }}>💵</td>
                      <td>
                        <input
                          type="date"
                          value={expense.date || ''}
                          onChange={(e) =>
                            handleExpenseChange(expense.originalIndex, 'date', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={expense.description || ''}
                          onChange={(e) =>
                            handleExpenseChange(expense.originalIndex, 'description', e.target.value)
                          }
                          placeholder="Expense description"
                        />
                      </td>
                      <td>
                        <select
                          value={expense.category || 'Other'}
                          onChange={(e) =>
                            handleExpenseChange(expense.originalIndex, 'category', e.target.value)
                          }
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={expense.amount || 0}
                          onChange={(e) =>
                            handleExpenseChange(expense.originalIndex, 'amount', parseFloat(e.target.value) || 0)
                          }
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="room-dropdown-cell">
                        <div className="room-dropdown-wrapper">
                          <button
                            type="button"
                            className="room-dropdown-button"
                            onClick={() => setOpenRoomDropdown(
                              openRoomDropdown === expense.originalIndex ? null : expense.originalIndex
                            )}
                          >
                            {getRoomDisplay(expense.rooms || [])}
                            <span className="dropdown-arrow">▼</span>
                          </button>
                          
                          {openRoomDropdown === expense.originalIndex && (
                            <div className="room-dropdown-menu">
                              {rooms.map((room) => {
                                const isAllRooms = room.value === 'all';
                                const allRoomValues = rooms.filter(r => r.value !== 'all').map(r => r.value);
                                const isChecked = isAllRooms 
                                  ? (expense.rooms || []).length === allRoomValues.length
                                  : (expense.rooms || []).includes(room.value);
                                
                                return (
                                  <label key={room.value} className="room-checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleRoom(expense.originalIndex, room.value)}
                                    />
                                    <span>{room.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="delete-btn"
                          onClick={() => deleteExpense(expense.originalIndex)}
                          title="Delete expense"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="bottom-actions">
          <Button onClick={handleSave} disabled={saving} icon="💾" variant="primary">
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .expenses-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }

        .editor-header h1 {
          font-size: 2rem;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          color: #666;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .expense-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-stat {
          text-align: center;
          padding: 10px;
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

        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .expenses-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
          background: white;
        }

        .expenses-table thead {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .expenses-table th {
          padding: 14px 12px;
          text-align: left;
          font-size: 0.95rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .expenses-table th.sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        .expenses-table th.sortable:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .expenses-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e5e5;
          color: #333;
        }

        .expenses-table tbody tr {
          transition: background-color 0.2s;
        }

        .expenses-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .expenses-table input,
        .expenses-table select {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .expenses-table input[type="number"] {
          text-align: right;
        }

        .expenses-table input:focus,
        .expenses-table select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
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
            gap: 16px;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .expense-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </MainLayout>
  );
}
