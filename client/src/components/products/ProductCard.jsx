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
import AdminOnly from '../auth/AdminOnly';
import './ProductCard.css';

export default function ProductCard({ product, onEdit, onQuickSave, onDelete, onDuplicate }) {
  // Determine which images to display based on selected product option
  const getDisplayImages = () => {
    // If a product option is selected, use its images instead
    if (product.selectedOptionId && product.productOptions && product.productOptions.length > 0) {
      const selectedOption = product.productOptions.find(opt => opt.id === product.selectedOptionId);
      if (selectedOption && selectedOption.images && selectedOption.images.length > 0) {
        return selectedOption.images;
      }
    }

    // Otherwise, fall back to product's main images
    if (product.images && product.images.length > 0) {
      return product.images;
    } else if (product.imageUrl) {
      // Convert legacy imageUrl to new format for display
      return [{
        id: 'legacy',
        name: product.description || 'Product Image',
        url: product.imageUrl,
        data: product.imageUrl,
        isMainImage: true,
        showImage: true // Backward compatibility
      }];
    }

    return [];
  };

  const displayImages = getDisplayImages();

  // Handle both new images array and legacy imageUrl field for initial state
  const initialIndex = (() => {
    if (displayImages.length > 0) {
      const mainImageIndex = displayImages.findIndex(img => img.isMainImage || img.showImage);
      return mainImageIndex >= 0 ? mainImageIndex : 0;
    }
    return 0; // For legacy images, always start with index 0
  })();

  const [selectedImageIndex, setSelectedImageIndex] = useState(initialIndex);

  const currentImage = displayImages[selectedImageIndex];
  const hasImages = displayImages.length > 0;
  const legacyImage = product.imageUrl; // Fallback for old format
  
  // Support both field naming conventions
  // Priority: actualRate (actual price) > budgetRate (budget price) > legacy fields
  const actualPrice = product.actualRate || product.actual_price || 0;
  const budgetPrice = product.budgetRate || product.budget_price || 0;
  const unitPrice = actualPrice > 0 ? actualPrice : budgetPrice;
  const quantity = product.quantity || 0;
  const total = quantity * unitPrice;

  const handleImageSelect = (index) => {
    setSelectedImageIndex(index);
  };

  const handleSetPrimary = (imageIndex, e) => {
    e.stopPropagation();
    if (onEdit) {
      const clickedImage = displayImages[imageIndex];
      const isCurrentlyMain = clickedImage?.isMainImage || clickedImage?.showImage;
      
      // Toggle: if clicking on main image, unset it; otherwise set it as main
      const updatedImages = displayImages.map((img, idx) => ({
        ...img,
        isMainImage: isCurrentlyMain ? false : idx === imageIndex,
        showImage: isCurrentlyMain ? false : idx === imageIndex // Backward compatibility
      }));

      const updatedProduct = {
        ...product,
        images: updatedImages
      };

      onEdit(updatedProduct);
    }
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onQuickSave) {
      const currentFavoriteStatus = product.isFavorite || product.favorite;
      const updatedProduct = {
        ...product,
        isFavorite: !currentFavoriteStatus,
        favorite: !currentFavoriteStatus // Backward compatibility
      };
      onQuickSave(updatedProduct);
    }
  };

  const isFavorite = product.isFavorite || product.favorite;

  const isCompleted = product.status === 'Completed';

  return (
    <Card className={`product-card ${isCompleted ? 'completed' : ''}`} hoverable>
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
          
          {hasImages && displayImages.length > 1 && (
            <div className="product-image-thumbnails">
              {displayImages.map((img, index) => (
                <button
                  key={img.id || index}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => handleImageSelect(index)}
                >
                  <img src={img.url || img.data || img} alt={`Thumbnail ${index + 1}`} />
                  <div className="thumbnail-overlay">
                    {(img.isMainImage || img.showImage) && <span className="thumbnail-heart primary">⭐</span>}
                    <AdminOnly>
                      <span
                        className={`set-primary-btn ${(img.isMainImage || img.showImage) ? 'is-primary' : ''}`}
                        onClick={(e) => handleSetPrimary(index, e)}
                        title={(img.isMainImage || img.showImage) ? 'Primary image' : 'Set as primary'}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSetPrimary(index, e);
                          }
                        }}
                      >
                        ❤️
                      </span>
                    </AdminOnly>
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
          <div className="product-header-main">
            <h3 className="product-name">{product.description || 'Unnamed Product'}</h3>
            {product.category && (
              <span className={`product-category ${product.category.toLowerCase() === 'materials' ? 'materials' : ''}`}>{product.category}</span>
            )}
          </div>
          <div className="product-header-actions">
            <AdminOnly>
              <button 
                className="duplicate-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.(product);
                }}
                title="Duplicate product"
              >
                📋
              </button>
            </AdminOnly>
            <button 
              className={`favorite-toggle ${isFavorite ? 'is-favorite' : ''}`}
              onClick={handleToggleFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? '⭐' : '☆'}
            </button>
          </div>
        </div>

        <div className="product-details">
          {/* Show selected option if available */}
          {product.selectedOptionId && product.selectedProductName && (
            <div className="product-detail-row selected-option">
              <span className="detail-label">Selected Option:</span>
              <span className="detail-value option-badge">{product.selectedProductName}</span>
            </div>
          )}

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
        <AdminOnly>
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
        </AdminOnly>
      </div>
    </Card>
  );
}
