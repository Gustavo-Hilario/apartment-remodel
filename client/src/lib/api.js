/**
 * API Client for Apartment Remodel App
 *
 * This connects to the existing Express/Mongoose backend
 * running on http://localhost:8000
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(
                `API Error: ${response.status} ${response.statusText}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error(`API call failed: ${endpoint}`, error);
        throw error;
    }
}

/**
 * Rooms API
 */
export const roomsAPI = {
    // Get all rooms overview
    getAll: async () => {
        const response = await fetchAPI('/rooms');
        // The API returns { success: true, rooms: [...] }
        return response.rooms || response;
    },

    // Get specific room data
    getOne: (slug) => fetchAPI(`/load-room/${slug}`),

    // Save room data
    save: async (slug, roomData) => {
        console.log(
            '🚀 Sending save request to server:',
            `/save-room/${slug}`,
            roomData
        );
        try {
            const result = await fetchAPI(`/save-room/${slug}`, {
                method: 'POST',
                body: JSON.stringify({ roomData }),
            });
            console.log('✅ Server save response:', result);
            return result;
        } catch (error) {
            console.error('❌ Server save error:', error);
            throw error;
        }
    },
};

/**
 * Products API
 * Products are items within rooms with category='Products'
 */
export const productsAPI = {
    // Get all products across all rooms
    getAll: async () => {
        const rooms = await roomsAPI.getAll();

        if (!rooms || !Array.isArray(rooms)) {
            throw new Error('Failed to load products');
        }

        const products = [];
        rooms.forEach((room) => {
            room.items?.forEach((item, index) => {
                if (item.category === 'Products') {
                    products.push({
                        ...item,
                        room: room.slug,
                        roomDisplayName: room.name,
                        originalIndex: index,
                        uniqueId: `${room.slug}-${index}`,
                    });
                }
            });
        });

        return products;
    },

    // Save/update a product
    save: async (productData, originalProduct = null) => {
        // Check if the room has changed
        const roomChanged =
            originalProduct && originalProduct.room !== productData.room;

        if (roomChanged) {
            // ROOM CHANGE: Remove from old room and add to new room

            // 1. Remove from old room
            const oldRoomResponse = await roomsAPI.getOne(originalProduct.room);
            const oldRoomData = oldRoomResponse.roomData;

            if (!oldRoomData || !oldRoomData.items) {
                throw new Error('Failed to load old room data');
            }

            const oldRoomItems = oldRoomData.items.filter(
                (_, index) => index !== originalProduct.originalIndex
            );
            await roomsAPI.save(originalProduct.room, {
                ...oldRoomData,
                items: oldRoomItems,
            });

            // 2. Add to new room
            const newRoomResponse = await roomsAPI.getOne(productData.room);
            const newRoomData = newRoomResponse.roomData;

            if (!newRoomData || !newRoomData.items) {
                throw new Error('Failed to load new room data');
            }

            const newRoomItems = [
                ...newRoomData.items,
                {
                    description: productData.description,
                    category: productData.category,
                    quantity: productData.quantity,
                    unit: productData.unit,
                    budget_price: productData.budget_price,
                    actual_price: productData.actual_price,
                    status: productData.status,
                    favorite: productData.favorite,
                    notes: productData.notes || '',
                    imageUrl:
                        productData.images && productData.images.length > 0
                            ? ''
                            : productData.imageUrl || '',
                    showImage: false,
                    links: productData.links || [],
                    images: productData.images || [],
                },
            ];

            return await roomsAPI.save(productData.room, {
                ...newRoomData,
                items: newRoomItems,
            });
        }

        // SAME ROOM: Update in place
        // Load the target room data
        const response = await roomsAPI.getOne(productData.room);
        const roomData = response.roomData;

        if (!roomData || !roomData.items) {
            throw new Error('Failed to load room data');
        }

        let updatedItems = [...roomData.items];

        if (originalProduct) {
            // Update existing product
            const itemIndex = originalProduct.originalIndex;
            if (itemIndex >= 0 && itemIndex < updatedItems.length) {
                updatedItems[itemIndex] = {
                    ...updatedItems[itemIndex],
                    description: productData.description,
                    category: productData.category,
                    quantity: productData.quantity,
                    unit: productData.unit,
                    budget_price: productData.budget_price,
                    actual_price: productData.actual_price,
                    status: productData.status,
                    favorite: productData.favorite,
                    notes: productData.notes || '',
                    // Clear legacy imageUrl if we have images array
                    imageUrl:
                        productData.images && productData.images.length > 0
                            ? ''
                            : productData.imageUrl || '',
                    links: productData.links || [],
                    images: productData.images || [],
                };
            } else {
                throw new Error('Product not found in room');
            }
        } else {
            // Add new product
            updatedItems.push({
                description: productData.description,
                category: productData.category,
                quantity: productData.quantity,
                unit: productData.unit,
                budget_price: productData.budget_price,
                actual_price: productData.actual_price,
                status: productData.status,
                favorite: productData.favorite,
                notes: productData.notes || '',
                // Clear legacy imageUrl if we have images array
                imageUrl:
                    productData.images && productData.images.length > 0
                        ? ''
                        : productData.imageUrl || '',
                showImage: false,
                links: productData.links || [],
                images: productData.images || [],
            });
        }

        // Save the updated room data
        const updatedRoomData = {
            ...roomData,
            items: updatedItems,
        };

        console.log('🔄 About to save room data to server:', {
            room: productData.room,
            itemsCount: updatedItems.length,
            updatedProduct: updatedItems.find(
                (item) => item.description === productData.description
            ),
        });

        return await roomsAPI.save(productData.room, updatedRoomData);
    },

    // Delete a product
    delete: async (product) => {
        // Load the room data
        const response = await roomsAPI.getOne(product.room);
        const roomData = response.roomData;

        if (!roomData || !roomData.items) {
            throw new Error('Failed to load room data');
        }

        // Remove the item at the specified index
        const updatedItems = roomData.items.filter(
            (_, index) => index !== product.originalIndex
        );

        // Save the updated room data
        const updatedRoomData = {
            ...roomData,
            items: updatedItems,
        };

        return await roomsAPI.save(product.room, updatedRoomData);
    },
};

/**
 * Expenses API
 */
export const expensesAPI = {
    // Get all expenses
    getAll: () => fetchAPI('/load-expenses'),

    // Get expenses summary
    getSummary: () => fetchAPI('/expenses-summary'),

    // Save expenses
    save: (expenses) =>
        fetchAPI('/save-expenses', {
            method: 'POST',
            body: JSON.stringify({ expenses }),
        }),
};

/**
 * Totals API
 */
export const totalsAPI = {
    get: () => fetchAPI('/totals'),
};

/**
 * Categories API
 */
export const categoriesAPI = {
    getAll: async () => {
        const result = await fetchAPI('/get-all-categories');
        // API now returns array directly
        return Array.isArray(result) ? result : [];
    },
};
