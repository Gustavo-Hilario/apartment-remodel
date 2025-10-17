#!/usr/bin/env node

const express = require('express');
const path = require('path');
const cors = require('cors');
const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');
const Expense = require('../db/models/Expense');
const roomsRepo = require('../db/roomsRepository');
const expensesRepo = require('../db/expensesRepository');

const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..')));

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
                isSharedExpense: item.isSharedExpense || false
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

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Transform to match frontend format
        const roomData = {
            name: room.name,
            budget: room.budget,
            images: room.images || [], // Return room images array
            items: room.items.map((item) => ({
                description: item.description,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                budget_price: item.budget_price,
                actual_price: item.actual_price,
                status: item.status,
                favorite: item.favorite || false,
                images: item.images || [], // Return images array
                imageUrl: item.imageUrl || '', // Keep legacy field
                showImage: item.showImage || false,
                links: item.links || [],
                notes: item.notes || '',
            })),
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

// Save room data
app.post('/api/save-room/:roomName', async (req, res) => {
    try {
        const { roomName } = req.params;
        const { roomData } = req.body;

        console.log(`\n📥 Saving room: ${roomName}`);
        console.log('Sample item from roomData:', roomData.items[0]);

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
        room.items = roomData.items.map((item) => ({
            description: item.description,
            category: item.category,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'unit',
            budget_price: parseFloat(item.budget_price) || 0,
            actual_price: parseFloat(item.actual_price) || 0,
            status: item.status || 'Pending',
            favorite: item.favorite || false,
            images: item.images || [], // Save images array
            imageUrl: item.imageUrl || '', // Keep legacy field for backward compatibility
            showImage: item.showImage || false,
            links: item.links || [],
            notes: item.notes || '',
        }));

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

        console.log(`✅ Saved ${roomData.name} data to MongoDB with Mongoose`);

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

        // Get expenses count
        const expenses = await Expense.find({});

        // Calculate totals from room virtuals
        let totalBudget = 0;
        let totalActualSpent = 0;
        let totalItems = 0;
        let totalCompleted = 0;
        let productsCount = 0;

        rooms.forEach((room) => {
            totalBudget += room.budget || 0;
            totalActualSpent += room.actual_spent || 0; // This is a virtual
            totalItems += room.total_items || 0; // This is a virtual
            totalCompleted += room.completed_items || 0; // This is a virtual

            if (room.items) {
                productsCount += room.items.filter(
                    (item) => item.category === 'Products'
                ).length;
            }
        });

        // Format response to match frontend expectations
        const response = {
            totalBudget,
            totalExpenses: totalActualSpent,
            totalRooms: rooms.length,
            totalItems,
            totalCompleted,
            totalProducts: productsCount,
            expenseCount: expenses.length,
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
        // Get all rooms including _general
        const rooms = await Room.find({});
        const expenses = [];
        
        // Process each room
        for (const room of rooms) {
            for (const item of room.items) {
                // Only include completed items
                if (item.status === 'Completed') {
                    // Handle shared expenses differently
                    if (item.isSharedExpense && item.roomAllocations) {
                        // For shared expenses, create one entry per room allocation
                        item.roomAllocations.forEach(allocation => {
                            expenses.push({
                                description: item.description,
                                amount: allocation.amount,
                                category: item.category,
                                date: new Date().toISOString().split('T')[0], // Default to today
                                rooms: [allocation.room],
                                roomCategory: item.category,
                                status: item.status,
                                isSharedExpense: true,
                                totalAmount: item.totalAmount,
                                sharedWith: item.roomAllocations.filter(a => a.room !== allocation.room).map(a => a.room)
                            });
                        });
                    } else {
                        // Regular room-specific item
                        const itemAmount = (parseFloat(item.actual_price) || parseFloat(item.budget_price) || 0) * (parseFloat(item.quantity) || 1);
                        expenses.push({
                            description: item.description,
                            amount: itemAmount,
                            category: item.category,
                            date: new Date().toISOString().split('T')[0], // Default to today
                            rooms: room.slug === '_general' ? [] : [room.slug],
                            roomCategory: item.category,
                            status: item.status,
                            isSharedExpense: false
                        });
                    }
                }
            }
        }
        
        // Sort by date (most recent first) - for now all have same date, but structure is ready
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ success: true, expenses });
    } catch (error) {
        console.error('Error loading expenses:', error);
        res.status(500).json({
            error: 'Failed to load expenses',
            details: error.message,
        });
    }
});

        // Transform to match frontend format
        const formattedExpenses = expenses.map((exp) => ({
            description: exp.description,
            amount: exp.amount,
            category: exp.category,
            date: exp.date
                ? exp.date instanceof Date
                    ? exp.date.toISOString().split('T')[0]
                    : exp.date.split('T')[0]
                : '',
            room: exp.room,
            rooms: exp.rooms || [], // Include rooms array for frontend
            roomCategory: exp.roomCategory,
            status: exp.status || 'Pending',
        }));

        res.json({ success: true, expenses: formattedExpenses });
    } catch (error) {
        console.error('Error loading expenses:', error);
        res.status(500).json({
            error: 'Failed to load expenses',
            details: error.message,
        });
    }
});

// Get expenses summary
app.get('/api/expenses-summary', async (req, res) => {
    try {
        const summary = await Expense.aggregate([
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    total: 1,
                    count: 1,
                },
            },
            { $sort: { total: -1 } },
        ]);

        res.json({ success: true, summary });
    } catch (error) {
        console.error('Error getting expenses summary:', error);
        res.status(500).json({
            error: 'Failed to get expenses summary',
            details: error.message,
        });
    }
});

// Save expenses
app.post('/api/save-expenses', async (req, res) => {
    try {
        const { expenses } = req.body;

        if (!Array.isArray(expenses)) {
            return res.status(400).json({ error: 'Expenses must be an array' });
        }

        console.log(`\n💾 Saving ${expenses.length} expenses...`);

        // Get _general room
        const generalRoom = await Room.findOne({ slug: '_general' });
        if (!generalRoom) {
            return res.status(500).json({ error: '_general room not found' });
        }

        // Clear all existing items from _general room
        // (All expense-managed items are stored here)
        generalRoom.items = [];

        // Process each expense from the frontend
        for (const expense of expenses) {
            const rooms = expense.rooms || [];
            const description = expense.description;
            const amount = parseFloat(expense.amount) || 0;
            const category = expense.category || 'Other';
            const status = expense.status || 'Completed';

            // Case 1: No rooms (general expense)
            if (rooms.length === 0) {
                generalRoom.items.push({
                    description,
                    category,
                    quantity: 1,
                    unit: 'unit',
                    budget_price: 0,
                    actual_price: amount,
                    subtotal: amount,
                    status,
                    isSharedExpense: false,
                    roomAllocations: [],
                    totalAmount: amount
                });
                console.log(`   ➕ General: "${description}" (S/ ${amount.toFixed(2)})`);
            }
            // Case 2: Single room
            else if (rooms.length === 1) {
                generalRoom.items.push({
                    description,
                    category,
                    quantity: 1,
                    unit: 'unit',
                    budget_price: 0,
                    actual_price: amount,
                    subtotal: amount,
                    status,
                    isSharedExpense: false,
                    roomAllocations: [{ room: rooms[0], amount, percentage: 100 }],
                    totalAmount: amount
                });
                console.log(`   ➕ Single room (${rooms[0]}): "${description}" (S/ ${amount.toFixed(2)})`);
            }
            // Case 3: Multiple rooms (shared expense)
            else {
                // Check if expense has custom roomAllocations from frontend
                const hasCustomAllocations = expense.roomAllocations && expense.roomAllocations.length > 0;
                
                let roomAllocations;
                if (hasCustomAllocations) {
                    // Use custom allocations from frontend
                    roomAllocations = expense.roomAllocations;
                } else {
                    // Default: split equally
                    const amountPerRoom = amount / rooms.length;
                    const percentagePerRoom = 100 / rooms.length;
                    roomAllocations = rooms.map(roomSlug => ({
                        room: roomSlug,
                        amount: amountPerRoom,
                        percentage: percentagePerRoom
                    }));
                }

                generalRoom.items.push({
                    description,
                    category,
                    quantity: 1,
                    unit: 'unit',
                    budget_price: 0,
                    actual_price: 0, // Shared expenses use roomAllocations instead
                    subtotal: 0,
                    status,
                    isSharedExpense: true,
                    roomAllocations,
                    totalAmount: amount
                });
                console.log(`   ➕ Shared (${rooms.length} rooms): "${description}" (S/ ${amount.toFixed(2)})`);
            }
        }

        // Save _general room
        await generalRoom.save();

        console.log(`\n✅ Saved ${expenses.length} expenses to _general room`);

        res.json({
            success: true,
            message: 'Expenses saved successfully',
            stats: {
                total: expenses.length
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
            console.log(`   GET  /api/expenses-summary - Get expenses summary`);
            console.log(`   POST /api/save-expenses - Save expenses`);
            console.log(`\n✨ Ready to serve!\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
