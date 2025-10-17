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
  const [showAllocationModal, setShowAllocationModal] = useState(null); // Track which expense allocation editor is open

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
        // Backend now sends rooms array directly, just use it
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
      // Backend now handles rooms array directly, no transformation needed
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
      status: 'Pending',
    };
    setExpenses([newExpense, ...expenses]);
  };

  const deleteExpense = (index) => {
    setExpenses(expenses.filter((_, i) => i !== index));
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

  const getRoomDisplay = (expenseRooms, roomAllocations) => {
    if (!expenseRooms || expenseRooms.length === 0) return 'General';

    const allRoomValues = rooms.filter(r => r.value !== 'all').map(r => r.value);
    if (expenseRooms.length === allRoomValues.length) {
      return roomAllocations && roomAllocations.length > 0
        ? 'All Rooms (Custom Split)'
        : 'All Rooms (Split Equally)';
    }

    if (expenseRooms.length === 1) {
      const room = rooms.find(r => r.value === expenseRooms[0]);
      return room ? room.label : expenseRooms[0];
    }

    return roomAllocations && roomAllocations.length > 0
      ? `${expenseRooms.length} rooms (Custom Split)`
      : `${expenseRooms.length} rooms (Split Equally)`;
  };

  const initializeRoomAllocations = (expenseIndex) => {
    const expense = expenses[expenseIndex];
    const amount = parseFloat(expense.amount) || 0;
    const expenseRooms = expense.rooms || [];

    if (expenseRooms.length <= 1) return;

    // If already has custom allocations, keep them
    if (expense.roomAllocations && expense.roomAllocations.length > 0) {
      setShowAllocationModal(expenseIndex);
      return;
    }

    // Initialize with equal split
    const amountPerRoom = amount / expenseRooms.length;
    const percentagePerRoom = 100 / expenseRooms.length;

    const allocations = expenseRooms.map(roomSlug => ({
      room: roomSlug,
      amount: amountPerRoom,
      percentage: percentagePerRoom
    }));

    const updated = [...expenses];
    updated[expenseIndex].roomAllocations = allocations;
    setExpenses(updated);
    setShowAllocationModal(expenseIndex);
  };

  const updateRoomAllocation = (expenseIndex, roomSlug, field, value) => {
    const updated = [...expenses];
    const expense = updated[expenseIndex];
    const totalAmount = parseFloat(expense.amount) || 0;

    if (!expense.roomAllocations) {
      initializeRoomAllocations(expenseIndex);
      return;
    }

    const allocations = [...expense.roomAllocations];
    const allocationIndex = allocations.findIndex(a => a.room === roomSlug);

    if (allocationIndex === -1) return;

    if (field === 'percentage') {
      const percentage = parseFloat(value) || 0;
      allocations[allocationIndex].percentage = percentage;
      allocations[allocationIndex].amount = (totalAmount * percentage) / 100;
    } else if (field === 'amount') {
      const amount = parseFloat(value) || 0;
      allocations[allocationIndex].amount = amount;
      allocations[allocationIndex].percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    }

    expense.roomAllocations = allocations;
    setExpenses(updated);
  };

  const resetToEqualSplit = (expenseIndex) => {
    const updated = [...expenses];
    const expense = updated[expenseIndex];
    const amount = parseFloat(expense.amount) || 0;
    const expenseRooms = expense.rooms || [];

    if (expenseRooms.length <= 1) return;

    const amountPerRoom = amount / expenseRooms.length;
    const percentagePerRoom = 100 / expenseRooms.length;

    expense.roomAllocations = expenseRooms.map(roomSlug => ({
      room: roomSlug,
      amount: amountPerRoom,
      percentage: percentagePerRoom
    }));

    setExpenses(updated);
  };

  const clearCustomAllocations = (expenseIndex) => {
    const updated = [...expenses];
    updated[expenseIndex].roomAllocations = [];
    setExpenses(updated);
    setShowAllocationModal(null);
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
                {formatCurrency(Math.round(totalExpenses))}
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
                  <th
                    className="sortable"
                    onClick={() => handleSort('status')}
                    style={{ width: '120px' }}
                  >
                    Status {sortBy === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      No expenses yet. Click &quot;Add Expense&quot; to create one.
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
                        <input
                          type="text"
                          list={`category-list-${expense.originalIndex}`}
                          value={expense.category || 'Other'}
                          onChange={(e) =>
                            handleExpenseChange(expense.originalIndex, 'category', e.target.value)
                          }
                          placeholder="Type or select category"
                        />
                        <datalist id={`category-list-${expense.originalIndex}`}>
                          {categories.map((cat) => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={Math.round(expense.amount || 0)}
                          onChange={(e) =>
                            handleExpenseChange(expense.originalIndex, 'amount', parseInt(e.target.value) || 0)
                          }
                          step="1"
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
                            {getRoomDisplay(expense.rooms || [], expense.roomAllocations)}
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

                              {(expense.rooms || []).length > 1 && (
                                <div className="allocation-actions">
                                  <button
                                    type="button"
                                    className="allocation-edit-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenRoomDropdown(null);
                                      initializeRoomAllocations(expense.originalIndex);
                                    }}
                                  >
                                    ⚙️ Customize Split
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <select
                          value={expense.status || 'Pending'}
                          onChange={(e) =>
                            handleExpenseChange(expense.originalIndex, 'status', e.target.value)
                          }
                          className="status-select"
                        >
                          <option value="Planning">Planning</option>
                          <option value="Pending">Pending</option>
                          <option value="Ordered">Ordered</option>
                          <option value="Completed">Completed</option>
                        </select>
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

        {/* Allocation Editor Modal */}
        {showAllocationModal !== null && expenses[showAllocationModal] && (
          <div className="allocation-modal-overlay" onClick={() => setShowAllocationModal(null)}>
            <div className="allocation-modal" onClick={(e) => e.stopPropagation()}>
              <div className="allocation-modal-header">
                <h3>💰 Customize Expense Split</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowAllocationModal(null)}
                >
                  ✕
                </button>
              </div>

              <div className="allocation-modal-body">
                <div className="allocation-info">
                  <strong>Expense:</strong> {expenses[showAllocationModal].description || 'Unnamed'}
                  <br />
                  <strong>Total Amount:</strong> {formatCurrency(Math.round(parseFloat(expenses[showAllocationModal].amount) || 0))}
                </div>

                <div className="allocation-grid">
                  {(expenses[showAllocationModal].roomAllocations || []).map((allocation) => {
                    const room = rooms.find(r => r.value === allocation.room);
                    return (
                      <div key={allocation.room} className="allocation-row">
                        <div className="allocation-room-name">
                          {room ? room.label : allocation.room}
                        </div>
                        <div className="allocation-inputs">
                          <div className="allocation-input-group">
                            <label>Percentage</label>
                            <input
                              type="number"
                              value={allocation.percentage.toFixed(2)}
                              onChange={(e) => updateRoomAllocation(
                                showAllocationModal,
                                allocation.room,
                                'percentage',
                                e.target.value
                              )}
                              step="0.01"
                              min="0"
                              max="100"
                            />
                            <span className="input-suffix">%</span>
                          </div>
                          <div className="allocation-input-group">
                            <label>Amount</label>
                            <input
                              type="number"
                              value={Math.round(allocation.amount)}
                              onChange={(e) => updateRoomAllocation(
                                showAllocationModal,
                                allocation.room,
                                'amount',
                                e.target.value
                              )}
                              step="1"
                              min="0"
                            />
                            <span className="input-suffix">S/</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="allocation-summary">
                  <div className="allocation-summary-row">
                    <span>Total Percentage:</span>
                    <strong>
                      {(expenses[showAllocationModal].roomAllocations || [])
                        .reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0)
                        .toFixed(2)}%
                    </strong>
                  </div>
                  <div className="allocation-summary-row">
                    <span>Total Amount:</span>
                    <strong>
                      {formatCurrency(
                        Math.round((expenses[showAllocationModal].roomAllocations || [])
                          .reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0))
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="allocation-modal-footer">
                <Button
                  variant="secondary"
                  onClick={() => resetToEqualSplit(showAllocationModal)}
                >
                  Reset to Equal Split
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => clearCustomAllocations(showAllocationModal)}
                >
                  Use Default Split
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowAllocationModal(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}

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
          background: white;
          color: #333;
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

        /* Room Dropdown Styles */
        .room-dropdown-cell {
          position: relative;
        }

        .room-dropdown-wrapper {
          position: relative;
        }

        .room-dropdown-button {
          width: 100%;
          padding: 8px 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          color: #333;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }

        .room-dropdown-button:hover {
          border-color: #667eea;
          background: #f8f9ff;
        }

        .room-dropdown-button:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .dropdown-arrow {
          margin-left: 8px;
          font-size: 10px;
          color: #666;
          transition: transform 0.2s;
        }

        .room-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 280px;
          overflow-y: auto;
          z-index: 1000;
          padding: 8px;
        }

        .room-checkbox-label {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s;
          user-select: none;
          margin-bottom: 2px;
        }

        .room-checkbox-label:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
        }

        .room-checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin: 0 12px 0 0;
          cursor: pointer;
          accent-color: #667eea;
          flex-shrink: 0;
        }

        .room-checkbox-label span {
          font-size: 14px;
          color: #333;
          line-height: 1.4;
        }

        .room-checkbox-label input[type="checkbox"]:checked + span {
          font-weight: 500;
          color: #667eea;
        }

        /* Scrollbar styling for dropdown */
        .room-dropdown-menu::-webkit-scrollbar {
          width: 8px;
        }

        .room-dropdown-menu::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .room-dropdown-menu::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }

        .room-dropdown-menu::-webkit-scrollbar-thumb:hover {
          background: #999;
        }

        /* Status Select Styles */
        .status-select {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: white;
          color: #333;
          transition: all 0.2s;
        }

        .status-select:hover {
          border-color: #667eea;
        }

        .status-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }

        .status-select option {
          padding: 8px;
        }

        /* Allocation Button in Dropdown */
        .allocation-actions {
          padding: 8px 8px 4px;
          border-top: 1px solid #e5e5e5;
          margin-top: 8px;
        }

        .allocation-edit-btn {
          width: 100%;
          padding: 10px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .allocation-edit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        /* Allocation Modal */
        .allocation-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
        }

        .allocation-modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .allocation-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 2px solid #f0f0f0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .allocation-modal-header h3 {
          margin: 0;
          font-size: 1.3rem;
        }

        .modal-close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.2rem;
          color: white;
          transition: all 0.2s;
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .allocation-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .allocation-info {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          line-height: 1.8;
          color: #333;
        }

        .allocation-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .allocation-row {
          background: white;
          border: 2px solid #e5e5e5;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .allocation-row:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        }

        .allocation-room-name {
          font-weight: 600;
          color: #667eea;
          margin-bottom: 12px;
          font-size: 1.05rem;
        }

        .allocation-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .allocation-input-group {
          display: flex;
          flex-direction: column;
        }

        .allocation-input-group label {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 6px;
          font-weight: 500;
        }

        .allocation-input-group {
          position: relative;
        }

        .allocation-input-group input {
          padding: 8px 32px 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .allocation-input-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .input-suffix {
          position: absolute;
          right: 12px;
          bottom: 9px;
          color: #999;
          font-size: 14px;
          font-weight: 500;
        }

        .allocation-summary {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          padding: 16px;
          border-radius: 8px;
          border: 2px solid #667eea;
        }

        .allocation-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 1.05rem;
        }

        .allocation-summary-row:first-child {
          border-bottom: 1px solid rgba(102, 126, 234, 0.2);
          margin-bottom: 8px;
        }

        .allocation-summary-row strong {
          color: #667eea;
          font-size: 1.2rem;
        }

        .allocation-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 2px solid #f0f0f0;
          background: #f8f9fa;
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
