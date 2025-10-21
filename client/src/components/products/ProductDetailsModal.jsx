/**
 * Product Details Modal Component
 *
 * Displays comprehensive product information in a read-only modal
 */

'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import { formatCurrency } from '@/lib/currency';
import './ProductDetailsModal.css';

export default function ProductDetailsModal({ isOpen, onClose, product }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!product) return null;

  // Get display images (from selected option or main product)
  const getDisplayImages = () => {
    // If a product option is selected, use its images
    if (product.selectedOptionId && product.productOptions && product.productOptions.length > 0) {
      const selectedOption = product.productOptions.find(opt => opt.id === product.selectedOptionId);
      if (selectedOption && selectedOption.images && selectedOption.images.length > 0) {
        return selectedOption.images;
      }
    }

    // Fall back to product's main images
    if (product.images && product.images.length > 0) {
      return product.images;
    } else if (product.imageUrl) {
      return [{
        id: 'legacy',
        name: product.description || 'Product Image',
        url: product.imageUrl,
        data: product.imageUrl,
        isMainImage: true
      }];
    }

    return [];
  };

  const displayImages = getDisplayImages();
  const currentImage = displayImages[selectedImageIndex];
  const hasImages = displayImages.length > 0;

  // Calculate prices
  const actualPrice = product.actualRate || product.actual_price || 0;
  const budgetPrice = product.budgetRate || product.budget_price || 0;
  const unitPrice = actualPrice > 0 ? actualPrice : budgetPrice;
  const quantity = product.quantity || 0;
  const total = quantity * unitPrice;

  const isFavorite = product.isFavorite || product.favorite;
  const isCompleted = product.status === 'Completed';

  // Get the URL from the selected option if available, otherwise from product
  const getProductUrl = () => {
    // Priority 1: If a product option is selected and has a URL, use that
    if (product.selectedOptionId && product.productOptions && product.productOptions.length > 0) {
      const selectedOption = product.productOptions.find(opt => opt.id === product.selectedOptionId);
      if (selectedOption?.url) {
        return selectedOption.url;
      }
    }

    // Priority 2: Check product.link field
    if (product.link) {
      return product.link;
    }

    // Priority 3: Check product.links array
    if (product.links && product.links.length > 0) {
      const firstLink = product.links[0];
      return firstLink.url || firstLink;
    }

    return null;
  };

  const primaryProductUrl = getProductUrl();

  // Get product links for the links section (support both 'link' and 'links' fields)
  const productLinks = product.links && product.links.length > 0
    ? product.links
    : product.link
    ? [{ url: product.link, label: 'Product Link' }]
    : [];

  console.log('Product URL Debug:', {
    selectedOptionId: product.selectedOptionId,
    productLink: product.link,
    productLinks: product.links,
    primaryUrl: primaryProductUrl
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Details"
      size="large"
    >
      <div className="product-details-modal">
        {/* Header Section */}
        <div className="details-header">
          <div className="details-header-content">
            <h2 className="details-title">
              {product.description || 'Unnamed Product'}
              {isFavorite && <span className="favorite-badge">⭐ Favorite</span>}
            </h2>
            <div className="details-meta">
              {product.category && (
                <span className={`category-badge ${product.category.toLowerCase() === 'materials' ? 'materials' : ''}`}>
                  {product.category}
                </span>
              )}
              {product.status && (
                <span className={`status-badge ${isCompleted ? 'completed' : 'pending'}`}>
                  {product.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Image Gallery Section */}
        {hasImages && (
          <div className="details-gallery">
            <div className="gallery-main">
              {primaryProductUrl ? (
                <a
                  href={primaryProductUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gallery-main-link"
                  title="View product page"
                >
                  <img
                    src={currentImage.url || currentImage.data || currentImage}
                    alt={product.description || 'Product'}
                  />
                  <div className="gallery-main-overlay">
                    <span className="gallery-link-icon">🔗 View Product</span>
                  </div>
                </a>
              ) : (
                <img
                  src={currentImage.url || currentImage.data || currentImage}
                  alt={product.description || 'Product'}
                />
              )}
            </div>

            {displayImages.length > 1 && (
              <div className="gallery-thumbnails">
                {displayImages.map((img, index) => (
                  <button
                    key={img.id || index}
                    className={`gallery-thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={img.url || img.data || img} alt={`View ${index + 1}`} />
                    {(img.isMainImage || img.showImage) && (
                      <span className="primary-badge">⭐</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {displayImages.length > 1 && (
              <div className="gallery-counter">
                Image {selectedImageIndex + 1} of {displayImages.length}
              </div>
            )}
          </div>
        )}

        {/* Product Information Grid */}
        <div className="details-grid">
          {/* Basic Information */}
          <div className="details-section">
            <h3 className="section-title">📋 Basic Information</h3>
            <div className="info-rows">
              <div className="info-row">
                <span className="info-label">Room:</span>
                <span className="info-value">{product.roomDisplayName || product.room || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Category:</span>
                <span className="info-value">{product.category || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className="info-value">{product.status || 'Pending'}</span>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="details-section">
            <h3 className="section-title">💰 Pricing</h3>
            <div className="info-rows">
              <div className="info-row">
                <span className="info-label">Quantity:</span>
                <span className="info-value">{quantity} {product.unit || 'units'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Unit Price:</span>
                <span className="info-value">{formatCurrency(unitPrice)}</span>
              </div>
              <div className="info-row highlight">
                <span className="info-label">Total Price:</span>
                <span className="info-value total">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Product Option */}
        {product.selectedOptionId && product.selectedProductName && (
          <div className="details-section full-width">
            <h3 className="section-title">🎯 Selected Option</h3>
            <div className="selected-option-display">
              <span className="option-name">{product.selectedProductName}</span>
            </div>
          </div>
        )}

        {/* Product Options */}
        {product.productOptions && product.productOptions.length > 0 && (
          <div className="details-section full-width">
            <h3 className="section-title">🛍️ Available Options ({product.productOptions.length})</h3>
            <div className="options-list">
              {product.productOptions.map((option) => (
                <div
                  key={option.id}
                  className={`option-card ${option.id === product.selectedOptionId ? 'selected' : ''}`}
                >
                  <div className="option-header">
                    <span className="option-name">{option.name}</span>
                    {option.id === product.selectedOptionId && (
                      <span className="selected-badge">✓ Selected</span>
                    )}
                  </div>
                  {option.price && (
                    <div className="option-price">{formatCurrency(option.price)}</div>
                  )}
                  {option.description && (
                    <div className="option-description">{option.description}</div>
                  )}
                  {option.images && option.images.length > 0 && (
                    <div className="option-images">
                      {option.images.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img.url || img.data || img}
                          alt={`${option.name} - ${idx + 1}`}
                          className="option-image-thumb"
                        />
                      ))}
                      {option.images.length > 3 && (
                        <span className="more-images">+{option.images.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links Section */}
        {productLinks.length > 0 && (
          <div className="details-section full-width">
            <h3 className="section-title">🔗 Links</h3>
            <div className="links-list">
              {productLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url || link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-link-item"
                >
                  <span className="link-icon">🔗</span>
                  <span className="link-text">{link.label || link.url || link}</span>
                  <span className="link-external">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {product.notes && (
          <div className="details-section full-width">
            <h3 className="section-title">📝 Notes</h3>
            <div className="notes-content">
              {product.notes}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
