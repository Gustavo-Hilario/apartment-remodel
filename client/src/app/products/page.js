/**
 * Products Page
 * 
 * View and manage all products
 */

'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import ProductCard from '@/components/products/ProductCard';
import ProductEditModal from '@/components/ProductEditModal';
import { productsAPI, roomsAPI } from '@/lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('favorites'); // Default: favorites first
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load both products and rooms data
      const [productsData, roomsData] = await Promise.all([
        productsAPI.getAll(),
        roomsAPI.getAll()
      ]);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
      setProducts([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleQuickSave = async (product) => {
    try {
      // Optimistically update the UI first
      setProducts(prevProducts => 
        prevProducts.map(p => {
          // Match by unique identifier
          const pId = p.uniqueId || p._id || `${p.room}-${p.originalIndex}`;
          const productId = product.uniqueId || product._id || `${product.room}-${product.originalIndex}`;
          
          return pId === productId ? product : p;
        })
      );
      
      // Map product fields to match API expectations
      const saveData = {
        ...product,
        budget_price: product.budgetRate || product.budget_price || 0,
        actual_price: product.actualRate || product.actual_price || 0,
        subtotal: (product.budgetRate || product.budget_price || 0) * (product.quantity || 0)
      };
      
      // Save to backend silently
      await productsAPI.save(saveData, product);
    } catch (err) {
      console.error('Error saving product:', err);
      // Revert on error by reloading
      await loadData();
      alert('Failed to save product. Please try again.');
    }
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setShowModal(true);
  };

  const handleSave = async (productData) => {
    await productsAPI.save(productData, selectedProduct);
    // Refresh the products list
    await loadData();
  };

  const handleDelete = async (product) => {
    if (confirm(`Delete ${product.description}?`)) {
      try {
        await productsAPI.delete(product);
        // Refresh the products list
        await loadData();
      } catch (err) {
        console.error('Error deleting product:', err);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
  };

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        (p.description || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query) ||
        (p.room || '').toLowerCase().includes(query)
      );
    }

    // Filter by room
    if (selectedRoom !== 'all') {
      filtered = filtered.filter(p => p.room === selectedRoom);
    }

    // Filter by favorites (support both 'favorite' and 'isFavorite' fields)
    if (showFavoritesOnly) {
      filtered = filtered.filter(p => p.isFavorite === true || p.favorite === true);
    }

    // Sort products
    if (sortBy === 'favorites') {
      // Favorites first, then by room name (support both field names)
      filtered.sort((a, b) => {
        const aIsFav = a.isFavorite || a.favorite;
        const bIsFav = b.isFavorite || b.favorite;
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return (a.room || '').localeCompare(b.room || '');
      });
    } else if (sortBy === 'room') {
      filtered.sort((a, b) => (a.room || '').localeCompare(b.room || ''));
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => {
        const priceA = (a.unitPrice || a.actualRate || a.budgetRate || 0) * (a.quantity || 0);
        const priceB = (b.unitPrice || b.actualRate || b.budgetRate || 0) * (b.quantity || 0);
        return priceB - priceA; // Descending
      });
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.description || '').localeCompare(b.description || ''));
    }

    return filtered;
  };

  const filteredProducts = getFilteredAndSortedProducts();
  const favoriteCount = products.filter(p => p.isFavorite === true || p.favorite === true).length;

  return (
    <MainLayout>
      <div className="products-page">
        <header className="page-header">
          <h1>🛍️ Products</h1>
          <Button icon="➕" onClick={handleAddNew}>
            Add Product
          </Button>
        </header>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <LoadingSpinner size="large" text="Loading products..." />
          </div>
        )}

        {error && (
          <Card>
            <div style={{ padding: '20px', textAlign: 'center', color: '#ee0979' }}>
              <h3>❌ Error Loading Products</h3>
              <p>{error}</p>
              <Button onClick={loadData}>Try Again</Button>
            </div>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* Search Bar */}
            <div className="search-section">
              <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search products by name, category, or room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filters and Stats */}
            <div className="filters-section">
              <Card>
                <div className="filters-content">
                  {/* Room Filter */}
                  <div className="filter-group">
                    <label className="filter-label">Room:</label>
                    <select 
                      value={selectedRoom} 
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Rooms ({products.length})</option>
                      {rooms.map(room => {
                        const count = products.filter(p => p.room === room.slug).length;
                        return (
                          <option key={room.slug} value={room.slug}>
                            {room.name} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Favorites Toggle */}
                  <div className="filter-group">
                    <label className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={showFavoritesOnly}
                        onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                      />
                      <span>⭐ Favorites Only ({favoriteCount})</span>
                    </label>
                  </div>

                  {/* Sort By */}
                  <div className="filter-group">
                    <label className="filter-label">Sort by:</label>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="filter-select"
                    >
                      <option value="favorites">⭐ Favorites First</option>
                      <option value="room">Room Name</option>
                      <option value="price">Price (High to Low)</option>
                      <option value="name">Product Name</option>
                    </select>
                  </div>

                  {/* Results Count */}
                  <div className="filter-group results-count">
                    <span className="count-badge">
                      {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="products-grid">
              {filteredProducts.length === 0 ? (
                <Card>
                  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem', margin: '0 0 20px' }}>
                      {products.length === 0 ? '🛍️' : '🔍'}
                    </p>
                    <h3>{products.length === 0 ? 'No Products Yet' : 'No Products Found'}</h3>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                      {products.length === 0 
                        ? 'Start adding products to track your renovation budget'
                        : 'Try adjusting your filters to see more products'}
                    </p>
                    {products.length === 0 ? (
                      <Button icon="➕" onClick={() => setShowModal(true)}>
                        Add Your First Product
                      </Button>
                    ) : (
                      <Button onClick={() => { 
                        setSelectedRoom('all'); 
                        setShowFavoritesOnly(false); 
                        setSearchQuery('');
                      }}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.uniqueId || product._id || `${product.room}-${product.originalIndex}`}
                    product={product}
                    onEdit={handleEdit}
                    onQuickSave={handleQuickSave}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </>
        )}

        <ProductEditModal
          isOpen={showModal}
          onClose={handleCloseModal}
          product={selectedProduct}
          onSave={handleSave}
          availableRooms={rooms}
        />
      </div>

      <style jsx>{`
        .products-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-header h1 {
          font-size: 2rem;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .search-section {
          margin-bottom: 20px;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #e5e5e5;
          border-radius: 12px;
          padding: 12px 16px;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .search-wrapper:focus-within {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        .search-icon {
          font-size: 1.2rem;
          margin-right: 12px;
          color: #666;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 15px;
          color: #333;
          background: transparent;
        }

        .search-input::placeholder {
          color: #999;
        }

        .search-clear {
          background: #f0f0f0;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          transition: all 0.2s;
          margin-left: 8px;
        }

        .search-clear:hover {
          background: #667eea;
          color: white;
        }

        .filters-section {
          margin-bottom: 24px;
        }

        .filters-content {
          display: flex;
          gap: 20px;
          align-items: center;
          flex-wrap: wrap;
          padding: 8px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #333;
          white-space: nowrap;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 180px;
        }

        .filter-select:hover {
          border-color: #667eea;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .filter-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background 0.2s;
          user-select: none;
        }

        .filter-checkbox:hover {
          background: rgba(102, 126, 234, 0.05);
        }

        .filter-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #667eea;
        }

        .filter-checkbox span {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .results-count {
          margin-left: auto;
        }

        .count-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        @media (max-width: 768px) {
          .page-header h1 {
            font-size: 1.5rem;
          }

          .filters-content {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .filter-group {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
          }

          .filter-select {
            min-width: 100%;
          }

          .results-count {
            margin-left: 0;
          }

          .count-badge {
            display: block;
            text-align: center;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </MainLayout>
  );
}
