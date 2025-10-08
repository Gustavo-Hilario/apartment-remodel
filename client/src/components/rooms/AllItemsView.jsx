'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/currency';
import { roomsAPI } from '@/lib/api';
import './AllExpensesView.css';

export default function AllItemsView({ rooms, onRefresh }) {
  const [expandedRooms, setExpandedRooms] = useState(new Set(rooms.map(r => r.slug)));
  const [editingItems, setEditingItems] = useState({}); // { roomSlug: { itemIndex: true } }
  const [roomsData, setRoomsData] = useState(
    rooms.reduce((acc, room) => {
      acc[room.slug] = {
        items: room.items || [],
        budget: room.budget || 0
      };
      return acc;
    }, {})
  );
  const [modifiedRooms, setModifiedRooms] = useState(new Set()); // Track which rooms have changes
  const [saving, setSaving] = useState(false);

  const toggleRoom = (roomSlug) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomSlug)) {
      newExpanded.delete(roomSlug);
    } else {
      newExpanded.add(roomSlug);
    }
    setExpandedRooms(newExpanded);
  };

  const handleItemChange = (roomSlug, itemIndex, field, value) => {
    setRoomsData(prev => {
      const newData = { ...prev };
      const updatedItems = [...newData[roomSlug].items];
      updatedItems[itemIndex][field] = value;

      // Recalculate subtotal when quantity or budgetRate changes
      if (['quantity', 'budgetRate'].includes(field)) {
        const item = updatedItems[itemIndex];
        item.subtotal = (item.quantity || 0) * (item.budgetRate || 0);
      }

      newData[roomSlug] = { ...newData[roomSlug], items: updatedItems };
      return newData;
    });
    
    // Mark room as modified
    setModifiedRooms(prev => new Set([...prev, roomSlug]));
  };

  const toggleFavorite = (roomSlug, itemIndex) => {
    setRoomsData(prev => {
      const newData = { ...prev };
      const updatedItems = [...newData[roomSlug].items];
      updatedItems[itemIndex].favorite = !updatedItems[itemIndex].favorite;
      newData[roomSlug] = { ...newData[roomSlug], items: updatedItems };
      return newData;
    });
    
    // Mark room as modified
    setModifiedRooms(prev => new Set([...prev, roomSlug]));
  };

  const deleteItem = async (roomSlug, itemIndex) => {
    setRoomsData(prev => {
      const newData = { ...prev };
      const updatedItems = newData[roomSlug].items.filter((_, i) => i !== itemIndex);
      newData[roomSlug] = { ...newData[roomSlug], items: updatedItems };
      return newData;
    });
    
    // Mark room as modified
    setModifiedRooms(prev => new Set([...prev, roomSlug]));
  };

  const addItem = (roomSlug) => {
    setRoomsData(prev => {
      const newData = { ...prev };
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
        images: [],
        links: [],
        notes: '',
      };
      const updatedItems = [...newData[roomSlug].items, newItem];
      newData[roomSlug] = { ...newData[roomSlug], items: updatedItems };
      return newData;
    });

    // Auto-start editing the new item
    const newIndex = roomsData[roomSlug].items.length;
    setEditingItems(prev => ({
      ...prev,
      [roomSlug]: { ...(prev[roomSlug] || {}), [newIndex]: true }
    }));
    
    // Mark room as modified
    setModifiedRooms(prev => new Set([...prev, roomSlug]));
  };

  const toggleEdit = (roomSlug, itemIndex) => {
    setEditingItems(prev => {
      const roomEdits = prev[roomSlug] || {};
      return {
        ...prev,
        [roomSlug]: {
          ...roomEdits,
          [itemIndex]: !roomEdits[itemIndex]
        }
      };
    });
  };

  const saveAllChanges = async () => {
    if (modifiedRooms.size === 0) {
      return;
    }

    try {
      setSaving(true);
      
      // Save each modified room
      const savePromises = Array.from(modifiedRooms).map(async (roomSlug) => {
        const roomData = {
          name: rooms.find(r => r.slug === roomSlug)?.name,
          budget: roomsData[roomSlug].budget,
          items: roomsData[roomSlug].items,
        };
        
        return roomsAPI.save(roomSlug, roomData);
      });
      
      await Promise.all(savePromises);
      
      // Clear all editing states and modified rooms
      setEditingItems({});
      setModifiedRooms(new Set());
      
      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalItems = Object.values(roomsData).reduce((sum, room) => sum + room.items.length, 0);
  const totalBudget = Object.values(roomsData).reduce((sum, room) => {
    const roomTotal = room.items.reduce((s, item) => s + (item.subtotal || 0), 0);
    return sum + roomTotal;
  }, 0);

  return (
    <div className="all-expenses-view">
      <div className="expenses-header">
        <div>
          <h2>📋 All Items</h2>
          <p className="total-summary">
            Total Budget: <strong>{formatCurrency(totalBudget)}</strong> ({totalItems} items)
            {modifiedRooms.size > 0 && (
              <span style={{ marginLeft: '15px', color: '#f5576c' }}>
                • {modifiedRooms.size} room(s) modified
              </span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <Button
            variant="secondary"
            onClick={() => {
              const allRooms = new Set(rooms.map(r => r.slug));
              setExpandedRooms(allRooms);
            }}
          >
            Expand All
          </Button>
          <Button
            variant="secondary"
            onClick={() => setExpandedRooms(new Set())}
          >
            Collapse All
          </Button>
          <Button
            variant="success"
            onClick={saveAllChanges}
            disabled={saving || modifiedRooms.size === 0}
            icon="💾"
          >
            {saving ? 'Saving...' : `Save All Changes${modifiedRooms.size > 0 ? ` (${modifiedRooms.size})` : ''}`}
          </Button>
        </div>
      </div>

      <div className="expenses-accordion">
        {rooms.map((room) => {
          const items = roomsData[room.slug]?.items || [];
          const roomBudgetTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
          const roomActualTotal = items
            .filter(item => item.status === 'Completed')
            .reduce((sum, item) => sum + ((item.actualRate || item.actual_price || 0) * (item.quantity || 0)), 0);

          return (
            <ItemsRoomSection
              key={room.slug}
              room={room}
              items={items}
              budgetTotal={roomBudgetTotal}
              actualTotal={roomActualTotal}
              isExpanded={expandedRooms.has(room.slug)}
              isModified={modifiedRooms.has(room.slug)}
              onToggle={() => toggleRoom(room.slug)}
              onItemChange={(itemIndex, field, value) => handleItemChange(room.slug, itemIndex, field, value)}
              onToggleFavorite={(itemIndex) => toggleFavorite(room.slug, itemIndex)}
              onDeleteItem={(itemIndex) => deleteItem(room.slug, itemIndex)}
              onAddItem={() => addItem(room.slug)}
              onToggleEdit={(itemIndex) => toggleEdit(room.slug, itemIndex)}
              editingItems={editingItems[room.slug] || {}}
            />
          );
        })}
      </div>
    </div>
  );
}

function ItemsRoomSection({ 
  room, 
  items, 
  budgetTotal, 
  actualTotal, 
  isExpanded, 
  isModified,
  onToggle,
  onItemChange,
  onToggleFavorite,
  onDeleteItem,
  onAddItem,
  onToggleEdit,
  editingItems
}) {
  const completedItems = items.filter(i => i.status === 'Completed').length;
  
  return (
    <Card className="expense-room-section">
      <div className="room-header" onClick={onToggle}>
        <div className="room-header-left">
          <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          <h3>
            {room.name}
            {isModified && <span style={{ marginLeft: '8px', color: '#f5576c', fontSize: '14px' }}>●</span>}
          </h3>
          <span className="expense-count">
            ({items.length} items • {completedItems} completed)
          </span>
        </div>
        <div className="room-total">
          <div style={{ fontSize: '14px', opacity: 0.8 }}>Budget: {formatCurrency(budgetTotal)}</div>
          <div>Spent: {formatCurrency(actualTotal)}</div>
        </div>
      </div>

      {isExpanded && (
        <div className="room-expenses">
          <div className="expenses-actions">
            <Button
              variant="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAddItem();
              }}
              icon="➕"
            >
              Add Item
            </Button>
          </div>

          <table className="expenses-table">
            <thead>
              <tr>
                <th style={{ width: '3%' }}>⭐</th>
                <th style={{ width: '20%' }}>Description</th>
                <th style={{ width: '10%' }}>Category</th>
                <th style={{ width: '6%' }}>Qty</th>
                <th style={{ width: '6%' }}>Unit</th>
                <th style={{ width: '10%' }}>Budget Rate</th>
                <th style={{ width: '10%' }}>Actual Rate</th>
                <th style={{ width: '9%' }}>Subtotal</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '10%' }}>Notes</th>
                <th style={{ width: '8%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const isEditing = editingItems[index];
                
                return (
                  <tr key={index} className={item.status === 'Completed' ? 'completed' : ''}>
                    <td style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onToggleFavorite(index)}>
                      {item.favorite || item.isFavorite ? '⭐' : '☆'}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => onItemChange(index, 'description', e.target.value)}
                          className="expense-input"
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.description}
                          {item.images && item.images.length > 0 && (
                            <span title={`${item.images.length} image(s)`}>🖼️</span>
                          )}
                          {item.links && item.links.length > 0 && (
                            <span title={`${item.links.length} link(s)`}>🔗</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={item.category}
                          onChange={(e) => onItemChange(index, 'category', e.target.value)}
                          className="expense-input"
                        >
                          <option value="Products">Products</option>
                          <option value="Materials">Materials</option>
                          <option value="Labor">Labor</option>
                          <option value="Services">Services</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <span className={`category-badge ${item.category?.toLowerCase()}`}>
                          {item.category}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="expense-input"
                          min="0"
                          step="1"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => onItemChange(index, 'unit', e.target.value)}
                          className="expense-input"
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.budgetRate || item.budget_price || 0}
                          onChange={(e) => onItemChange(index, 'budgetRate', parseFloat(e.target.value) || 0)}
                          className="expense-input"
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        formatCurrency(item.budgetRate || item.budget_price || 0)
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.actualRate || item.actual_price || 0}
                          onChange={(e) => onItemChange(index, 'actualRate', parseFloat(e.target.value) || 0)}
                          className="expense-input"
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        formatCurrency(item.actualRate || item.actual_price || 0)
                      )}
                    </td>
                    <td><strong>{formatCurrency(item.subtotal || 0)}</strong></td>
                    <td>
                      {isEditing ? (
                        <select
                          value={item.status}
                          onChange={(e) => onItemChange(index, 'status', e.target.value)}
                          className="expense-input"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      ) : (
                        <span className={`status-badge ${item.status?.toLowerCase()?.replace(' ', '-')}`}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => onItemChange(index, 'notes', e.target.value)}
                          className="expense-input"
                          placeholder="Notes..."
                        />
                      ) : (
                        <span title={item.notes}>{item.notes ? '📝' : '-'}</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant={isEditing ? 'success' : 'secondary'}
                          size="small"
                          onClick={() => onToggleEdit(index)}
                          title={isEditing ? 'Done editing' : 'Edit item'}
                        >
                          {isEditing ? '✓' : '✏️'}
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => onDeleteItem(index)}
                          title="Delete item"
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {items.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              No items in this room yet. Click "Add Item" to get started!
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
