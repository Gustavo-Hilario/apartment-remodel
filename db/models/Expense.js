const mongoose = require('mongoose');

// Expense Schema
const expenseSchema = new mongoose.Schema(
    {
        // Reference to the product that created this expense (for completed products)
        productRoom: {
            type: String,
            default: null,
        },
        productIndex: {
            type: Number,
            default: null,
        },
        isFromProduct: {
            type: Boolean,
            default: false,
        },
        description: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            default: 0,
        },
        category: {
            type: String,
            required: true,
            default: 'Other',
        },
        date: {
            type: Date,
            default: Date.now,
        },
        room: {
            type: String,
            default: '',
        },
        rooms: {
            type: [String],
            default: [],
        },
        roomCategory: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['Planning', 'Pending', 'Ordered', 'Completed'],
            default: 'Pending',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

const Expense = mongoose.model('Expense', expenseSchema, 'expenses');

module.exports = Expense;
