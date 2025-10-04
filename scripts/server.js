#!/usr/bin/env node

const express = require('express');
const path = require('path');
const cors = require('cors');
const { ObjectId } = require('mongodb');

// Import repositories
const roomsRepo = require('../db/roomsRepository');
const expensesRepo = require('../db/expensesRepository');

const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ============================================================================
// ROOM ROUTES
// ============================================================================

// Get all rooms overview
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await roomsRepo.getRoomsOverview();
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
        const room = await roomsRepo.getRoomBySlug(roomName);

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

        // Find existing room
        const existingRoom = await roomsRepo.getRoomBySlug(roomName);

        if (!existingRoom) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Update room with new data
        await roomsRepo.updateRoom(existingRoom._id, {
            name: roomData.name,
            budget: parseFloat(roomData.budget) || 0,
            items: roomData.items.map((item) => ({
                description: item.description,
                category: item.category,
                quantity: parseFloat(item.quantity) || 1,
                unit: item.unit || 'unit',
                budget_price: parseFloat(item.budgetRate) || 0,
                actual_price: parseFloat(item.actualRate) || 0,
                subtotal: parseFloat(item.subtotal) || 0,
                status: item.status || 'Pending',
            })),
        });

        // Recalculate room statistics
        await roomsRepo.recalculateRoomStats(existingRoom._id);

        console.log(`✅ Saved ${roomData.name} data to MongoDB`);

        res.json({
            success: true,
            message: `${roomData.name} data saved successfully`,
            roomId: existingRoom._id,
        });
    } catch (error) {
        console.error('Error saving room data:', error);
        res.status(500).json({
            error: 'Failed to save room data',
            details: error.message,
        });
    }
});

// Get all unique categories from all rooms
app.get('/api/get-all-categories', async (req, res) => {
    try {
        const rooms = await roomsRepo.getAllRooms();
        const categoriesSet = new Set();

        rooms.forEach((room) => {
            room.items.forEach((item) => {
                if (item.category) {
                    categoriesSet.add(item.category);
                }
            });
        });

        const categories = Array.from(categoriesSet).sort();

        res.json({ success: true, categories });
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
        const expenses = await expensesRepo.getAllExpenses();

        // Transform to match frontend format
        const formattedExpenses = expenses.map((exp) => ({
            description: exp.description,
            amount: exp.amount,
            category: exp.category,
            date: exp.date ? exp.date.toISOString().split('T')[0] : '',
            room: exp.room_name,
            roomCategory: exp.room_category,
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
        const summary = await expensesRepo.getExpensesSummary();
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
        const existing = await expensesRepo.getAllExpenses();
        const existingMap = new Map(
            existing.map((e) => [
                `${e.description}|${e.category}|${e.room_name}`,
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
                toDelete.push(exp._id);
            }
        });

        // Process new/updated expenses
        for (const expense of expenses) {
            const key = `${expense.description}|${expense.category}|${
                expense.room || 'General'
            }`;
            const existing = existingMap.get(key);

            // Determine room_id
            let roomId = null;
            const roomName = expense.room || 'General';

            if (
                roomName &&
                roomName !== 'All Rooms' &&
                roomName !== 'General'
            ) {
                const room = await roomsRepo.getRoomByName(roomName);
                roomId = room ? room._id : null;
            }

            const expenseData = {
                room_id: roomId,
                room_name: roomName,
                is_general: !roomName || roomName === 'General',
                applies_to_all_rooms: roomName === 'All Rooms',
                date: expense.date ? new Date(expense.date) : new Date(),
                category: expense.category,
                room_category: expense.roomCategory || expense.category,
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
                    toUpdate.push({ id: existing._id, data: expenseData });
                }
            } else {
                toCreate.push(expenseData);
            }
        }

        // Execute deletions (and remove from rooms if "All Rooms" or specific room)
        for (const id of toDelete) {
            const deletedExpense = existing.find(
                (e) => e._id.toString() === id.toString()
            );
            await expensesRepo.deleteExpense(id);

            if (deletedExpense) {
                // If it was an "All Rooms" expense, remove from all room items
                if (deletedExpense.applies_to_all_rooms) {
                    const allRooms = await roomsRepo.getAllRooms();
                    for (const room of allRooms) {
                        // Filter out items matching the deleted expense
                        const updatedItems = room.items.filter(
                            (item) =>
                                item.description !==
                                    deletedExpense.description ||
                                item.category !== deletedExpense.room_category
                        );
                        if (updatedItems.length !== room.items.length) {
                            await roomsRepo.updateRoom(room._id, {
                                items: updatedItems,
                            });
                            await roomsRepo.recalculateRoomStats(room._id);
                            console.log(
                                `   🗑️  Removed "${deletedExpense.description}" from ${room.name}`
                            );
                        }
                    }
                }
                // If it was a room-specific expense, remove from that room only
                else if (deletedExpense.room_id) {
                    const room = await roomsRepo.getRoomById(
                        deletedExpense.room_id
                    );
                    if (room) {
                        const updatedItems = room.items.filter(
                            (item) =>
                                item.description !==
                                    deletedExpense.description ||
                                item.category !== deletedExpense.room_category
                        );
                        if (updatedItems.length !== room.items.length) {
                            await roomsRepo.updateRoom(room._id, {
                                items: updatedItems,
                            });
                            await roomsRepo.recalculateRoomStats(room._id);
                            console.log(
                                `   🗑️  Removed "${deletedExpense.description}" from ${room.name}`
                            );
                        }
                    }
                }
            }
        }

        // Execute updates (update amounts in rooms if "All Rooms" or specific room)
        for (const { id, data } of toUpdate) {
            await expensesRepo.updateExpense(id, data);

            // If it's an "All Rooms" expense, update in all room items
            if (data.applies_to_all_rooms) {
                const allRooms = await roomsRepo.getAllRooms();
                const amountPerRoom = data.amount / allRooms.length;

                for (const room of allRooms) {
                    // Find and update the item in the room
                    const itemIndex = room.items.findIndex(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.room_category
                    );

                    if (itemIndex !== -1) {
                        await roomsRepo.updateRoomItem(room._id, itemIndex, {
                            actual_price: amountPerRoom,
                            subtotal: amountPerRoom,
                        });
                        await roomsRepo.recalculateRoomStats(room._id);
                        console.log(
                            `   ✏️  Updated "${data.description}" in ${
                                room.name
                            }: S/ ${amountPerRoom.toFixed(2)}`
                        );
                    }
                }
            }
            // If it's a room-specific expense, update in that room only
            else if (data.room_id) {
                const room = await roomsRepo.getRoomById(data.room_id);
                if (room) {
                    const itemIndex = room.items.findIndex(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.room_category
                    );

                    if (itemIndex !== -1) {
                        await roomsRepo.updateRoomItem(room._id, itemIndex, {
                            actual_price: data.amount,
                            subtotal: data.amount,
                        });
                        await roomsRepo.recalculateRoomStats(room._id);
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
            await expensesRepo.createExpense(data);

            // Handle "All Rooms" expense - split across all rooms
            if (data.applies_to_all_rooms) {
                const allRooms = await roomsRepo.getAllRooms();
                const amountPerRoom = data.amount / allRooms.length;

                console.log(
                    `\n🏠 Splitting "${data.description}" (S/ ${data.amount}) across ${allRooms.length} rooms...`
                );
                console.log(
                    `   Amount per room: S/ ${amountPerRoom.toFixed(2)}`
                );

                for (const room of allRooms) {
                    // Check if item already exists
                    const existingItemIndex = room.items.findIndex(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.room_category
                    );

                    if (existingItemIndex === -1) {
                        // Add as a new item in the room
                        const newItem = {
                            description: data.description,
                            category: data.room_category,
                            quantity: 1,
                            unit: 'unit',
                            budget_price: 0,
                            actual_price: amountPerRoom,
                            subtotal: amountPerRoom,
                            status: 'Completed',
                        };

                        await roomsRepo.addRoomItem(room._id, newItem);
                        await roomsRepo.recalculateRoomStats(room._id);
                        console.log(
                            `   ✅ Added to ${
                                room.name
                            }: S/ ${amountPerRoom.toFixed(2)}`
                        );
                    }
                }
            }
            // Handle room-specific expense
            else if (data.room_id) {
                const room = await roomsRepo.getRoomById(data.room_id);
                if (room) {
                    // Check if item already exists
                    const existingItemIndex = room.items.findIndex(
                        (item) =>
                            item.description === data.description &&
                            item.category === data.room_category
                    );

                    if (existingItemIndex === -1) {
                        const newItem = {
                            description: data.description,
                            category: data.room_category,
                            quantity: 1,
                            unit: 'unit',
                            budget_price: 0,
                            actual_price: data.amount,
                            subtotal: data.amount,
                            status: 'Completed',
                        };

                        await roomsRepo.addRoomItem(room._id, newItem);
                        await roomsRepo.recalculateRoomStats(room._id);
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

app.listen(port, () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`📊 Using MongoDB (apartment_remodel database)`);
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
