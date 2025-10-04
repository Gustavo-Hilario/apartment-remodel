const { getCollection } = require('./connection');

class ExpensesRepository {
    // Get all expenses
    async getAllExpenses() {
        const collection = await getCollection('expenses');
        return collection.find({}).sort({ date: -1 }).toArray();
    }

    // Get expenses by room ID
    async getExpensesByRoom(roomId) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('expenses');
        return collection
            .find({ room_id: new ObjectId(roomId) })
            .sort({ date: -1 })
            .toArray();
    }

    // Get general expenses (not tied to any specific room)
    async getGeneralExpenses() {
        const collection = await getCollection('expenses');
        return collection
            .find({ is_general: true })
            .sort({ date: -1 })
            .toArray();
    }

    // Get expenses that apply to all rooms
    async getExpensesForAllRooms() {
        const collection = await getCollection('expenses');
        return collection
            .find({ applies_to_all_rooms: true })
            .sort({ date: -1 })
            .toArray();
    }

    // Get expenses by category
    async getExpensesByCategory(category) {
        const collection = await getCollection('expenses');
        return collection.find({ category }).sort({ date: -1 }).toArray();
    }

    // Get expenses by room category (e.g., Labor, Materials)
    async getExpensesByRoomCategory(roomCategory) {
        const collection = await getCollection('expenses');
        return collection
            .find({ room_category: roomCategory })
            .sort({ date: -1 })
            .toArray();
    }

    // Create a new expense
    async createExpense(expenseData) {
        const collection = await getCollection('expenses');
        const result = await collection.insertOne({
            ...expenseData,
            created_at: new Date(),
        });
        return result.insertedId;
    }

    // Update an expense
    async updateExpense(id, updates) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('expenses');
        return collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
    }

    // Delete an expense
    async deleteExpense(id) {
        const { ObjectId } = require('mongodb');
        const collection = await getCollection('expenses');
        return collection.deleteOne({ _id: new ObjectId(id) });
    }

    // Get expenses summary by category
    async getExpensesSummary(startDate, endDate) {
        const collection = await getCollection('expenses');
        const matchQuery = {};

        if (startDate || endDate) {
            matchQuery.date = {};
            if (startDate) matchQuery.date.$gte = new Date(startDate);
            if (endDate) matchQuery.date.$lte = new Date(endDate);
        }

        return collection
            .aggregate([
                ...(Object.keys(matchQuery).length > 0
                    ? [{ $match: matchQuery }]
                    : []),
                {
                    $group: {
                        _id: '$category',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { total: -1 } },
            ])
            .toArray();
    }

    // Get total expenses
    async getTotalExpenses(options = {}) {
        const collection = await getCollection('expenses');
        const matchQuery = {};

        if (options.roomId) {
            const { ObjectId } = require('mongodb');
            matchQuery.room_id = new ObjectId(options.roomId);
        }
        if (options.category) {
            matchQuery.category = options.category;
        }
        if (options.isGeneral !== undefined) {
            matchQuery.is_general = options.isGeneral;
        }

        return collection
            .aggregate([
                ...(Object.keys(matchQuery).length > 0
                    ? [{ $match: matchQuery }]
                    : []),
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();
    }

    // Get expenses with room details (joined data)
    async getExpensesWithRoomDetails() {
        const collection = await getCollection('expenses');
        return collection
            .aggregate([
                {
                    $lookup: {
                        from: 'rooms',
                        localField: 'room_id',
                        foreignField: '_id',
                        as: 'room_details',
                    },
                },
                {
                    $unwind: {
                        path: '$room_details',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                { $sort: { date: -1 } },
            ])
            .toArray();
    }
}

module.exports = new ExpensesRepository();
