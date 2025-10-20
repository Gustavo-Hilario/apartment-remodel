/**
 * Authentication & Authorization Middleware
 *
 * Verifies that requests have a valid user session
 * and checks role-based permissions
 */

const User = require('../db/models/User');

/**
 * Verify that the request has a valid user ID
 * This middleware extracts user info from the request header
 *
 * Usage: app.post('/api/rooms', requireAuth, async (req, res) => { ... })
 */
async function requireAuth(req, res, next) {
    try {
        // Get user ID from request header (sent by NextAuth frontend)
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please log in to perform this action',
            });
        }

        // Fetch user from database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({
                error: 'Invalid authentication',
                message: 'User not found',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                error: 'Account deactivated',
                message: 'Your account has been deactivated',
            });
        }

        // Attach user to request object for use in route handlers
        req.user = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            message: 'Failed to verify authentication',
        });
    }
}

/**
 * Verify that the authenticated user is an admin
 * Must be used AFTER requireAuth middleware
 *
 * Usage: app.delete('/api/rooms/:id', requireAuth, requireAdmin, async (req, res) => { ... })
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please log in to perform this action',
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required',
            message: 'You do not have permission to perform this action',
        });
    }

    next();
}

/**
 * Optional auth - allows both authenticated and unauthenticated requests
 * If authenticated, attaches user to req.user
 *
 * Usage: app.get('/api/rooms', optionalAuth, async (req, res) => { ... })
 */
async function optionalAuth(req, res, next) {
    try {
        const userId = req.headers['x-user-id'];

        if (userId) {
            const user = await User.findById(userId);

            if (user && user.isActive) {
                req.user = {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            }
        }

        next();
    } catch (error) {
        // Don't fail the request, just proceed without user
        console.error('Optional auth error:', error);
        next();
    }
}

module.exports = {
    requireAuth,
    requireAdmin,
    optionalAuth,
};
