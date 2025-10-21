#!/usr/bin/env node

const express = require('express');
const path = require('path');
const cors = require('cors');
const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');
const Timeline = require('../db/models/Timeline');
const User = require('../db/models/User');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const app = express();
const port = process.env.PORT || 8000;

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Get user by email or username (for NextAuth)
app.post('/api/auth/user-by-email', async (req, res) => {
    try {
        const { email, identifier } = req.body;
        const lookupValue = identifier || email; // Support both old 'email' and new 'identifier'

        if (!lookupValue) {
            return res.status(400).json({ error: 'Email or username is required' });
        }

        // Try to find user by email first, then by username
        let user = await User.findOne({ email: lookupValue.toLowerCase() }).select('+password');

        if (!user) {
            user = await User.findOne({ username: lookupValue.toLowerCase() }).select('+password');
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('User found:', lookupValue, 'Has password:', !!user.password);

        // Return user as plain object to preserve password field
        const userObj = {
            _id: user._id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            password: user.password, // Include password for NextAuth verification
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.json({ success: true, user: userObj });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            error: 'Failed to fetch user',
            details: error.message,
        });
    }
});

// Update last login
app.post('/api/auth/update-last-login', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        await User.findByIdAndUpdate(userId, { lastLogin: new Date() });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating last login:', error);
        res.status(500).json({
            error: 'Failed to update last login',
            details: error.message,
        });
    }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, username } = req.body;

        // Validate inputs
        if (!email || !password || !name || !username) {
            return res.status(400).json({
                error: 'Email, password, name, and username are required',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters',
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                error: 'Username must be at least 3 characters',
            });
        }

        // Check if email or username already exists
        const existingEmail = await User.findOne({ email });
        const existingUsername = await User.findOne({ username: username.toLowerCase() });

        if (existingEmail) {
            return res.status(400).json({
                error: 'A user with this email already exists',
            });
        }

        if (existingUsername) {
            return res.status(400).json({
                error: 'A user with this username already exists',
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user (default role: user)
        const newUser = new User({
            email,
            username: username.toLowerCase(),
            password: hashedPassword,
            name,
            role: 'user',
            isActive: true,
        });

        await newUser.save();

        // Return user without password
        const userResponse = newUser.toJSON();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userResponse,
        });
    } catch (error) {
        console.error('Error registering user:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                error: 'A user with this email already exists',
            });
        }

        res.status(500).json({
            error: 'Failed to register user',
            details: error.message,
        });
    }
});

// Get all users (admin only)
app.get('/api/auth/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            details: error.message,
        });
    }
});

// ============================================================================
// ROOM ROUTES
// ============================================================================
// ROOM ROUTES
// ============================================================================

// Get all rooms overview
app.get('/api/rooms', async (req, res) => {
    try {
        // Fetch rooms - virtuals will automatically calculate actual_spent, progress_percent, etc.
        const rooms = await Room.find({});

        // Return rooms with all virtual fields included (toJSON is configured to include virtuals)
        res.json({ success: true, rooms });
    } catch (error) {
        console.error('Error loading rooms:', error);
        res.json({
            error: 'Failed to load rooms',
            details: error.message,
        });
    }
});

// Load specific room data
app.get('/api/load-room/:roomName', async (req, res) => {
    try {
        const { roomName } = req.params;
        const room = await Room.findOne({ slug: roomName });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Get shared items from _general room that apply to this room
        const generalRoom = await Room.findOne({ slug: '_general' });
        const sharedItems = [];
        
        if (generalRoom) {
            generalRoom.items.forEach((item) => {
                if (item.isSharedExpense && item.roomAllocations) {
                    const allocation = item.roomAllocations.find(a => a.room === roomName);
                    if (allocation) {
                        // Include this shared item with its allocation for this room
                        sharedItems.push({
                            description: item.description,
                            category: item.category,
                            quantity: item.quantity,
                            unit: item.unit,
                            budget_price: item.budget_price,
                            actual_price: allocation.amount, // Use allocated amount
                            status: item.status,
                            favorite: item.favorite || false,
                            images: item.images || [],
                            imageUrl: item.imageUrl || '',
                            showImage: item.showImage || false,
                            links: item.links || [],
                            notes: item.notes || '',
                            isSharedExpense: true,
                            sharedWith: item.roomAllocations.map(a => a.room).filter(r => r !== roomName),
                            totalAmount: item.totalAmount
                        });
                    }
                }
            });
        }

        // Transform room's own items
        const roomData = {
            name: room.name,
            budget: room.budget,
            images: room.images || [],
            items: room.items.map((item) => ({
                description: item.description,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                budget_price: item.budget_price,
                actual_price: item.actual_price,
                status: item.status,
                favorite: item.favorite || false,
                images: item.images || [],
                imageUrl: item.imageUrl || '',
                showImage: item.showImage || false,
                links: item.links || [],
                notes: item.notes || '',
                isSharedExpense: item.isSharedExpense || false,
                productOptions: item.productOptions || [],
                selectedOptionId: item.selectedOptionId || '',
                selectedProductName: item.selectedProductName || '',
            })),
            sharedItems // Add shared items separately
        };

        res.json({ success: true, roomData });
    } catch (error) {
        console.error('Error loading room data:', error);
        res.status(500).json({
            error: 'Failed to load room data',
            details: error.message,
        });
    }
});

// Save room data (requires admin)
app.post('/api/save-room/:roomName', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { roomName } = req.params;
        const { roomData } = req.body;

        // Validate room name
        const validRooms = [
            'cocina',
            'sala',
            'cuarto1',
            'cuarto2',
            'cuarto3',
            'bano1',
            'bano2',
            'bano_visita',
            'balcon',
        ];

        if (!validRooms.includes(roomName)) {
            return res.status(400).json({ error: 'Invalid room name' });
        }

        // Find and update room using Mongoose
        const room = await Room.findOne({ slug: roomName });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Update room data
        room.name = roomData.name;
        room.budget = parseFloat(roomData.budget) || 0;
        room.images = roomData.images || []; // Save room images array

        // Map through items and handle date tracking
        const today = new Date();
        room.items = roomData.items.map((item, index) => {
            const oldItem = room.items[index]; // Get old item to compare status changes
            const newStatus = item.status || 'Pending';

            // Determine dates
            let createdDate = item.createdDate || item.date || null;
            let completedDate = item.completedDate || null;

            // Set createdDate if this is a new item or doesn't have one
            if (!createdDate) {
                createdDate = today;
            }

            // Set completedDate if status changed to Completed
            if (newStatus === 'Completed' && !completedDate) {
                // Check if this is a new completion (status changed from non-Completed to Completed)
                if (!oldItem || oldItem.status !== 'Completed') {
                    completedDate = today;
                }
            }

            return {
                description: item.description,
                category: item.category,
                quantity: parseFloat(item.quantity) || 1,
                unit: item.unit || 'unit',
                budget_price: parseFloat(item.budget_price) || 0,
                actual_price: parseFloat(item.actual_price) || 0,
                status: newStatus,
                favorite: item.favorite || false,
                images: item.images || [], // Save images array
                imageUrl: item.imageUrl || '', // Keep legacy field for backward compatibility
                showImage: item.showImage || false,
                links: item.links || [],
                notes: item.notes || '',
                productOptions: item.productOptions || [],
                selectedOptionId: item.selectedOptionId || '',
                selectedProductName: item.selectedProductName || '',
                // Date fields
                createdDate,
                completedDate,
                date: completedDate || createdDate, // Legacy field for backwards compatibility
            };
        });

        // Update status based on completed items
        const completedItems = room.items.filter(
            (item) => item.status === 'Completed'
        ).length;
        room.status =
            completedItems === room.items.length && room.items.length > 0
                ? 'Completed'
                : completedItems > 0
                ? 'In Progress'
                : 'Not Started';

        // Save using Mongoose (virtuals will calculate actual_spent, progress_percent, etc.)
        await room.save();

        res.json({
            success: true,
            message: `${roomData.name} data saved successfully`,
            roomId: room._id,
        });
    } catch (error) {
        console.error('Error saving room data:', error);
        res.status(500).json({
            error: 'Failed to save room data',
            details: error.message,
        });
    }
});

// Get all unique categories across all rooms
app.get('/api/get-all-categories', async (req, res) => {
    try {
        // Aggregate to get category totals and counts
        const categories = await Room.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.category',
                    count: { $sum: 1 },
                    budgetTotal: { $sum: '$items.subtotal' },
                    actualTotal: {
                        $sum: {
                            $multiply: [
                                '$items.quantity',
                                '$items.actual_price',
                            ],
                        },
                    },
                },
            },
            { $sort: { budgetTotal: -1 } },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    count: 1,
                    total: '$budgetTotal',
                    actualTotal: '$actualTotal',
                },
            },
        ]);

        res.json(categories);
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            error: 'Failed to get categories',
            details: error.message,
        });
    }
});

// Get project totals
app.get('/api/totals', async (req, res) => {
    try {
        // Get all rooms (including _general)
        const allRooms = await Room.find({});
        
        // Separate regular rooms from _general
        const regularRooms = allRooms.filter(r => r.slug !== '_general');
        const generalRoom = allRooms.find(r => r.slug === '_general');

        // Calculate totals from regular rooms
        let totalBudget = 0;
        let totalActualSpent = 0;
        let totalItems = 0;
        let totalCompleted = 0;
        let productsCount = 0;

        regularRooms.forEach((room) => {
            totalBudget += room.budget || 0;
            totalActualSpent += room.actual_spent || 0; // Virtual field
            totalItems += room.total_items || 0; // Virtual field
            totalCompleted += room.completed_items || 0; // Virtual field

            if (room.items) {
                productsCount += room.items.filter(
                    (item) => item.category === 'Products'
                ).length;
            }
        });

        // Count expenses from _general room (completed items only)
        let expenseCount = 0;
        if (generalRoom && generalRoom.items) {
            expenseCount = generalRoom.items.filter(
                (item) => item.status === 'Completed'
            ).length;
        }

        // Format response
        const response = {
            totalBudget,
            totalExpenses: totalActualSpent,
            totalRooms: regularRooms.length, // Exclude _general from room count
            totalItems,
            totalCompleted,
            totalProducts: productsCount,
            expenseCount, // Count of completed items in _general
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting totals:', error);
        res.status(500).json({
            error: 'Failed to get totals',
            details: error.message,
        });
    }
});

// ============================================================================
// EXPENSE ROUTES
// ============================================================================

// Load all expenses
app.get('/api/load-expenses', async (req, res) => {
    try {
        // Helper function to get the best available date from an item
        const getItemDate = (item) => {
            // Priority: completedDate (when it was marked complete) > date (legacy) > createdDate > today
            if (item.completedDate) {
                return new Date(item.completedDate).toISOString().split('T')[0];
            }
            if (item.date) {
                return new Date(item.date).toISOString().split('T')[0];
            }
            if (item.createdDate) {
                return new Date(item.createdDate).toISOString().split('T')[0];
            }
            return new Date().toISOString().split('T')[0];
        };

        // Get all rooms
        const rooms = await Room.find({});
        const expenses = [];

        // Process each room and track source (roomSlug + _id)
        for (const room of rooms) {
            room.items.forEach((item) => {
                // Only show completed items or items from _general room
                if (item.status === 'Completed' || room.slug === '_general') {
                    // Calculate amount
                    const itemAmount = item.totalAmount ||
                                      (parseFloat(item.actual_price) || parseFloat(item.budget_price) || 0) *
                                      (parseFloat(item.quantity) || 1);

                    // Determine rooms array
                    let roomsList = [];
                    if (item.isSharedExpense && item.roomAllocations && item.roomAllocations.length > 0) {
                        // Multi-room shared expense
                        roomsList = item.roomAllocations.map(a => a.room);
                    } else if (item.roomAllocations && item.roomAllocations.length > 0) {
                        // Single room expense
                        roomsList = [item.roomAllocations[0].room];
                    } else if (room.slug !== '_general') {
                        // Room item (not from _general)
                        roomsList = [room.slug];
                    }
                    // else: general expense with no room allocations (rooms stays empty)

                    expenses.push({
                        // SOURCE TRACKING - CRITICAL FOR UPDATES
                        _id: item._id.toString(), // MongoDB ID as string
                        roomSlug: room.slug,       // Source room

                        // Expense data
                        description: item.description,
                        amount: itemAmount,
                        category: item.category,
                        date: getItemDate(item),
                        createdDate: item.createdDate ? new Date(item.createdDate).toISOString().split('T')[0] : null,
                        completedDate: item.completedDate ? new Date(item.completedDate).toISOString().split('T')[0] : null,
                        rooms: roomsList,
                        roomCategory: item.category,
                        status: item.status,
                        isSharedExpense: item.isSharedExpense || false,
                        roomAllocations: item.roomAllocations || [] // Include for frontend editing
                    });
                }
            });
        }

        // Sort by date (most recent first)
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log(`📤 Loaded ${expenses.length} expenses from all rooms`);

        res.json({ success: true, expenses });
    } catch (error) {
        console.error('Error loading expenses:', error);
        res.status(500).json({
            error: 'Failed to load expenses',
            details: error.message,
        });
    }
});

// Create new expense (requires admin)
// Creates a new expense in the _general room and returns it with MongoDB ID
app.post('/api/create-expense', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { description, amount, category, date, status, rooms, roomAllocations } = req.body;

        console.log('\n➕ Creating new expense in _general room...');

        // Get or create _general room
        let generalRoom = await Room.findOne({ slug: '_general' });
        if (!generalRoom) {
            generalRoom = new Room({
                name: 'General / Shared Expenses',
                slug: '_general',
                budget: 0,
                status: 'In Progress',
                items: []
            });
        }

        // Create new item in _general room
        const newItem = {
            description: description || '',
            category: category || 'Other',
            quantity: 1,
            unit: 'unit',
            budget_price: 0,
            actual_price: parseFloat(amount) || 0,
            status: status || 'Pending',
            date: date ? new Date(date) : new Date(),
            createdDate: new Date(),
            completedDate: status === 'Completed' ? new Date() : null,
            isSharedExpense: (rooms && rooms.length > 1) || false,
            totalAmount: parseFloat(amount) || 0,
            roomAllocations: roomAllocations || []
        };

        // Add to items array - Mongoose will auto-generate _id
        generalRoom.items.push(newItem);
        await generalRoom.save();

        // Get the newly created item (it's the last one)
        const createdItem = generalRoom.items[generalRoom.items.length - 1];

        console.log(`   ✅ Created expense with ID: ${createdItem._id}`);

        // Return the expense with ID and roomSlug for frontend
        res.json({
            success: true,
            expense: {
                _id: createdItem._id.toString(),
                roomSlug: '_general',
                description: createdItem.description,
                amount: createdItem.totalAmount || createdItem.actual_price,
                category: createdItem.category,
                date: createdItem.date ? new Date(createdItem.date).toISOString().split('T')[0] : null,
                createdDate: createdItem.createdDate ? new Date(createdItem.createdDate).toISOString().split('T')[0] : null,
                completedDate: createdItem.completedDate ? new Date(createdItem.completedDate).toISOString().split('T')[0] : null,
                rooms: rooms || [],
                status: createdItem.status,
                isSharedExpense: createdItem.isSharedExpense || false,
                roomAllocations: createdItem.roomAllocations || []
            }
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({
            error: 'Failed to create expense',
            details: error.message
        });
    }
});

// Save expenses (requires admin)
app.post('/api/save-expenses', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { expenses } = req.body;

        if (!Array.isArray(expenses)) {
            return res.status(400).json({ error: 'Expenses must be an array' });
        }

        console.log(`\n💾 Saving ${expenses.length} expenses using ID-based updates...`);

        // Group expenses by source room for efficient updates
        const roomUpdates = new Map(); // roomSlug -> { room, updates[] }

        for (const expense of expenses) {
            const { _id, roomSlug, description, amount, category, status, date, createdDate, completedDate, rooms, roomAllocations } = expense;

            // Validate that we have source tracking
            if (!_id || !roomSlug) {
                console.warn(`⚠️  Skipping expense without ID/roomSlug: ${description}`);
                continue;
            }

            // Get or create room update entry
            if (!roomUpdates.has(roomSlug)) {
                const room = await Room.findOne({ slug: roomSlug });
                if (!room) {
                    console.warn(`⚠️  Room not found: ${roomSlug}`);
                    continue;
                }
                roomUpdates.set(roomSlug, { room, updates: [] });
            }

            // Add update to this room's list
            roomUpdates.get(roomSlug).updates.push({
                _id,
                description,
                amount,
                category,
                status,
                date,
                createdDate,
                completedDate,
                rooms: rooms || [],
                roomAllocations: roomAllocations || []
            });
        }

        // Apply updates to each room
        let totalUpdated = 0;
        for (const [roomSlug, { room, updates }] of roomUpdates) {
            console.log(`\n📝 Updating ${updates.length} items in ${roomSlug}...`);

            for (const update of updates) {
                // Find item by MongoDB _id
                const item = room.items.id(update._id);

                if (!item) {
                    console.warn(`   ⚠️  Item not found: ${update._id}`);
                    continue;
                }

                // Update item fields
                item.description = update.description;
                item.category = update.category;
                item.status = update.status;

                // Update dates
                if (update.date) {
                    item.date = new Date(update.date);
                }
                if (update.createdDate) {
                    item.createdDate = new Date(update.createdDate);
                }
                if (update.completedDate) {
                    item.completedDate = new Date(update.completedDate);
                }

                // Update amount/allocations
                const amount = parseFloat(update.amount) || 0;

                if (update.rooms.length === 0) {
                    // General expense (no rooms)
                    item.actual_price = amount;
                    item.totalAmount = amount;
                    item.isSharedExpense = false;
                    item.roomAllocations = [];
                } else if (update.rooms.length === 1) {
                    // Single room
                    item.actual_price = amount;
                    item.totalAmount = amount;
                    item.isSharedExpense = false;
                    item.roomAllocations = [{ room: update.rooms[0], amount, percentage: 100 }];
                } else {
                    // Multi-room shared expense
                    item.totalAmount = amount;
                    item.isSharedExpense = true;

                    if (update.roomAllocations && update.roomAllocations.length > 0) {
                        // Use custom allocations
                        item.roomAllocations = update.roomAllocations;
                    } else {
                        // Default: split equally
                        const amountPerRoom = amount / update.rooms.length;
                        const percentagePerRoom = 100 / update.rooms.length;
                        item.roomAllocations = update.rooms.map(r => ({
                            room: r,
                            amount: amountPerRoom,
                            percentage: percentagePerRoom
                        }));
                    }
                }

                console.log(`   ✅ Updated: ${update.description.substring(0, 40)}...`);
                totalUpdated++;
            }

            // Save room
            await room.save();
            console.log(`   💾 Saved ${roomSlug}`);
        }

        console.log(`\n✨ Successfully updated ${totalUpdated} expenses\n`);

        res.json({
            success: true,
            message: 'Expenses saved successfully',
            stats: {
                total: totalUpdated
            }
        });
    } catch (error) {
        console.error('Error saving expenses:', error);
        res.status(500).json({
            error: 'Failed to save expenses',
            details: error.message,
        });
    }
});

// ============================================================================
// TIMELINE ROUTES
// ============================================================================

// Get timeline data
app.get('/api/timeline', async (req, res) => {
    try {
        let timeline = await Timeline.findOne({});

        // If no timeline exists, create an empty one
        if (!timeline) {
            timeline = new Timeline({ phases: [] });
            await timeline.save();
        }

        res.json({ success: true, timeline });
    } catch (error) {
        console.error('Error loading timeline:', error);
        res.status(500).json({
            error: 'Failed to load timeline',
            details: error.message,
        });
    }
});

// Save entire timeline (requires admin)
app.post('/api/timeline', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { timeline: timelineData } = req.body;

        let timeline = await Timeline.findOne({});

        if (!timeline) {
            timeline = new Timeline();
        }

        // Update timeline data
        timeline.phases = timelineData.phases || [];

        await timeline.save();

        res.json({
            success: true,
            message: 'Timeline saved successfully',
            timeline,
        });
    } catch (error) {
        console.error('Error saving timeline:', error);
        res.status(500).json({
            error: 'Failed to save timeline',
            details: error.message,
        });
    }
});

// Add a new phase (requires admin)
app.post('/api/timeline/phase', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { phase } = req.body;

        let timeline = await Timeline.findOne({});

        if (!timeline) {
            timeline = new Timeline({ phases: [] });
        }

        // Add new phase
        timeline.phases.push(phase);

        await timeline.save();

        res.json({
            success: true,
            message: 'Phase added successfully',
            timeline,
        });
    } catch (error) {
        console.error('Error adding phase:', error);
        res.status(500).json({
            error: 'Failed to add phase',
            details: error.message,
        });
    }
});

// Update a specific phase (requires admin)
app.put('/api/timeline/phase/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { phase: updatedPhase } = req.body;

        const timeline = await Timeline.findOne({});

        if (!timeline) {
            return res.status(404).json({ error: 'Timeline not found' });
        }

        // Find and update the phase
        const phaseIndex = timeline.phases.findIndex(p => p.id === id);

        if (phaseIndex === -1) {
            return res.status(404).json({ error: 'Phase not found' });
        }

        timeline.phases[phaseIndex] = updatedPhase;

        await timeline.save();

        res.json({
            success: true,
            message: 'Phase updated successfully',
            timeline,
        });
    } catch (error) {
        console.error('Error updating phase:', error);
        res.status(500).json({
            error: 'Failed to update phase',
            details: error.message,
        });
    }
});

// Delete a phase (requires admin)
app.delete('/api/timeline/phase/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const timeline = await Timeline.findOne({});

        if (!timeline) {
            return res.status(404).json({ error: 'Timeline not found' });
        }

        // Remove the phase
        timeline.phases = timeline.phases.filter(p => p.id !== id);

        await timeline.save();

        res.json({
            success: true,
            message: 'Phase deleted successfully',
            timeline,
        });
    } catch (error) {
        console.error('Error deleting phase:', error);
        res.status(500).json({
            error: 'Failed to delete phase',
            details: error.message,
        });
    }
});

// ============================================================================
// SERVER START
// ============================================================================

// Start server with Mongoose connection
async function startServer() {
    try {
        await connectDB();

        app.listen(port, () => {
            console.log(`\n🚀 Server running on http://localhost:${port}`);
            console.log(
                `📊 Using MongoDB with Mongoose (apartment_remodel database)`
            );
            console.log(`\n📍 Available endpoints:`);
            console.log(`   GET  /api/rooms - Get all rooms overview`);
            console.log(
                `   GET  /api/load-room/:roomName - Load specific room`
            );
            console.log(`   POST /api/save-room/:roomName - Save room data`);
            console.log(`   GET  /api/get-all-categories - Get all categories`);
            console.log(`   GET  /api/totals - Get project totals`);
            console.log(`   GET  /api/load-expenses - Load all expenses`);
            console.log(`   POST /api/save-expenses - Save expenses`);
            console.log(`   GET  /api/timeline - Get timeline data`);
            console.log(`   POST /api/timeline - Save timeline`);
            console.log(`   POST /api/timeline/phase - Add phase`);
            console.log(`   PUT  /api/timeline/phase/:id - Update phase`);
            console.log(`   DELETE /api/timeline/phase/:id - Delete phase`);
            console.log(`\n✨ Ready to serve!\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
