/**
 * Products Page
 * 
 * View and manage all products
 */

'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner, Modal } from '@/components/ui';
import ProductCard from '@/components/products/ProductCard';
import { productsAPI } from '@/lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsAPI.getAll();
      // Ensure products is always an array
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleDelete = (product) => {
    if (confirm(`Delete ${product.description}?`)) {
      alert('Delete functionality coming soon!');
    }
  };

  return (
    <MainLayout>
      <div className="products-page">
        <header className="page-header">
          <h1>🛍️ Products</h1>
          <Button icon="➕" onClick={() => setShowModal(true)}>
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
              <Button onClick={loadProducts}>Try Again</Button>
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

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={selectedProduct ? 'Edit Product' : 'Add Product'}
          size="large"
        >
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Product form coming soon!</p>
            <p style={{ color: '#666' }}>
              {selectedProduct ? `Editing: ${selectedProduct.description}` : 'Adding new product'}
            </p>
          </div>
        </Modal>
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
