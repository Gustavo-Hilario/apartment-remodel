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
    save: (slug, roomData) =>
        fetchAPI(`/save-room/${slug}`, {
            method: 'POST',
            body: JSON.stringify({ roomData }),
        }),
};

/**
 * Products API
 * Products are items within rooms with category='Products'
 */
export const productsAPI = {
    // Get all products across all rooms
    getAll: async () => {
        const result = await roomsAPI.getAll();
        if (!result.success) throw new Error('Failed to load products');

        const products = [];
        result.rooms.forEach((room) => {
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
