/**
 * Authenticated Fetch Wrapper
 *
 * Wrapper around fetch that automatically includes user authentication
 * in request headers for backend authorization
 */

import { getSession } from 'next-auth/react';

/**
 * Make an authenticated API request
 * Automatically includes user ID in headers for backend authorization
 *
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} - Fetch response
 */
export async function authFetch(url, options = {}) {
    // Get current session
    const session = await getSession();

    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    // Add user ID to headers if authenticated
    if (session?.user?.id) {
        headers['x-user-id'] = session.user.id;
    }

    // Make request with auth headers
    return fetch(url, {
        ...options,
        headers,
    });
}

/**
 * Helper to make authenticated requests and parse JSON
 * Throws error if response is not OK
 *
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function authFetchJSON(url, options = {}) {
    const response = await authFetch(url, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Request failed');
    }

    return response.json();
}

export default authFetch;
