'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import ImageUpload from '@/components/ImageUpload';
import CategorySelector from '@/components/CategorySelector';
import ProductOptionsManager from '@/components/ProductOptionsManager';
import { roomsAPI, categoriesAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import AdminOnly from '@/components/auth/AdminOnly';

export default function RoomEditorPage() {
    const params = useParams();
    const router = useRouter();
    const roomSlug = params.slug;

    const [roomData, setRoomData] = useState(null);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [roomBudget, setRoomBudget] = useState(0);
    const [roomImages, setRoomImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('original');
    const [sortDirection, setSortDirection] = useState('asc');
    const [editingOptionsIndex, setEditingOptionsIndex] = useState(null);

    const loadRoom = async () => {
        try {
            setLoading(true);
            const [data, categoriesData] = await Promise.all([
                roomsAPI.getOne(roomSlug),
                categoriesAPI.getAll()
            ]);

            if (data.success && data.roomData) {
                setRoomData(data.roomData);

                // Merge room items and shared items
                const roomItems = data.roomData.items || [];
                const sharedItems = (data.roomData.sharedItems || []).map(item => ({
                    ...item,
                    _isShared: true, // Mark as shared for UI display
                    _readOnly: true  // Mark as read-only
                }));

                setItems([...roomItems, ...sharedItems]);
                setRoomBudget(data.roomData.budget || 0);
                setRoomImages(data.roomData.images || []);
            }

            // Build categories list from API
            const categoriesList = [];
            if (Array.isArray(categoriesData)) {
                categoriesData.forEach(cat => {
                    if (cat.category && !categoriesList.includes(cat.category)) {
                        categoriesList.push(cat.category);
                    }
                });
            }
            // Add common categories if not in DB
            const commonCategories = ['Services', 'Labor', 'Materials', 'Products', 'Transport', 'Permits', 'Professional Fees', 'Other'];
            commonCategories.forEach(cat => {
                if (!categoriesList.includes(cat)) {
                    categoriesList.push(cat);
                }
            });
            setCategories(categoriesList);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roomSlug) {
            loadRoom();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomSlug]);

    // Calculate subtotal: use actual_price if set, otherwise budget_price
    const calculateSubtotal = (item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const actualPrice = parseFloat(item.actual_price) || 0;
        const budgetPrice = parseFloat(item.budget_price) || 0;

        // Use actual price if it's set and non-zero, otherwise use budget price
        const price = actualPrice > 0 ? actualPrice : budgetPrice;
        return quantity * price;
    };

    const handleItemChange = (originalIndex, field, value) => {
        const updatedItems = [...items];
        updatedItems[originalIndex][field] = value;
        setItems(updatedItems);
    };

    const addNewItem = () => {
        const newItem = {
            description: '',
            category: 'Other',
            quantity: 1,
            unit: 'unit',
            budget_price: 0,
            actual_price: 0,
            status: 'Pending',
            favorite: false,
            imageUrl: '',
            links: [],
            notes: '',
        };
        setItems([...items, newItem]);
    };

    const deleteItem = (originalIndex) => {
        if (confirm('Delete this item?')) {
            const updatedItems = items.filter((_, i) => i !== originalIndex);
            setItems(updatedItems);
        }
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, default to ascending
            setSortBy(field);
            setSortDirection('asc');
        }
    };

    const getSortedItems = () => {
        // Add original index to each item for editing
        const itemsWithIndex = items.map((item, index) => ({
            ...item,
            originalIndex: index,
        }));

        if (sortBy === 'original') {
            return itemsWithIndex;
        }

        const sorted = [...itemsWithIndex].sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'favorite':
                    // Favorites first (true > false), then by description
                    const aFav = a.favorite || a.isFavorite || false;
                    const bFav = b.favorite || b.isFavorite || false;
                    if (aFav !== bFav) {
                        return sortDirection === 'asc'
                            ? aFav
                                ? -1
                                : 1
                            : aFav
                            ? 1
                            : -1;
                    }
                    // If same favorite status, sort by description
                    aVal = (a.description || '').toLowerCase();
                    bVal = (b.description || '').toLowerCase();
                    break;
                case 'category':
                    aVal = (a.category || '').toLowerCase();
                    bVal = (b.category || '').toLowerCase();
                    break;
                case 'budget_price':
                    aVal = a.budget_price || 0;
                    bVal = b.budget_price || 0;
                    break;
                case 'actual_price':
                    aVal = a.actual_price || 0;
                    bVal = b.actual_price || 0;
                    break;
                case 'subtotal':
                    aVal = calculateSubtotal(a);
                    bVal = calculateSubtotal(b);
                    break;
                case 'status':
                    aVal = (a.status || '').toLowerCase();
                    bVal = (b.status || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    const sortedItems = getSortedItems();

    const saveRoom = async () => {
        try {
            setSaving(true);

            // Filter out shared items - they're managed from expenses page
            const roomOnlyItems = items.filter(item => !item._isShared);

            // Items already use budget_price and actual_price - no mapping needed
            const updatedRoomData = {
                ...roomData,
                budget: roomBudget,
                images: roomImages, // Include room images
                items: roomOnlyItems,
            };

            await roomsAPI.save(roomSlug, updatedRoomData);
            loadRoom(); // Reload to get updated totals
        } catch (err) {
            alert('Error saving room: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                    <LoadingSpinner size='large' text='Loading room...' />
                </div>
            </MainLayout>
        );
    }

    if (error || !roomData) {
        return (
            <MainLayout>
                <Card>
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <h3>❌ Error Loading Room</h3>
                        <p>{error || 'Room not found'}</p>
                        <Button onClick={() => router.push('/rooms')}>
                            Back to Rooms
                        </Button>
                    </div>
                </Card>
            </MainLayout>
        );
    }

    // Calculate Total Budget: sum of all item subtotals (uses actual_price if set, else budget_price)
    const totalBudget = items.reduce(
        (sum, item) => sum + calculateSubtotal(item),
        0
    );

    // Calculate Actual Total: sum of actual prices for COMPLETED items only
    const totalActual = items
        .filter((item) => item.status === 'Completed')
        .reduce((sum, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const actualPrice = parseFloat(item.actual_price) || 0;
            const budgetPrice = parseFloat(item.budget_price) || 0;
            // Use actual_price if set and non-zero, otherwise use budget_price
            const price = actualPrice > 0 ? actualPrice : budgetPrice;
            return sum + quantity * price;
        }, 0);

    const difference = totalBudget - totalActual;

    return (
        <MainLayout>
            <div className='room-editor'>
                <header className='editor-header'>
                    <div>
                        <Button
                            variant='secondary'
                            onClick={() => router.push('/rooms')}
                            icon='←'
                        >
                            Back to Rooms
                        </Button>
                        <h1>✏️ {roomData.name}</h1>
                    </div>
                    <AdminOnly>
                        <div className='header-actions'>
                            <Button
                                variant='success'
                                onClick={saveRoom}
                                disabled={saving}
                                icon='💾'
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </AdminOnly>
                </header>

                {/* Budget Summary Cards */}
                <div className='budget-summary'>
                    <Card>
                        <div className='summary-stat'>
                            <span className='stat-label'>Room Budget</span>
                            <input
                                type='number'
                                className='budget-input'
                                value={Math.round(roomBudget)}
                                onChange={(e) =>
                                    setRoomBudget(
                                        parseInt(e.target.value) || 0
                                    )
                                }
                                min='0'
                                step='1'
                            />
                            <span className='stat-value budget'>
                                {formatCurrency(Math.round(roomBudget))}
                            </span>
                        </div>
                    </Card>
                    <Card>
                        <div className='summary-stat'>
                            <span className='stat-label'>
                                Expected Total (Items)
                            </span>
                            <span className='stat-value expected'>
                                {formatCurrency(Math.round(totalBudget))}
                            </span>
                        </div>
                    </Card>
                    <Card>
                        <div className='summary-stat'>
                            <span className='stat-label'>Actual Total</span>
                            <span className='stat-value actual'>
                                {formatCurrency(Math.round(totalActual))}
                            </span>
                        </div>
                    </Card>
                    <Card>
                        <div className='summary-stat'>
                            <span className='stat-label'>Difference</span>
                            <span
                                className='stat-value difference'
                                style={{
                                    color:
                                        difference >= 0 ? '#11998e' : '#ee0979',
                                }}
                            >
                                {formatCurrency(Math.round(difference))}
                            </span>
                        </div>
                    </Card>
                </div>

                {/* Room Gallery - Show if images exist */}
                {roomImages.length > 0 && (
                    <Card>
                        <div className='gallery-header'>
                            <h3>📸 Room Gallery ({roomImages.length} images)</h3>
                        </div>
                        <div className='gallery-grid'>
                            {roomImages.map((image, index) => (
                                <div key={image.id || index} className='gallery-item'>
                                    <img
                                        src={image.data || image.url}
                                        alt={image.name || `Room image ${index + 1}`}
                                        className='gallery-image'
                                        onClick={() => {
                                            // Create modal to view full size
                                            const modal = document.createElement('div');
                                            modal.style.cssText = `
                                                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                                background: rgba(0,0,0,0.9); display: flex; align-items: center; 
                                                justify-content: center; z-index: 9999; cursor: pointer;
                                            `;
                                            const img = document.createElement('img');
                                            img.src = image.data || image.url;
                                            img.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain;';
                                            modal.appendChild(img);
                                            modal.onclick = () => document.body.removeChild(modal);
                                            document.body.appendChild(modal);
                                        }}
                                    />
                                    <div className='gallery-item-info'>
                                        <span className='gallery-item-name'>{image.name || `Image ${index + 1}`}</span>
                                        <AdminOnly>
                                            <button
                                                className='gallery-delete-btn'
                                                onClick={() => {
                                                    if (confirm('Delete this image?')) {
                                                        setRoomImages(roomImages.filter((_, i) => i !== index));
                                                    }
                                                }}
                                                title='Delete image'
                                            >
                                                🗑️
                                            </button>
                                        </AdminOnly>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Items Table */}
                <Card>
                    <div className='table-header'>
                        <h2>Room Items</h2>
                        <AdminOnly>
                            <Button
                                variant='primary'
                                onClick={addNewItem}
                                icon='➕'
                            >
                                Add Item
                            </Button>
                        </AdminOnly>
                    </div>

                    <div className='table-wrapper'>
                        <table className='items-table'>
                            <thead>
                                <tr>
                                    <th style={{ width: '30px' }}>#</th>
                                    <th
                                        style={{
                                            width: '40px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSort('favorite')}
                                        className='sortable'
                                        title='Sort by favorites'
                                    >
                                        ⭐{' '}
                                        {sortBy === 'favorite' &&
                                            (sortDirection === 'asc'
                                                ? '↑'
                                                : '↓')}
                                    </th>
                                    <th style={{ width: '200px' }}>
                                        Description
                                    </th>
                                    <th
                                        style={{
                                            width: '120px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSort('category')}
                                        className='sortable'
                                    >
                                        Category{' '}
                                        {sortBy === 'category' &&
                                            (sortDirection === 'asc'
                                                ? '↑'
                                                : '↓')}
                                    </th>
                                    <th style={{ width: '80px' }}>Qty</th>
                                    <th style={{ width: '80px' }}>Unit</th>
                                    <th
                                        style={{
                                            width: '100px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() =>
                                            handleSort('budget_price')
                                        }
                                        className='sortable'
                                    >
                                        Budget Price{' '}
                                        {sortBy === 'budget_price' &&
                                            (sortDirection === 'asc'
                                                ? '↑'
                                                : '↓')}
                                    </th>
                                    <th
                                        style={{
                                            width: '100px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() =>
                                            handleSort('actual_price')
                                        }
                                        className='sortable'
                                    >
                                        Actual Price{' '}
                                        {sortBy === 'actual_price' &&
                                            (sortDirection === 'asc'
                                                ? '↑'
                                                : '↓')}
                                    </th>
                                    <th
                                        style={{
                                            width: '100px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSort('subtotal')}
                                        className='sortable'
                                    >
                                        Subtotal{' '}
                                        {sortBy === 'subtotal' &&
                                            (sortDirection === 'asc'
                                                ? '↑'
                                                : '↓')}
                                    </th>
                                    <th
                                        style={{
                                            width: '100px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSort('status')}
                                        className='sortable'
                                    >
                                        Status{' '}
                                        {sortBy === 'status' &&
                                            (sortDirection === 'asc'
                                                ? '↑'
                                                : '↓')}
                                    </th>
                                    <th style={{ width: '120px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems.map((item, displayIndex) => (
                                    <tr
                                        key={item.originalIndex}
                                        className={item._isShared ? 'shared-item-row' : ''}
                                    >
                                        <td>
                                            {displayIndex + 1}
                                            {item._isShared && (
                                                <span className='shared-badge' title='Shared expense from multiple rooms'>🔗</span>
                                            )}
                                        </td>
                                        <td className='favorite-cell'>
                                            <button
                                                className={`favorite-btn ${
                                                    item.favorite
                                                        ? 'active'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'favorite',
                                                        !item.favorite
                                                    )
                                                }
                                                title='Mark as favorite'
                                            >
                                                ⭐
                                            </button>
                                        </td>
                                        <td>
                                            <input
                                                type='text'
                                                value={item.description || ''}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'description',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder='Item description'
                                                disabled={item._readOnly}
                                                title={item._isShared ? 'Shared items are managed from the Expenses page' : ''}
                                            />
                                        </td>
                                        <td>
                                            <CategorySelector
                                                category={item.category || 'Materials'}
                                                onCategoryChange={(newCategory) =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'category',
                                                        newCategory
                                                    )
                                                }
                                                categories={categories}
                                                disabled={item._readOnly}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type='number'
                                                value={item.quantity || 0}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'quantity',
                                                        parseFloat(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                min='0'
                                                step='0.01'
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type='text'
                                                value={item.unit || 'unit'}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'unit',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder='unit'
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type='number'
                                                value={parseFloat(item.budget_price || 0).toFixed(2)}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'budget_price',
                                                        parseFloat(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                min='0'
                                                step='0.01'
                                                disabled={item._readOnly}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type='number'
                                                value={parseFloat(item.actual_price || 0).toFixed(2)}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'actual_price',
                                                        parseFloat(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                min='0'
                                                step='0.01'
                                                disabled={item._readOnly}
                                            />
                                        </td>
                                        <td className='subtotal-cell'>
                                            {formatCurrency(
                                                Math.round(calculateSubtotal(item))
                                            )}
                                        </td>
                                        <td>
                                            <select
                                                value={item.status || 'Pending'}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        item.originalIndex,
                                                        'status',
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value='Planning'>
                                                    Planning
                                                </option>
                                                <option value='Pending'>
                                                    Pending
                                                </option>
                                                <option value='Ordered'>
                                                    Ordered
                                                </option>
                                                <option value='Completed'>
                                                    Completed
                                                </option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className='actions-cell'>
                                                <AdminOnly>
                                                    {!item._isShared && (
                                                        <>
                                                            <button
                                                                className='options-btn'
                                                                onClick={() =>
                                                                    setEditingOptionsIndex(
                                                                        item.originalIndex
                                                                    )
                                                                }
                                                                title='Manage product options'
                                                            >
                                                                📦
                                                            </button>
                                                            <button
                                                                className='delete-btn'
                                                                onClick={() =>
                                                                    deleteItem(
                                                                        item.originalIndex
                                                                    )
                                                                }
                                                                title='Delete item'
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </AdminOnly>
                                                {item._isShared && (
                                                    <span
                                                        className='shared-info-icon'
                                                        title='Shared items are managed from the Expenses page'
                                                    >
                                                        ℹ️
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Room Image Upload */}
                <AdminOnly>
                    <Card>
                        <div className='upload-section'>
                            <h3>📷 Room Images</h3>
                            <p>Upload images for this room (progress photos, inspiration, etc.)</p>
                            <ImageUpload
                                images={roomImages}
                                onImagesChange={setRoomImages}
                                maxImages={10}
                                maxSizeMB={5}
                            />
                        </div>
                    </Card>
                </AdminOnly>

                {/* Product Options Modal */}
                {editingOptionsIndex !== null && (
                    <div className='modal-overlay' onClick={() => setEditingOptionsIndex(null)}>
                        <div className='modal-content' onClick={(e) => e.stopPropagation()}>
                            <div className='modal-header'>
                                <h2>
                                    📦 Product Options: {items[editingOptionsIndex]?.description || 'Item'}
                                </h2>
                                <button
                                    className='modal-close'
                                    onClick={() => setEditingOptionsIndex(null)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className='modal-body'>
                                <ProductOptionsManager
                                    item={items[editingOptionsIndex]}
                                    onChange={(updatedItem) => {
                                        const updatedItems = [...items];
                                        updatedItems[editingOptionsIndex] = updatedItem;
                                        setItems(updatedItems);
                                    }}
                                />
                            </div>
                            <div className='modal-footer'>
                                <Button
                                    variant='primary'
                                    onClick={() => setEditingOptionsIndex(null)}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className='bottom-actions'>
                    <Button
                        variant='secondary'
                        onClick={() => router.push('/rooms')}
                    >
                        Cancel
                    </Button>
                    <AdminOnly>
                        <Button
                            variant='success'
                            onClick={saveRoom}
                            disabled={saving}
                            icon='💾'
                            size='large'
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </AdminOnly>
                </div>
            </div>

            <style jsx>{`
                .room-editor {
                    max-width: 1600px;
                    margin: 0 auto;
                }

                .editor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .editor-header h1 {
                    font-size: 2rem;
                    margin: 10px 0 0;
                    background: linear-gradient(
                        135deg,
                        #667eea 0%,
                        #764ba2 100%
                    );
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .header-actions {
                    display: flex;
                    gap: 12px;
                }

                .budget-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .summary-stat {
                    text-align: center;
                    padding: 10px;
                }

                .stat-label {
                    display: block;
                    font-size: 0.9rem;
                    color: #666;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .stat-value {
                    display: block;
                    font-size: 1.8rem;
                    font-weight: bold;
                }

                .stat-value.budget {
                    color: #667eea;
                }

                .stat-value.actual {
                    color: #ee0979;
                }

                .stat-value.expected {
                    color: #764ba2;
                }

                .stat-value.items {
                    color: #764ba2;
                }

                .budget-input {
                    width: 100%;
                    max-width: 200px;
                    padding: 8px 12px;
                    margin: 10px auto;
                    border: 2px solid #667eea;
                    border-radius: 6px;
                    font-size: 1.1rem;
                    text-align: center;
                    font-weight: 600;
                    box-sizing: border-box;
                }

                .budget-input:focus {
                    outline: none;
                    border-color: #764ba2;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
                }

                .table-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .table-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: #333;
                }

                .table-wrapper {
                    overflow-x: auto;
                    border-radius: 8px;
                }

                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 1200px;
                }

                .items-table thead {
                    background: linear-gradient(
                        135deg,
                        #667eea 0%,
                        #764ba2 100%
                    );
                    color: white;
                }

                .items-table th {
                    padding: 12px 8px;
                    text-align: left;
                    font-size: 0.9rem;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .items-table th.sortable {
                    user-select: none;
                    transition: background 0.2s;
                }

                .items-table th.sortable:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .items-table th.sortable:active {
                    background: rgba(255, 255, 255, 0.2);
                }

                .items-table td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                }

                .items-table tbody tr:hover {
                    background: #f8f9fa;
                }

                .items-table input,
                .items-table select {
                    width: 100%;
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    box-sizing: border-box;
                    background: white;
                    color: #333;
                }

                .items-table input[type='number'] {
                    text-align: right;
                }

                .items-table input:focus,
                .items-table select:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
                }

                .subtotal-cell {
                    font-weight: bold;
                    color: #667eea;
                    text-align: right;
                }

                .delete-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: 4px;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }

                .delete-btn:hover {
                    opacity: 1;
                }

                .favorite-cell {
                    text-align: center;
                    padding: 4px;
                }

                .favorite-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.3rem;
                    padding: 4px;
                    opacity: 0.3;
                    transition: all 0.2s;
                    filter: grayscale(100%);
                }

                .favorite-btn:hover {
                    opacity: 0.7;
                    filter: grayscale(0%);
                    transform: scale(1.2);
                }

                .favorite-btn.active {
                    opacity: 1;
                    filter: grayscale(0%);
                }

                .bottom-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #f0f0f0;
                }

                .gallery-header {
                    padding: 20px 20px 10px;
                    border-bottom: 1px solid #f0f0f0;
                }

                .gallery-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    color: #333;
                }

                .gallery-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 16px;
                    padding: 20px;
                }

                .gallery-item {
                    position: relative;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    transition: transform 0.2s ease;
                }

                .gallery-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                }

                .gallery-image {
                    width: 100%;
                    height: 150px;
                    object-fit: cover;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .gallery-image:hover {
                    opacity: 0.9;
                }

                .gallery-item-info {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
                    padding: 20px 12px 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .gallery-item-name {
                    color: white;
                    font-size: 0.85rem;
                    font-weight: 500;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                    max-width: 70%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .gallery-delete-btn {
                    background: rgba(255, 255, 255, 0.9);
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .gallery-delete-btn:hover {
                    background: #ff4757;
                    color: white;
                    transform: scale(1.1);
                }

                .upload-section {
                    padding: 20px;
                }

                .upload-section h3 {
                    margin: 0 0 8px 0;
                    font-size: 1.2rem;
                    color: #333;
                }

                .upload-section p {
                    margin: 0 0 20px 0;
                    color: #666;
                    font-size: 0.95rem;
                }

                /* Shared Items Styling */
                .shared-item-row {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
                }

                .shared-item-row:hover {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
                }

                .shared-badge {
                    display: inline-block;
                    margin-left: 6px;
                    font-size: 0.9rem;
                    opacity: 0.7;
                }

                .shared-info-icon {
                    font-size: 1.2rem;
                    opacity: 0.6;
                    cursor: help;
                }

                .shared-item-row input:disabled,
                .shared-item-row select:disabled {
                    background: #f5f5f5;
                    color: #666;
                    cursor: not-allowed;
                    opacity: 0.8;
                }

                /* Actions Cell */
                .actions-cell {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    justify-content: center;
                }

                .options-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: 4px;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }

                .options-btn:hover {
                    opacity: 1;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .modal-content {
                    background: white;
                    border-radius: 12px;
                    max-width: 900px;
                    width: 100%;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: #333;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.8rem;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s;
                }

                .modal-close:hover {
                    background: #f3f4f6;
                    color: #333;
                }

                .modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 20px 24px;
                    border-top: 1px solid #e5e7eb;
                }

                @media (max-width: 768px) {
                    .editor-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .budget-summary {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .table-wrapper {
                        border-radius: 0;
                        margin: 0 -20px;
                    }

                    .gallery-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 12px;
                    }

                    .gallery-image {
                        height: 120px;
                    }
                }
            `}</style>
        </MainLayout>
    );
}
