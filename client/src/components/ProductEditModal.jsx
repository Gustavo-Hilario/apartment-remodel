/**
 * Product Edit Modal Component
 *
 * Modal for editing/creating products
 */

'use client';

import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ImageUpload';
import ProductOptionsManager from './ProductOptionsManager';
import './ProductEditModal.css';

const CATEGORIES = ['Products', 'Materials', 'Services'];
const UNITS = ['unit', 'm^2', 'm', 'kg', 'liter'];
const STATUSES = ['Planning', 'Pending', 'In Progress', 'Completed'];

export default function ProductEditModal({
  isOpen,
  onClose,
  product = null,
  initialData = null,
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
    notes: '',
    images: [],
    productOptions: [],
    selectedOptionId: '',
    selectedProductName: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when product or initialData changes
  useEffect(() => {
    const dataToLoad = product || initialData;
    
    if (dataToLoad) {
      // Convert existing images to the new format with IDs if needed
      let formattedImages = [];

      // Handle new images array format
      if (dataToLoad.images && dataToLoad.images.length > 0) {
        formattedImages = dataToLoad.images.map((img, index) => ({
          id: img.id || `existing-${index}`,
          name: img.name || `Image ${index + 1}`,
          data: img.data || img.url || img,
          url: img.url || img.data || img,
          showImage: img.showImage || false,
          size: img.size || 0
        }));
      }
      // Handle legacy imageUrl field
      else if (dataToLoad.imageUrl) {
        formattedImages = [{
          id: 'legacy-image',
          name: dataToLoad.description || 'Product Image',
          data: dataToLoad.imageUrl,
          url: dataToLoad.imageUrl,
          showImage: true, // Legacy images are automatically primary
          size: 0
        }];
      }

      setFormData({
        description: dataToLoad.description || '',
        category: dataToLoad.category || 'Products',
        quantity: dataToLoad.quantity || 1,
        unit: dataToLoad.unit || 'unit',
        budget_price: dataToLoad.budgetRate || dataToLoad.budget_price || 0,
        actual_price: dataToLoad.actualRate || dataToLoad.actual_price || 0,
        status: dataToLoad.status || 'Planning',
        favorite: dataToLoad.favorite || dataToLoad.isFavorite || false,
        room: dataToLoad.room || availableRooms[0]?.slug || '',
        notes: dataToLoad.notes || '',
        images: formattedImages,
        productOptions: dataToLoad.productOptions || [],
        selectedOptionId: dataToLoad.selectedOptionId || '',
        selectedProductName: dataToLoad.selectedProductName || ''
      });
    } else {
      // Reset for new product - use the first available room
      const defaultRoom = availableRooms && availableRooms.length > 0 ? availableRooms[0].slug : '';
      setFormData({
        description: '',
        category: 'Products',
        quantity: 1,
        unit: 'unit',
        budget_price: 0,
        actual_price: 0,
        status: 'Planning',
        favorite: false,
        room: defaultRoom,
        notes: '',
        images: [],
        productOptions: [],
        selectedOptionId: '',
        selectedProductName: ''
      });
    }
    setErrors({});
  }, [product, initialData]); // Removed availableRooms from dependencies to prevent loops

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

  const handleImagesChange = (images) => {
    console.log('📸 Images changed in ProductEditModal:', images);
    setFormData(prev => ({
      ...prev,
      images: images
    }));
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
      const saveData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        budget_price: parseFloat(formData.budget_price),
        actual_price: parseFloat(formData.actual_price)
      };
      console.log('💾 Saving product data:', saveData);
      await onSave(saveData);
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

        <div className="form-section product-options-section">
          <ProductOptionsManager
            item={formData}
            onChange={(updatedItem) => setFormData(updatedItem)}
          />
        </div>

        <div className="form-section">
          <label className="section-label">Product Images</label>
          <ImageUpload
            images={formData.images}
            onImagesChange={handleImagesChange}
            maxImages={5}
            maxSizeMB={2}
          />
        </div>

        <div className="calculated-fields">
          <p><strong>Subtotal:</strong> ${(parseFloat(formData.budget_price || 0) * parseFloat(formData.quantity || 0)).toFixed(2)}</p>
        </div>
      </div>
    </Modal>
  );
}