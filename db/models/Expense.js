const mongoose = require('mongoose');

// Expense Schema
const expenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    category: {
        type: String,
        required: true,
        default: 'Other'
    },
    date: {
        type: Date,
        default: Date.now
    },
    room: {
        type: String,
        default: ''
    },
    roomCategory: {
        type: String,
        default: ''
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Expense = mongoose.model('Expense', expenseSchema, 'expenses');

module.exports = Expense;
