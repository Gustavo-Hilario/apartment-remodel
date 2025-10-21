const mongoose = require('mongoose');

/**
 * Expense Model
 *
 * Stores general/shared project expenses that are not tied to specific room work.
 * Examples: Notary fees, permits, architect/design fees, bulk delivery, etc.
 *
 * Can be linked to:
 * - No rooms (general project overhead)
 * - One room (expense for specific room but tracked separately)
 * - Multiple rooms (shared expense with optional custom allocation)
 */

const expenseSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: true,
            default: 'New Expense',
        },
        category: {
            type: String,
            required: true,
            default: 'Other',
        },
        amount: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            enum: ['Planning', 'Pending', 'Ordered', 'Completed'],
            default: 'Pending',
        },

        // Date tracking
        date: {
            type: Date,
            default: null,
        },
        createdDate: {
            type: Date,
            default: Date.now,
        },
        completedDate: {
            type: Date,
            default: null,
        },

        // Room linking
        // Empty array = general expense not tied to specific rooms
        // ['cocina'] = expense for kitchen only
        // ['cocina', 'sala', 'bano1'] = shared expense across multiple rooms
        rooms: {
            type: [String],
            default: [],
        },

        // Custom allocation for multi-room expenses
        // If present, overrides equal split
        // Example: { room: 'cocina', amount: 500, percentage: 60 }
        roomAllocations: {
            type: [
                {
                    room: { type: String, required: true },
                    amount: { type: Number, required: true },
                    percentage: { type: Number, required: true },
                },
            ],
            default: [],
        },

        // Flag for shared expenses
        isSharedExpense: {
            type: Boolean,
            default: false,
        },

        // Additional notes
        notes: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

// Index for efficient querying by room
expenseSchema.index({ rooms: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdDate: -1 });

// Virtual to check if expense is general (not linked to any room)
expenseSchema.virtual('isGeneral').get(function () {
    return !this.rooms || this.rooms.length === 0;
});

// Ensure virtuals are included when converting to JSON/Object
expenseSchema.set('toJSON', { virtuals: true });
expenseSchema.set('toObject', { virtuals: true });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
