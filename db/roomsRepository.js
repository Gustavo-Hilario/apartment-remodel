const { getCollection } = require('./connection');

class RoomsRepository {
    // Get all rooms with summary data
    async getAllRooms() {
        const collection = await getCollection('rooms');
        return collection.find({}).toArray();
    }

    // Get room by ID with all items
    async getRoomById(id) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('rooms');
        return collection.findOne({ _id: new ObjectId(id) });
    }

    // Get room by name
    async getRoomByName(name) {
        const collection = await getCollection('rooms');
        return collection.findOne({ name });
    }

    // Get room by slug (filename)
    async getRoomBySlug(slug) {
        const collection = await getCollection('rooms');
        return collection.findOne({ slug });
    }

    // Create a new room
    async createRoom(roomData) {
        const collection = await getCollection('rooms');
        const result = await collection.insertOne({
            ...roomData,
            created_at: new Date(),
            updated_at: new Date(),
        });
        return result.insertedId;
    }

    // Update room data
    async updateRoom(id, updates) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('rooms');
        return collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...updates, updated_at: new Date() } }
        );
    }

    // Add an item to a room
    async addRoomItem(roomId, item) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('rooms');
        return collection.updateOne(
            { _id: new ObjectId(roomId) },
            {
                $push: { items: item },
                $set: { updated_at: new Date() },
            }
        );
    }

    // Update a specific item in a room
    async updateRoomItem(roomId, itemIndex, updates) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('rooms');

        const updateFields = {};
        Object.keys(updates).forEach((key) => {
            updateFields[`items.${itemIndex}.${key}`] = updates[key];
        });

        return collection.updateOne(
            { _id: new ObjectId(roomId) },
            {
                $set: {
                    ...updateFields,
                    updated_at: new Date(),
                },
            }
        );
    }

    // Recalculate room totals and progress
    async recalculateRoomStats(roomId) {
        const { ObjectId } = require('mongodb');
        const room = await this.getRoomById(roomId);

        if (!room) return null;

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
        const progress =
            room.items.length > 0
                ? (completedItems / room.items.length) * 100
                : 0;

        const status =
            completedItems === 0
                ? 'Planning'
                : completedItems === room.items.length
                ? 'Completed'
                : 'In Progress';

        return this.updateRoom(roomId, {
            budget: totalBudget,
            actual_spent: totalActual,
            progress_percent: progress,
            completed_items: completedItems,
            total_items: room.items.length,
            status: status,
        });
    }

    // Get room expenses (from expenses collection)
    async getRoomExpenses(roomId) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('expenses');
        return collection
            .find({ room_id: new ObjectId(roomId) })
            .sort({ date: -1 })
            .toArray();
    }

    // Get overview of all rooms
    async getRoomsOverview() {
        const collection = await getCollection('rooms');
        return collection
            .find(
                {},
                {
                    projection: {
                        name: 1,
                        slug: 1,
                        budget: 1,
                        actual_spent: 1,
                        progress_percent: 1,
                        status: 1,
                        completed_items: 1,
                        total_items: 1,
                    },
                }
            )
            .toArray();
    }

    // Get totals across all rooms
    async getTotals() {
        const collection = await getCollection('rooms');
        return collection
            .aggregate([
                {
                    $group: {
                        _id: null,
                        total_budget: { $sum: '$budget' },
                        total_actual: { $sum: '$actual_spent' },
                        total_rooms: { $sum: 1 },
                        total_items: { $sum: '$total_items' },
                        total_completed: { $sum: '$completed_items' },
                    },
                },
            ])
            .toArray();
    }
}

module.exports = new RoomsRepository();
