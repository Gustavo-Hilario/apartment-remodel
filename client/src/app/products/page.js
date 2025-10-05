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
            <div className="products-grid">
              {products.length === 0 ? (
                <Card>
                  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem', margin: '0 0 20px' }}>🛍️</p>
                    <h3>No Products Yet</h3>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                      Start adding products to track your renovation budget
                    </p>
                    <Button icon="➕" onClick={() => setShowModal(true)}>
                      Add Your First Product
                    </Button>
                  </div>
                </Card>
              ) : (
                products.map((product) => (
                  <ProductCard
                    key={product.uniqueId || product._id || `${product.room}-${product.originalIndex}`}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center', color: '#666' }}>
              <p>Showing {products.length} product{products.length !== 1 ? 's' : ''}</p>
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

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        @media (max-width: 768px) {
          .page-header h1 {
            font-size: 1.5rem;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </MainLayout>
  );
}
