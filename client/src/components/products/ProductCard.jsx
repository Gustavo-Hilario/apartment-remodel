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

  const handleImageSelect = (index) => {
    setSelectedImageIndex(index);
  };

  return (
    <Card className="product-card" hoverable>
      {/* Image Section */}
      {hasImages && (
        <div className="product-image-section">
          {currentImage && (
            <div className="product-image-main">
              <img 
                src={currentImage.data} 
                alt={product.description || 'Product'} 
              />
            </div>
          )}
          
          {product.images.length > 1 && (
            <div className="product-image-thumbnails">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => handleImageSelect(index)}
                >
                  <img src={img.data} alt={`Thumbnail ${index + 1}`} />
                  {img.showImage && <span className="thumbnail-heart">❤️</span>}
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
            <span className="detail-value">{product.room || 'N/A'}</span>
          </div>
          
          <div className="product-detail-row">
            <span className="detail-label">Quantity:</span>
            <span className="detail-value">{product.quantity || 0}</span>
          </div>

          <div className="product-detail-row">
            <span className="detail-label">Unit Price:</span>
            <span className="detail-value">{formatCurrency(product.unitPrice || 0)}</span>
          </div>

          <div className="product-detail-row highlight">
            <span className="detail-label">Total:</span>
            <span className="detail-value total">
              {formatCurrency((product.quantity || 0) * (product.unitPrice || 0))}
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
