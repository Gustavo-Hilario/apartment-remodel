#!/usr/bin/env node

const express = require('express');
const path = require('path');
const cors = require('cors');
const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');
const Expense = require('../db/models/Expense');

const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ============================================================================
// ROOM ROUTES
// ============================================================================
// ROOM ROUTES
// ============================================================================

// Get all rooms overview
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await Room.find({}).select('name slug budget actual_spent progress_percent completed_items total_items status');
        res.json({ success: true, rooms });
    } catch (error) {
        console.error('Error loading rooms:', error);
        res.status(500).json({
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
                budgetRate: item.budget_price,
                actualRate: item.actual_price,
                subtotal: item.subtotal,
                status: item.status,
                favorite: item.favorite || false,
                imageUrl: item.imageUrl || '',
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
            budget_price: parseFloat(item.budgetRate) || 0,
            actual_price: parseFloat(item.actualRate) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
            status: item.status || 'Pending',
            favorite: item.favorite || false,
            imageUrl: item.imageUrl || '',
            links: item.links || [],
            notes: item.notes || '',
        }));

        // Recalculate room statistics
        const totalBudget = room.items.reduce(
            (sum, item) => sum + item.budget_price * item.quantity,
            0
        );
        const totalActual = room.items.reduce(
            (sum, item) => sum + item.actual_price * item.quantity,
            0
        );
        const completedItems = room.items.filter(
            (item) => item.status === 'Completed'
        ).length;

        room.actual_spent = totalActual;
        room.progress_percent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
        room.completed_items = completedItems;
        room.total_items = room.items.length;
        room.status = completedItems === room.items.length && room.items.length > 0
            ? 'Completed'
            : completedItems > 0
            ? 'In Progress'
            : 'Not Started';

        // Save using Mongoose
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
        const categories = await Room.aggregate([
            { $unwind: '$items' },
            { $group: { _id: '$items.category' } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, category: '$_id' } },
        ]);

        const categoryList = categories.map((c) => c.category).filter(Boolean);

        res.json({ success: true, categories: categoryList });
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
        const totals = await roomsRepo.getTotals();
        res.json({ success: true, totals: totals[0] || {} });
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
                ? (exp.date instanceof Date 
                    ? exp.date.toISOString().split('T')[0] 
                    : exp.date.split('T')[0])
                : '',
            room: exp.room,
            roomCategory: exp.roomCategory,
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

        // Get existing expenses to detect changes
        const existing = await Expense.find();
        const existingMap = new Map(
            existing.map((e) => [
                `${e.description}|${e.category}|${e.room}`,
                e,
            ])
        );

        // Track what to delete
        const toDelete = [];
        const toUpdate = [];
        const toCreate = [];

        // Build map of new expenses
        const newExpensesMap = new Map(
            expenses.map((e) => [
                `${e.description}|${e.category}|${e.room || 'General'}`,
                e,
            ])
        );

        // Find deleted expenses
        existingMap.forEach((exp, key) => {
            if (!newExpensesMap.has(key)) {
                toDelete.push(exp);
            }
        });

        // Process new/updated expenses
        for (const expense of expenses) {
            const key = `${expense.description}|${expense.category}|${
                expense.room || 'General'
            }`;
            const existing = existingMap.get(key);

            const expenseData = {
                room: expense.room || 'General',
                date: expense.date ? new Date(expense.date) : new Date(),
                category: expense.category,
                roomCategory: expense.roomCategory || expense.category,
                description: expense.description,
                amount: parseFloat(expense.amount) || 0,
            };

            if (existing) {
                // Check if updated
                if (
                    existing.amount !== expenseData.amount ||
                    existing.date?.toISOString() !==
                        expenseData.date.toISOString()
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

        // Execute deletions (and remove from rooms if "All Rooms" or specific room)
        for (const deletedExpense of toDelete) {
            await Expense.deleteOne({ _id: deletedExpense._id });

            // If it was an "All Rooms" expense, remove from all room items
            if (deletedExpense.room === 'All Rooms') {
                const allRooms = await Room.find();
                for (const room of allRooms) {
                    const originalLength = room.items.length;
                    room.items = room.items.filter(
                        (item) =>
                            item.description !== deletedExpense.description ||
                            item.category !== deletedExpense.roomCategory
                    );
                    if (room.items.length !== originalLength) {
                        await recalculateRoomStats(room);
                        console.log(
                            `   🗑️  Removed "${deletedExpense.description}" from ${room.name}`
                        );
                    }
                }
            }
            // If it was a room-specific expense, remove from that room only
            else if (
                deletedExpense.room &&
                deletedExpense.room !== 'General'
            ) {
                const room = await Room.findOne({ name: deletedExpense.room });
                if (room) {
                    const originalLength = room.items.length;
                    room.items = room.items.filter(
                        (item) =>
                            item.description !== deletedExpense.description ||
                            item.category !== deletedExpense.roomCategory
                    );
                    if (room.items.length !== originalLength) {
                        await recalculateRoomStats(room);
                        console.log(
                            `   🗑️  Removed "${deletedExpense.description}" from ${room.name}`
                        );
                    }
                }
            }
        }

        // Execute updates (update amounts in rooms if "All Rooms" or specific room)
        for (const { expense, data } of toUpdate) {
            Object.assign(expense, data);
            await expense.save();

            // If it's an "All Rooms" expense, update in all room items
            if (data.room === 'All Rooms') {
                const allRooms = await Room.find();
                const amountPerRoom = data.amount / allRooms.length;

                for (const room of allRooms) {
                    const item = room.items.find(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.roomCategory
                    );

                    if (item) {
                        item.actual_price = amountPerRoom;
                        item.subtotal = amountPerRoom;
                        await recalculateRoomStats(room);
                        console.log(
                            `   ✏️  Updated "${data.description}" in ${
                                room.name
                            }: S/ ${amountPerRoom.toFixed(2)}`
                        );
                    }
                }
            }
            // If it's a room-specific expense, update in that room only
            else if (data.room && data.room !== 'General') {
                const room = await Room.findOne({ name: data.room });
                if (room) {
                    const item = room.items.find(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.roomCategory
                    );

                    if (item) {
                        item.actual_price = data.amount;
                        item.subtotal = data.amount;
                        await recalculateRoomStats(room);
                        console.log(
                            `   ✏️  Updated "${data.description}" in ${
                                room.name
                            }: S/ ${data.amount.toFixed(2)}`
                        );
                    }
                }
            }
        }

        // Execute creations (and add to rooms if "All Rooms" or specific room)
        for (const data of toCreate) {
            await Expense.create(data);

            // Handle "All Rooms" expense - split across all rooms
            if (data.room === 'All Rooms') {
                const allRooms = await Room.find();
                const amountPerRoom = data.amount / allRooms.length;

                console.log(
                    `\n🏠 Splitting "${data.description}" (S/ ${data.amount}) across ${allRooms.length} rooms...`
                );
                console.log(
                    `   Amount per room: S/ ${amountPerRoom.toFixed(2)}`
                );

                for (const room of allRooms) {
                    const existingItem = room.items.find(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.roomCategory
                    );

                    if (!existingItem) {
                        room.items.push({
                            description: data.description,
                            category: data.roomCategory,
                            quantity: 1,
                            unit: 'unit',
                            budget_price: 0,
                            actual_price: amountPerRoom,
                            subtotal: amountPerRoom,
                            status: 'Completed',
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
            // Handle room-specific expense
            else if (data.room && data.room !== 'General') {
                const room = await Room.findOne({ name: data.room });
                if (room) {
                    const existingItem = room.items.find(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.roomCategory
                    );

                    if (!existingItem) {
                        room.items.push({
                            description: data.description,
                            category: data.roomCategory,
                            quantity: 1,
                            unit: 'unit',
                            budget_price: 0,
                            actual_price: data.amount,
                            subtotal: data.amount,
                            status: 'Completed',
                        });
                        await recalculateRoomStats(room);
                        console.log(
                            `   ✅ Added "${data.description}" to ${
                                room.name
                            }: S/ ${data.amount.toFixed(2)}`
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
            console.log(`📊 Using MongoDB with Mongoose (apartment_remodel database)`);
            console.log(`\n📍 Available endpoints:`);
            console.log(`   GET  /api/rooms - Get all rooms overview`);
            console.log(`   GET  /api/load-room/:roomName - Load specific room`);
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
