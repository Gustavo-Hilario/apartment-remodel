'use client';

import { useState } from 'react';
import ProductOptionCard from './ProductOptionCard';
import ImageUpload from './ImageUpload';
import {
  createNewOption,
  selectProductOption,
  addOption,
  updateOption,
  deleteOption,
  getOptionCount,
} from '../utils/productOptions';

export default function ProductOptionsManager({ item, onChange, disabled = false }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'edit'
  const [editingOption, setEditingOption] = useState(null);
  const [formData, setFormData] = useState(createNewOption());

  const productOptions = item.productOptions || [];
  const optionCount = getOptionCount(item);

  const handleCreateNew = () => {
    setEditingOption(null);
    setFormData(createNewOption());
    setActiveTab('edit');
  };

  const handleEdit = (option) => {
    setEditingOption(option);
    setFormData({ ...option });
    setActiveTab('edit');
  };

  const handleDelete = (optionId) => {
    if (confirm('Are you sure you want to delete this option?')) {
      const updatedItem = deleteOption(item, optionId);
      onChange(updatedItem);
    }
  };

  const handleSelect = (optionId) => {
    const updatedItem = selectProductOption(item, optionId);
    onChange(updatedItem);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveOption = () => {
    // Validate required fields
    if (!formData.name || !formData.price) {
      alert('Please enter both name and price');
      return;
    }

    let updatedItem;
    if (editingOption) {
      // Update existing option
      updatedItem = updateOption(item, editingOption.id, formData);
    } else {
      // Add new option
      updatedItem = addOption(item, formData);
    }

    onChange(updatedItem);
    setActiveTab('list');
    setFormData(createNewOption());
    setEditingOption(null);
  };

  const handleCancel = () => {
    setActiveTab('list');
    setFormData(createNewOption());
    setEditingOption(null);
  };

  const handleImagesChange = (images) => {
    setFormData((prev) => ({ ...prev, images }));
  };

  return (
    <div className="options-manager">
      <div className="options-header">
        <h3>Product Options</h3>
        <div className="options-count">
          {optionCount} {optionCount === 1 ? 'option' : 'options'}
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Options List ({optionCount})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={handleCreateNew}
          disabled={disabled}
        >
          {editingOption ? 'Edit Option' : '+ Add Option'}
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'list' && (
          <div className="options-list">
            {productOptions.length === 0 ? (
              <div className="empty-state">
                <p>No product options yet</p>
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="btn-primary"
                  >
                    Add First Option
                  </button>
                )}
              </div>
            ) : (
              productOptions.map((option) => (
                <ProductOptionCard
                  key={option.id}
                  option={option}
                  isSelected={item.selectedOptionId === option.id}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  disabled={disabled}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="option-form">
            <div className="form-group">
              <label>Option Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="e.g., White Porcelain Model A"
              />
            </div>

            <div className="form-group">
              <label>Price (S/) *</label>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleFormChange('price', parseInt(e.target.value) || 0)}
                step="1"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Product URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleFormChange('url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows="3"
                placeholder="Brief description of this option..."
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows="2"
                placeholder="Internal notes about this option..."
              />
            </div>

            <div className="form-group">
              <label>Images</label>
              <ImageUpload
                images={formData.images}
                onImagesChange={handleImagesChange}
                maxImages={5}
                maxSizeMB={2}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleSaveOption}
                className="btn-primary"
              >
                {editingOption ? 'Update Option' : 'Add Option'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .options-manager {
          margin-top: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .options-header {
          background: #f9fafb;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .options-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .options-count {
          font-size: 14px;
          color: #6b7280;
          background: white;
          padding: 4px 12px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .tabs {
          display: flex;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .tab {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: transparent;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab:hover:not(:disabled) {
          background: #f3f4f6;
          color: #374151;
        }

        .tab.active {
          background: white;
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab-content {
          padding: 16px;
          background: white;
        }

        .options-list {
          min-height: 200px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .empty-state p {
          margin-bottom: 16px;
        }

        .option-form {
          max-width: 600px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-primary {
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #5568d3;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}
