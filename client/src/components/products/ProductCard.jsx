/**
 * Product Card Component
 * 
 * Displays product information with image gallery
 */

'use client';

import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { formatCurrency } from '@/lib/currency';
import './ProductCard.css';

export default function ProductCard({ product, onEdit, onDelete }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(
    product.images?.findIndex(img => img.showImage) || 0
  );

  const currentImage = product.images?.[selectedImageIndex];
  const hasImages = product.images && product.images.length > 0;
  const legacyImage = product.imageUrl; // Fallback for old format
  
  // Support both field naming conventions
  const unitPrice = product.unitPrice || product.actual_price || product.budget_price || 0;
  const quantity = product.quantity || 0;
  const total = quantity * unitPrice;

  const handleImageSelect = (index) => {
    setSelectedImageIndex(index);
  };

  const handleSetPrimary = (imageIndex, e) => {
    e.stopPropagation();
    if (onEdit) {
      // Update the product's images to set the new primary
      const updatedImages = product.images.map((img, idx) => ({
        ...img,
        showImage: idx === imageIndex
      }));

      const updatedProduct = {
        ...product,
        images: updatedImages
      };

      onEdit(updatedProduct);
    }
  };

  return (
    <Card className="product-card" hoverable>
      {/* Image Section */}
      {(hasImages || legacyImage) && (
        <div className="product-image-section">
          {hasImages && currentImage ? (
            <div className="product-image-main">
              <img 
                src={currentImage.url || currentImage.data || currentImage} 
                alt={product.description || 'Product'} 
              />
            </div>
          ) : legacyImage ? (
            <div className="product-image-main">
              <img 
                src={legacyImage} 
                alt={product.description || 'Product'} 
              />
            </div>
          ) : null}
          
          {hasImages && product.images.length > 1 && (
            <div className="product-image-thumbnails">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => handleImageSelect(index)}
                >
                  <img src={img.url || img.data || img} alt={`Thumbnail ${index + 1}`} />
                  <div className="thumbnail-overlay">
                    {img.showImage && <span className="thumbnail-heart primary">⭐</span>}
                    <button
                      className={`set-primary-btn ${img.showImage ? 'is-primary' : ''}`}
                      onClick={(e) => handleSetPrimary(index, e)}
                      title={img.showImage ? 'Primary image' : 'Set as primary'}
                    >
                      ❤️
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="product-content">
        <div className="product-header">
          <h3 className="product-name">{product.description || 'Unnamed Product'}</h3>
          {product.category && (
            <span className="product-category">{product.category}</span>
          )}
        </div>

        <div className="product-details">
          <div className="product-detail-row">
            <span className="detail-label">Room:</span>
            <span className="detail-value">{product.roomDisplayName || product.room || 'N/A'}</span>
          </div>
          
          <div className="product-detail-row">
            <span className="detail-label">Quantity:</span>
            <span className="detail-value">{quantity} {product.unit || 'units'}</span>
          </div>

          <div className="product-detail-row">
            <span className="detail-label">Unit Price:</span>
            <span className="detail-value">{formatCurrency(unitPrice)}</span>
          </div>

          <div className="product-detail-row highlight">
            <span className="detail-label">Total:</span>
            <span className="detail-value total">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {product.link && (
          <a 
            href={product.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="product-link"
          >
            🔗 View Product
          </a>
        )}

        {/* Actions */}
        <div className="product-actions">
          <Button 
            variant="secondary" 
            size="small"
            icon="✏️"
            onClick={() => onEdit?.(product)}
          >
            Edit
          </Button>
          <Button 
            variant="danger" 
            size="small"
            icon="🗑️"
            onClick={() => onDelete?.(product)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
