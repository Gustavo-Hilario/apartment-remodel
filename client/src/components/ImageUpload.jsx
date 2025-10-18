/**
 * Image Upload Component
 *
 * Drag & drop image upload with gallery management
 * Supports paste from clipboard
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { compressImage, isImageFile, isFileTooLarge } from '@/lib/image';
import Button from './ui/Button';
import './ImageUpload.css';

export default function ImageUpload({
  images = [],
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 2
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef(null);
  const uploadAreaRef = useRef(null);

  // Add paste event listener
  useEffect(() => {
    const handlePaste = async (e) => {
      // Only handle paste if the upload area or its children are focused/hovered
      if (!uploadAreaRef.current?.contains(document.activeElement) && 
          !uploadAreaRef.current?.matches(':hover')) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      
      if (imageItems.length > 0) {
        e.preventDefault();
        const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
        if (files.length > 0) {
          setPasteHint(true);
          setTimeout(() => setPasteHint(false), 2000);
          await processFiles(files);
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [images, maxImages, maxSizeMB]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await processFiles(files);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const processFiles = async (files) => {
    setUploading(true);
    const newImages = [];

    for (const file of files) {
      if (!isImageFile(file)) {
        alert(`${file.name} is not a valid image file.`);
        continue;
      }

      if (isFileTooLarge(file, maxSizeMB)) {
        alert(`${file.name} is too large. Maximum size is ${maxSizeMB}MB.`);
        continue;
      }

      if (images.length + newImages.length >= maxImages) {
        alert(`Maximum ${maxImages} images allowed.`);
        break;
      }

      try {
        const base64 = await compressImage(file);
        newImages.push({
          id: Date.now() + Math.random(),
          name: file.name,
          data: base64,
          url: base64,
          isMainImage: images.length === 0 && newImages.length === 0, // First image is primary by default
          showImage: images.length === 0 && newImages.length === 0, // Backward compatibility
          size: file.size
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        alert(`Failed to process ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);
    }

    setUploading(false);
  };

  const removeImage = (imageId) => {
    const updatedImages = images.filter(img => img.id !== imageId);

    // If we removed the primary image, make the first remaining image primary
    if (updatedImages.length > 0 && !updatedImages.some(img => img.isMainImage || img.showImage)) {
      updatedImages[0].isMainImage = true;
      updatedImages[0].showImage = true; // Backward compatibility
    }

    onImagesChange(updatedImages);
  };

  const setPrimaryImage = (imageId) => {
    const clickedImage = images.find(img => img.id === imageId);
    const isCurrentlyMain = clickedImage?.isMainImage || clickedImage?.showImage;
    
    const updatedImages = images.map(img => ({
      ...img,
      isMainImage: isCurrentlyMain ? false : img.id === imageId,
      showImage: isCurrentlyMain ? false : img.id === imageId // Backward compatibility
    }));
    onImagesChange(updatedImages);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload">
      <div className="upload-area-container">
        <div
          ref={uploadAreaRef}
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''} ${pasteHint ? 'paste-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {uploading ? (
            <div className="upload-message">
              <div className="upload-spinner"></div>
              <p>Processing images...</p>
            </div>
          ) : (
            <div className="upload-message">
              <div className="upload-icon">📷</div>
              <p><strong>Drop images here</strong> or click to browse</p>
              <p className="upload-hint">
                Max {maxImages} images, {maxSizeMB}MB each • Or press <kbd>Ctrl+V</kbd> / <kbd>⌘+V</kbd> to paste
              </p>
              {pasteHint && (
                <p className="paste-success">✓ Image pasted!</p>
              )}
            </div>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className="image-gallery">
          <h4>Product Gallery ({images.length}/{maxImages})</h4>
          <div className="image-grid">
            {images.map((image, index) => (
              <div key={image.id} className="image-item">
                <div className="image-preview">
                  <img
                    src={image.url || image.data}
                    alt={image.name || `Image ${index + 1}`}
                  />

                  <div className="image-overlay">
                    <button
                      type="button"
                      className={`primary-btn ${(image.isMainImage || image.showImage) ? 'active' : ''}`}
                      onClick={() => setPrimaryImage(image.id)}
                      title={(image.isMainImage || image.showImage) ? 'Primary image' : 'Set as primary'}
                    >
                      ❤️
                    </button>

                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeImage(image.id)}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="image-info">
                  <p className="image-name">{image.name || `Image ${index + 1}`}</p>
                  {(image.isMainImage || image.showImage) && (
                    <span className="primary-badge">⭐ Primary</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}