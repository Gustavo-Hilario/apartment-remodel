/**
 * Expenses Page (Main Project Costs)
 * 
 * Manage main project expenses and manual costs
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner, DatePicker } from '@/components/ui';
import CategorySelector from '@/components/CategorySelector';
import { expensesAPI, roomsAPI, categoriesAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import AdminOnly from '@/components/auth/AdminOnly';

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [openRoomDropdown, setOpenRoomDropdown] = useState(null);
  const [showAllocationModal, setShowAllocationModal] = useState(null); // Track which expense allocation editor is open
  
  // Filter states
  const [filterDateRange, setFilterDateRange] = useState({ start: null, end: null });
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterStatus, setFilterStatus] = useState('Completed'); // Default to Completed

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
    // Create a temporary ID for the new expense (will be assigned by backend on save)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newExpense = {
      _id: tempId,
      source: 'expenses',
      description: '',
      amount: 0,
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      rooms: [],
      roomAllocations: [],
      notes: '',
      createdDate: new Date().toISOString().split('T')[0],
      completedDate: null,
      isSharedExpense: false
    };

    // Clear filters so new expense is visible
    setFilterDateRange({ start: null, end: null });
    setFilterCategory('all');
    setFilterRoom('all');
    setFilterStatus('all');

    // Add to local state only - will be saved when user clicks Save
    setExpenses([newExpense, ...expenses]);
  };

  const deleteExpense = (expenseId) => {
    setExpenses(expenses.filter(exp => exp._id !== expenseId));
  };

  const handleExpenseChange = (expenseId, field, value) => {
    const updated = expenses.map(exp =>
      exp._id === expenseId ? { ...exp, [field]: value } : exp
    );
    setExpenses(updated);
  };

  const toggleRoom = (expenseId, roomValue) => {
    const updated = expenses.map(exp => {
      if (exp._id !== expenseId) return exp;

      const expRooms = exp.rooms || [];

      if (roomValue === 'all') {
        // Toggle all rooms
        const allRoomValues = rooms.filter(r => r.value !== 'all').map(r => r.value);
        return {
          ...exp,
          rooms: expRooms.length === allRoomValues.length ? [] : allRoomValues
        };
      } else {
        // Toggle individual room
        const hasRoom = expRooms.includes(roomValue);
        return {
          ...exp,
          rooms: hasRoom
            ? expRooms.filter(r => r !== roomValue)
            : [...expRooms, roomValue]
        };
      }
    });

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

  const initializeRoomAllocations = (expenseId) => {
    const expense = expenses.find(exp => exp._id === expenseId);
    if (!expense) return;

    const amount = parseFloat(expense.amount) || 0;
    const expenseRooms = expense.rooms || [];

    if (expenseRooms.length <= 1) return;

    // If already has custom allocations, keep them
    if (expense.roomAllocations && expense.roomAllocations.length > 0) {
      setShowAllocationModal(expenseId);
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

    const updated = expenses.map(exp =>
      exp._id === expenseId ? { ...exp, roomAllocations: allocations } : exp
    );
    setExpenses(updated);
    setShowAllocationModal(expenseId);
  };

  const updateRoomAllocation = (expenseId, roomSlug, field, value) => {
    const updated = expenses.map(exp => {
      if (exp._id !== expenseId) return exp;

      const totalAmount = parseFloat(exp.amount) || 0;

      if (!exp.roomAllocations) {
        initializeRoomAllocations(expenseId);
        return exp;
      }

      const allocations = [...exp.roomAllocations];
      const allocationIndex = allocations.findIndex(a => a.room === roomSlug);

      if (allocationIndex === -1) return exp;

      if (field === 'percentage') {
        const percentage = parseFloat(value) || 0;
        allocations[allocationIndex].percentage = percentage;
        allocations[allocationIndex].amount = (totalAmount * percentage) / 100;
      } else if (field === 'amount') {
        const amount = parseFloat(value) || 0;
        allocations[allocationIndex].amount = amount;
        allocations[allocationIndex].percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      }

      return { ...exp, roomAllocations: allocations };
    });

    setExpenses(updated);
  };

  const resetToEqualSplit = (expenseId) => {
    const updated = expenses.map(exp => {
      if (exp._id !== expenseId) return exp;

      const amount = parseFloat(exp.amount) || 0;
      const expenseRooms = exp.rooms || [];

      if (expenseRooms.length <= 1) return exp;

      const amountPerRoom = amount / expenseRooms.length;
      const percentagePerRoom = 100 / expenseRooms.length;

      return {
        ...exp,
        roomAllocations: expenseRooms.map(roomSlug => ({
          room: roomSlug,
          amount: amountPerRoom,
          percentage: percentagePerRoom
        }))
      };
    });

    setExpenses(updated);
  };

  const clearCustomAllocations = (expenseId) => {
    const updated = expenses.map(exp =>
      exp._id === expenseId ? { ...exp, roomAllocations: [] } : exp
    );
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

  const getFilteredAndSortedExpenses = () => {
    // Filter expenses (no need for originalIndex - we use _id + roomSlug)
    let filtered = [...expenses];

    // Date range filter
    if (filterDateRange.start || filterDateRange.end) {
      filtered = filtered.filter(exp => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        if (filterDateRange.start && expDate < filterDateRange.start) return false;
        if (filterDateRange.end && expDate > filterDateRange.end) return false;
        return true;
      });
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(exp => exp.category === filterCategory);
    }

    // Room filter
    if (filterRoom !== 'all') {
      filtered = filtered.filter(exp => {
        if (!exp.rooms || exp.rooms.length === 0) return filterRoom === 'general';
        return exp.rooms.includes(filterRoom);
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(exp => exp.status === filterStatus);
    }

    // Then sort
    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
  };
  
  const clearFilters = () => {
    setFilterDateRange({ start: null, end: null });
    setFilterCategory('all');
    setFilterRoom('all');
    setFilterStatus('Completed'); // Reset to default Completed filter
  };

  // Total Spent: Only completed items
  const totalSpent = expenses
    .filter(exp => exp.status === 'Completed')
    .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  // Expected Total: All items regardless of status
  const totalExpected = expenses.reduce(
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

  const sortedExpenses = getFilteredAndSortedExpenses();

  return (
    <MainLayout>
      <div className="expenses-page">
        <header className="editor-header">
          <div>
            <h1>💰 Main Project Costs</h1>
            <p className="subtitle">Manual expenses and completed items</p>
          </div>
          <AdminOnly>
            <div className="header-actions">
              <Button onClick={addExpense} icon="➕">
                Add Expense
              </Button>
              <Button onClick={handleSave} disabled={saving} icon="💾">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </AdminOnly>
        </header>

        {/* Summary Cards */}
        <div className="expense-summary">
          <Card>
            <div className="summary-stat">
              <div className="stat-label">Total Spent (Completed)</div>
              <div className="stat-value" style={{ color: '#ee0979' }}>
                {formatCurrency(Math.round(totalSpent))}
              </div>
            </div>
          </Card>
          <Card>
            <div className="summary-stat">
              <div className="stat-label">Expected Total (All Items)</div>
              <div className="stat-value" style={{ color: '#764ba2' }}>
                {formatCurrency(Math.round(totalExpected))}
              </div>
            </div>
          </Card>
          <Card>
            <div className="summary-stat">
              <div className="stat-label">Number of Items</div>
              <div className="stat-value" style={{ color: '#667eea' }}>
                {expenses.length}
              </div>
            </div>
          </Card>
        </div>

        {/* Filters Section */}
        <Card>
          <div className="filters-section">
            <h3 className="filters-title">🔍 Filters</h3>
            <div className="filters-grid">
              <div className="filter-group">
                <label>Date Range</label>
                <div className="date-range-inputs">
                  <DatePicker
                    selected={filterDateRange.start}
                    onChange={(date) => setFilterDateRange({ ...filterDateRange, start: date })}
                    placeholderText="Start date"
                    isClearable
                    maxDate={filterDateRange.end || new Date()}
                  />
                  <span className="date-separator">→</span>
                  <DatePicker
                    selected={filterDateRange.end}
                    onChange={(date) => setFilterDateRange({ ...filterDateRange, end: date })}
                    placeholderText="End date"
                    isClearable
                    minDate={filterDateRange.start}
                    maxDate={new Date()}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Room</label>
                <select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Rooms</option>
                  <option value="general">General (No Room)</option>
                  {rooms.filter(r => r.value !== 'all').map(room => (
                    <option key={room.value} value={room.value}>{room.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="Planning">Planning</option>
                  <option value="Pending">Pending</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            
            {(filterDateRange.start || filterDateRange.end || filterCategory !== 'all' ||
              filterRoom !== 'all' || filterStatus !== 'Completed') && (
              <div className="filter-actions">
                <Button variant="secondary" onClick={clearFilters} icon="✕">
                  Clear Filters
                </Button>
                <span className="filter-results-count">
                  Showing {sortedExpenses.length} of {expenses.length} items
                </span>
              </div>
            )}
          </div>
        </Card>

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
                  {session?.user?.role === 'admin' && (
                    <th style={{ width: '60px' }}>Actions</th>
                  )}
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
                    <tr
                      key={`${expense.roomSlug}-${expense._id}`}
                      className={expense.status === 'Completed' ? 'completed-row' : ''}
                    >
                      <td style={{ textAlign: 'center' }}>💵</td>
                      <td>
                        <DatePicker
                          selected={expense.date ? new Date(expense.date) : null}
                          onChange={(date) => {
                            const dateString = date ? date.toISOString().split('T')[0] : '';
                            handleExpenseChange(expense._id, 'date', dateString);
                          }}
                          placeholderText="Select date"
                          isClearable
                          maxDate={new Date()}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={expense.description || ''}
                          onChange={(e) =>
                            handleExpenseChange(expense._id, 'description', e.target.value)
                          }
                          placeholder="Expense description (required)"
                          required
                          style={{
                            borderColor: !expense.description ? '#ff6b6b' : '#ddd'
                          }}
                        />
                      </td>
                      <td>
                        <CategorySelector
                          category={expense.category || 'Other'}
                          onCategoryChange={(newCategory) =>
                            handleExpenseChange(expense._id, 'category', newCategory)
                          }
                          categories={categories}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={parseFloat(expense.amount || 0).toFixed(2)}
                          onChange={(e) =>
                            handleExpenseChange(expense._id, 'amount', parseFloat(e.target.value) || 0)
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
                              openRoomDropdown === expense._id ? null : expense._id
                            )}
                          >
                            {getRoomDisplay(expense.rooms || [], expense.roomAllocations)}
                            <span className="dropdown-arrow">▼</span>
                          </button>

                          {openRoomDropdown === expense._id && (
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
                                      onChange={() => toggleRoom(expense._id, room.value)}
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
                                      initializeRoomAllocations(expense._id);
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
                            handleExpenseChange(expense._id, 'status', e.target.value)
                          }
                          className="status-select"
                        >
                          <option value="Planning">Planning</option>
                          <option value="Pending">Pending</option>
                          <option value="Ordered">Ordered</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      {session?.user?.role === 'admin' && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="delete-btn"
                            onClick={() => deleteExpense(expense._id)}
                            title="Delete expense"
                          >
                            🗑️
                          </button>
                        </td>
                      )}
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
        <AdminOnly>
          <div className="bottom-actions">
            <Button onClick={handleSave} disabled={saving} icon="💾" variant="primary">
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </AdminOnly>
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

        .expenses-table tbody tr.completed-row {
          background-color: #d4edda;
        }

        .expenses-table tbody tr.completed-row:hover {
          background-color: #c3e6cb;
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

        /* DatePicker in table cells */
        .expenses-table :global(.date-picker-input) {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
          background: white;
          color: #333;
        }

        .expenses-table :global(.date-picker-input):hover {
          border-color: #667eea;
        }

        .expenses-table :global(.date-picker-input):focus {
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

        /* Filters Section Styles */
        .filters-section {
          padding: 20px;
        }

        .filters-title {
          margin: 0 0 20px 0;
          font-size: 1.2rem;
          color: #667eea;
          font-weight: 600;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #555;
          margin-bottom: 8px;
        }

        .filter-select {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          color: #333;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:hover {
          border-color: #667eea;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .date-range-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-range-inputs :global(.date-picker-input) {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .date-range-inputs :global(.date-picker-input):hover {
          border-color: #667eea;
        }

        .date-range-inputs :global(.date-picker-input):focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .date-separator {
          color: #667eea;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .filter-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
          margin-top: 8px;
        }

        .filter-results-count {
          color: #666;
          font-size: 0.9rem;
          font-weight: 500;
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

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .date-range-inputs {
            flex-direction: column;
            align-items: stretch;
          }

          .date-separator {
            transform: rotate(90deg);
          }

          .filter-actions {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
        }
      `}</style>
    </MainLayout>
  );
}
