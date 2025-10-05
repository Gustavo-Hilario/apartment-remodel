/**
 * Product Edit Modal Component
 *
 * Modal for editing/creating products
 */

'use client';

import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import './ProductEditModal.css';

const CATEGORIES = ['Products', 'Materials', 'Services'];
const UNITS = ['unit', 'm^2', 'm', 'kg', 'liter'];
const STATUSES = ['Planning', 'Pending', 'In Progress', 'Completed'];

export default function ProductEditModal({
  isOpen,
  onClose,
  product = null,
  onSave,
  availableRooms = []
}) {
  const [formData, setFormData] = useState({
    description: '',
    category: 'Products',
    quantity: 1,
    unit: 'unit',
    budget_price: 0,
    actual_price: 0,
    status: 'Planning',
    favorite: false,
    room: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        description: product.description || '',
        category: product.category || 'Products',
        quantity: product.quantity || 1,
        unit: product.unit || 'unit',
        budget_price: product.budget_price || 0,
        actual_price: product.actual_price || 0,
        status: product.status || 'Planning',
        favorite: product.favorite || false,
        room: product.room || '',
        notes: product.notes || ''
      });
    } else {
      // Reset for new product
      setFormData({
        description: '',
        category: 'Products',
        quantity: 1,
        unit: 'unit',
        budget_price: 0,
        actual_price: 0,
        status: 'Planning',
        favorite: false,
        room: availableRooms[0]?.slug || '',
        notes: ''
      });
    }
    setErrors({});
  }, [product, availableRooms]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.room) {
      newErrors.room = 'Room is required';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (formData.budget_price < 0) {
      newErrors.budget_price = 'Budget price cannot be negative';
    }

    if (formData.actual_price < 0) {
      newErrors.actual_price = 'Actual price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave({
        ...formData,
        quantity: parseFloat(formData.quantity),
        budget_price: parseFloat(formData.budget_price),
        actual_price: parseFloat(formData.actual_price),
        subtotal: parseFloat(formData.budget_price) * parseFloat(formData.quantity)
      });
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="product-modal-footer">
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      size="large"
      footer={footer}
    >
      <div className="product-edit-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Product description"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="room">Room *</label>
            <select
              id="room"
              value={formData.room}
              onChange={(e) => handleInputChange('room', e.target.value)}
              className={errors.room ? 'error' : ''}
            >
              <option value="">Select a room</option>
              {availableRooms.map(room => (
                <option key={room.slug} value={room.slug}>
                  {room.name}
                </option>
              ))}
            </select>
            {errors.room && <span className="error-text">{errors.room}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              id="quantity"
              type="number"
              min="0"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              className={errors.quantity ? 'error' : ''}
            />
            {errors.quantity && <span className="error-text">{errors.quantity}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="unit">Unit</label>
            <select
              id="unit"
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
            >
              {UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="budget_price">Budget Price</label>
            <input
              id="budget_price"
              type="number"
              min="0"
              step="0.01"
              value={formData.budget_price}
              onChange={(e) => handleInputChange('budget_price', e.target.value)}
              className={errors.budget_price ? 'error' : ''}
            />
            {errors.budget_price && <span className="error-text">{errors.budget_price}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="actual_price">Actual Price</label>
            <input
              id="actual_price"
              type="number"
              min="0"
              step="0.01"
              value={formData.actual_price}
              onChange={(e) => handleInputChange('actual_price', e.target.value)}
              className={errors.actual_price ? 'error' : ''}
            />
            {errors.actual_price && <span className="error-text">{errors.actual_price}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              {STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.favorite}
                onChange={(e) => handleInputChange('favorite', e.target.checked)}
              />
              <span>Mark as favorite</span>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows="3"
            />
          </div>
        </div>

        <div className="calculated-fields">
          <p><strong>Subtotal:</strong> ${(parseFloat(formData.budget_price || 0) * parseFloat(formData.quantity || 0)).toFixed(2)}</p>
        </div>
      </div>
    </Modal>
  );
}