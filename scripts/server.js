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

        // Transform to match frontend format
        const roomData = {
            name: room.name,
            budget: room.budget,
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
        // Get all rooms with virtuals (actual_spent, progress_percent, etc.)
        const rooms = await Room.find({});

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
        const expenses = await Expense.find().sort({ date: -1 });

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

        // Helper function to create unique key for expense
        const getExpenseKey = (exp) => {
            const roomsKey =
                Array.isArray(exp.rooms) && exp.rooms.length > 0
                    ? exp.rooms.sort().join(',')
                    : 'General';
            return `${exp.description}|${exp.category}|${roomsKey}`;
        };

        // Get existing expenses to detect changes
        const existing = await Expense.find();
        const existingMap = new Map(existing.map((e) => [getExpenseKey(e), e]));

        // Track what to delete
        const toDelete = [];
        const toUpdate = [];
        const toCreate = [];

        // Build map of new expenses
        const newExpensesMap = new Map(
            expenses.map((e) => [getExpenseKey(e), e])
        );

        // Find deleted expenses
        existingMap.forEach((exp, key) => {
            if (!newExpensesMap.has(key)) {
                toDelete.push(exp);
            }
        });

        // Process new/updated expenses
        for (const expense of expenses) {
            const key = getExpenseKey(expense);
            const existing = existingMap.get(key);

            const expenseData = {
                rooms: Array.isArray(expense.rooms) ? expense.rooms : [],
                room: expense.room || 'General', // Keep for backward compatibility
                date: expense.date ? new Date(expense.date) : new Date(),
                category: expense.category,
                roomCategory: expense.roomCategory || expense.category,
                description: expense.description,
                amount: parseFloat(expense.amount) || 0,
                status: expense.status || 'Pending',
            };

            if (existing) {
                // Check if updated
                if (
                    existing.amount !== expenseData.amount ||
                    existing.date?.toISOString() !==
                        expenseData.date.toISOString() ||
                    existing.status !== expenseData.status
                ) {
                    toUpdate.push({ expense: existing, data: expenseData });
                }
            } else {
                toCreate.push(expenseData);
            }
        }

        // Helper function to recalculate room stats
        const recalculateRoomStats = async (room) => {
            const totalBudget = room.items.reduce(
                (sum, item) => sum + (item.budget_price * item.quantity || 0),
                0
            );
            const totalActual = room.items.reduce(
                (sum, item) => sum + (item.actual_price * item.quantity || 0),
                0
            );
            room.total_budget = totalBudget;
            room.total_actual = totalActual;
            await room.save();
        };

        // Execute deletions (remove from rooms using expenseId tracking)
        for (const deletedExpense of toDelete) {
            console.log(
                `\n🗑️  Deleting expense: "${deletedExpense.description}"`
            );

            // Remove from all rooms that have items with this expenseId
            const allRooms = await Room.find();
            for (const room of allRooms) {
                const originalLength = room.items.length;
                room.items = room.items.filter(
                    (item) =>
                        !item.expenseId ||
                        !item.expenseId.equals(deletedExpense._id)
                );
                if (room.items.length !== originalLength) {
                    await recalculateRoomStats(room);
                    console.log(`   ✅ Removed from ${room.name}`);
                }
            }

            // Delete the expense itself
            await Expense.deleteOne({ _id: deletedExpense._id });
        }

        // Execute updates (update amounts in rooms using expenseId)
        for (const { expense, data } of toUpdate) {
            const oldAmount = expense.amount;
            const oldRooms = expense.rooms || [];
            const newRooms = data.rooms || [];

            // Update the expense
            Object.assign(expense, data);
            await expense.save();

            console.log(`\n✏️  Updating expense: "${data.description}"`);

            // Determine which rooms to update based on rooms array
            let roomsToUpdate = [];
            if (newRooms.length > 0) {
                roomsToUpdate = newRooms;
            } else if (data.room === 'All Rooms') {
                const allRooms = await Room.find();
                roomsToUpdate = allRooms.map((r) => r.slug);
            }

            // Calculate amount per room
            const amountPerRoom =
                roomsToUpdate.length > 0
                    ? data.amount / roomsToUpdate.length
                    : data.amount;

            // Update items in affected rooms
            for (const roomSlug of roomsToUpdate) {
                const room = await Room.findOne({ slug: roomSlug });
                if (room) {
                    const item = room.items.find(
                        (item) =>
                            item.expenseId && item.expenseId.equals(expense._id)
                    );

                    if (item) {
                        item.actual_price = amountPerRoom;
                        item.subtotal = amountPerRoom;
                        item.description = data.description;
                        item.category = data.roomCategory;
                        item.status = data.status; // Update status to match expense
                        await recalculateRoomStats(room);
                        console.log(
                            `   ✅ Updated in ${
                                room.name
                            }: S/ ${amountPerRoom.toFixed(2)}`
                        );
                    }
                }
            }
        }

        // Execute creations (add to rooms based on rooms array)
        for (const data of toCreate) {
            // Create the expense first to get the ID
            const newExpense = await Expense.create(data);
            console.log(
                `\n➕ Creating expense: "${data.description}" (S/ ${data.amount})`
            );

            // Determine which rooms to add this expense to
            let roomsToAddTo = [];
            if (data.rooms && data.rooms.length > 0) {
                roomsToAddTo = data.rooms;
            } else if (data.room === 'All Rooms') {
                const allRooms = await Room.find();
                roomsToAddTo = allRooms.map((r) => r.slug);
            }

            // Skip room addition if it's a General expense (no rooms)
            if (roomsToAddTo.length === 0) {
                console.log(`   ℹ️  General expense - not added to any room`);
                continue;
            }

            // Calculate amount per room (split equally)
            const amountPerRoom = data.amount / roomsToAddTo.length;
            console.log(
                `   💰 Splitting across ${
                    roomsToAddTo.length
                } room(s): S/ ${amountPerRoom.toFixed(2)} each`
            );

            // Add expense item to each selected room
            for (const roomSlug of roomsToAddTo) {
                const room = await Room.findOne({ slug: roomSlug });
                if (room) {
                    const existingItem = room.items.find(
                        (item) =>
                            item.expenseId &&
                            item.expenseId.equals(newExpense._id)
                    );

                    if (!existingItem) {
                        room.items.push({
                            expenseId: newExpense._id,
                            description: data.description,
                            category: data.roomCategory,
                            quantity: 1,
                            unit: 'unit',
                            budget_price: 0,
                            actual_price: amountPerRoom,
                            subtotal: amountPerRoom,
                            status: data.status, // Use expense status instead of hardcoding
                        });
                        await recalculateRoomStats(room);
                        console.log(
                            `   ✅ Added to ${
                                room.name
                            }: S/ ${amountPerRoom.toFixed(2)}`
                        );
                    }
                }
            }
        }

        console.log(
            `\n✅ Expenses updated: ${toCreate.length} created, ${toUpdate.length} updated, ${toDelete.length} deleted`
        );

        res.json({
            success: true,
            message: 'Expenses saved successfully',
            stats: {
                created: toCreate.length,
                updated: toUpdate.length,
                deleted: toDelete.length,
            },
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
