'use client';

import { useState, useEffect, useRef } from 'react';

export default function CategorySelector({
  category,
  onCategoryChange,
  categories = [],
  disabled = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter categories based on search
  const filteredCategories = searchTerm
    ? categories.filter(cat =>
        cat.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : categories;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      setShowDropdown(true);
    }
  }, [isEditing]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEditing(false);
        setShowDropdown(false);
        setSearchTerm('');
        setHighlightedIndex(0);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  const handleCategorySelect = (newCategory) => {
    onCategoryChange(newCategory);
    setIsEditing(false);
    setSearchTerm('');
    setShowDropdown(false);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = filteredCategories.length > 0 ? filteredCategories.length - 1 : 0;
      const actualMax = filteredCategories.length === 0 && searchTerm ? 0 : maxIndex;
      setHighlightedIndex(prev => prev < actualMax ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCategories.length > 0) {
        handleCategorySelect(filteredCategories[highlightedIndex]);
      } else if (searchTerm.trim()) {
        // Create new category
        handleCategorySelect(searchTerm.trim());
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setSearchTerm('');
      setShowDropdown(false);
      setHighlightedIndex(0);
    }
  };

  if (disabled) {
    return (
      <input
        type="text"
        value={category || ''}
        disabled
        className="category-input disabled"
      />
    );
  }

  if (isEditing) {
    return (
      <div className="category-selector-wrapper" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search or type category..."
          className="category-input editing"
        />
        {showDropdown && filteredCategories.length > 0 && (
          <div className="category-dropdown">
            {filteredCategories.map((cat, index) => (
              <div
                key={cat}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleCategorySelect(cat)}
                className={`category-option ${
                  highlightedIndex === index ? 'highlighted' : ''
                } ${cat === category ? 'current' : ''}`}
              >
                {cat}
              </div>
            ))}
          </div>
        )}
        {showDropdown && filteredCategories.length === 0 && searchTerm && (
          <div className="category-dropdown">
            <div
              onClick={() => handleCategorySelect(searchTerm.trim())}
              className={`category-option create-new ${
                highlightedIndex === 0 ? 'highlighted' : ''
              }`}
            >
              <span className="create-label">+ Create:</span>
              <span className="create-value">{searchTerm}</span>
            </div>
          </div>
        )}

        <style jsx>{`
          .category-selector-wrapper {
            position: relative;
            width: 100%;
          }

          .category-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            background: white;
            color: #000;
          }

          .category-input.editing {
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
          }

          .category-input.disabled {
            background: #f5f5f5;
            color: #666;
            cursor: not-allowed;
          }

          .category-input:focus {
            outline: none;
          }

          .category-dropdown {
            position: absolute;
            z-index: 1000;
            width: 100%;
            margin-top: 2px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-height: 200px;
            overflow-y: auto;
          }

          .category-option {
            padding: 8px 12px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.15s;
          }

          .category-option:hover,
          .category-option.highlighted {
            background: #f0f0ff;
          }

          .category-option.current {
            font-weight: 600;
            color: #667eea;
          }

          .category-option.create-new {
            border-top: 1px solid #e5e5e5;
          }

          .create-label {
            color: #667eea;
            font-weight: 500;
          }

          .create-value {
            margin-left: 6px;
            font-weight: 600;
          }

          .category-dropdown::-webkit-scrollbar {
            width: 6px;
          }

          .category-dropdown::-webkit-scrollbar-track {
            background: #f1f1f1;
          }

          .category-dropdown::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 3px;
          }

          .category-dropdown::-webkit-scrollbar-thumb:hover {
            background: #999;
          }
        `}</style>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="category-display"
      disabled={disabled}
    >
      {category || 'Select...'}

      <style jsx>{`
        .category-display {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background: white;
          color: #000;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-display:hover {
          border-color: #667eea;
          background: #f8f9ff;
        }

        .category-display:disabled {
          background: #f5f5f5;
          color: #666;
          cursor: not-allowed;
        }
      `}</style>
    </button>
  );
}
