'use client';

import { useState } from 'react';

export default function ProductOptionCard({
  option,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  disabled = false,
}) {
  const [imageError, setImageError] = useState({});

  const mainImage = option.images?.find((img) => img.isMainImage) || option.images?.[0];

  const handleImageError = (imageId) => {
    setImageError((prev) => ({ ...prev, [imageId]: true }));
  };

  return (
    <div className={`option-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
      {mainImage && !imageError[mainImage.id] && (
        <div className="option-image">
          <img
            src={mainImage.data || mainImage.url}
            alt={option.name}
            onError={() => handleImageError(mainImage.id)}
          />
        </div>
      )}

      <div className="option-content">
        <div className="option-header">
          <h4 className="option-name">{option.name || 'Unnamed Option'}</h4>
          <div className="option-price">S/ {Math.round(option.price || 0)}</div>
        </div>

        {option.url && (
          <div className="option-url">
            <a href={option.url} target="_blank" rel="noopener noreferrer">
              🔗 View Product
            </a>
          </div>
        )}

        {option.description && (
          <div className="option-description">{option.description}</div>
        )}

        {option.notes && (
          <div className="option-notes">
            <strong>Notes:</strong> {option.notes}
          </div>
        )}

        {option.images && option.images.length > 1 && (
          <div className="option-images-count">
            📷 {option.images.length} images
          </div>
        )}
      </div>

      <div className="option-actions">
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => onSelect(option.id)}
              className={`btn-select ${isSelected ? 'selected' : ''}`}
              disabled={isSelected}
            >
              {isSelected ? '✓ Selected' : 'Select'}
            </button>
            <button
              type="button"
              onClick={() => onEdit(option)}
              className="btn-edit"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(option.id)}
              className="btn-delete"
            >
              Delete
            </button>
          </>
        )}
        {disabled && isSelected && (
          <div className="selected-badge">✓ Selected</div>
        )}
      </div>

      <style jsx>{`
        .option-card {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          background: white;
          transition: all 0.2s;
        }

        .option-card.selected {
          border-color: #667eea;
          background: #f8f9ff;
        }

        .option-card.disabled {
          opacity: 0.7;
        }

        .option-image {
          margin-bottom: 12px;
          border-radius: 6px;
          overflow: hidden;
          max-height: 200px;
        }

        .option-image img {
          width: 100%;
          height: auto;
          display: block;
        }

        .option-content {
          margin-bottom: 12px;
        }

        .option-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
        }

        .option-name {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          flex: 1;
        }

        .option-price {
          font-size: 20px;
          font-weight: 700;
          color: #667eea;
          margin-left: 12px;
        }

        .option-url {
          margin-bottom: 8px;
        }

        .option-url a {
          color: #667eea;
          text-decoration: none;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .option-url a:hover {
          text-decoration: underline;
        }

        .option-description {
          font-size: 14px;
          color: #4b5563;
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .option-notes {
          font-size: 13px;
          color: #6b7280;
          margin-top: 8px;
          padding: 8px;
          background: #f9fafb;
          border-radius: 4px;
        }

        .option-notes strong {
          color: #374151;
        }

        .option-images-count {
          font-size: 12px;
          color: #6b7280;
          margin-top: 8px;
        }

        .option-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .option-actions button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          transition: all 0.2s;
        }

        .option-actions button:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .btn-select {
          flex: 1;
        }

        .btn-select.selected {
          background: #667eea;
          color: white;
          border-color: #667eea;
          cursor: default;
        }

        .btn-edit {
          color: #667eea;
          border-color: #667eea;
        }

        .btn-edit:hover {
          background: #f0f0ff;
        }

        .btn-delete {
          color: #ef4444;
          border-color: #ef4444;
        }

        .btn-delete:hover {
          background: #fef2f2;
        }

        .selected-badge {
          padding: 8px 16px;
          background: #667eea;
          color: white;
          border-radius: 6px;
          font-weight: 500;
          text-align: center;
          flex: 1;
        }
      `}</style>
    </div>
  );
}
