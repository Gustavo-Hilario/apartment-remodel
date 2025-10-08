const mongoose = require('mongoose');

// Item Schema - for items within a room
const itemSchema = new mongoose.Schema(
    {
        expenseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Expense',
            default: null,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            default: 'Other',
        },
        quantity: {
            type: Number,
            default: 1,
        },
        unit: {
            type: String,
            default: 'unit',
        },
        budget_price: {
            type: Number,
            default: 0,
        },
        actual_price: {
            type: Number,
            default: 0,
        },
        subtotal: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['Planning', 'Pending', 'Ordered', 'Completed'],
            default: 'Pending',
        },
        // Product fields
        favorite: {
            type: Boolean,
            default: false,
        },
        images: {
            type: [
                {
                    id: String,
                    name: String,
                    url: String,
                    data: String, // Base64 data or URL
                    isMainImage: { type: Boolean, default: false }, // Primary/thumbnail image flag
                    showImage: { type: Boolean, default: false }, // Backward compatibility
                    uploadedAt: { type: Date, default: Date.now },
                },
            ],
            default: [], // Ensure images is always an array
        },
        // Legacy fields (keep for backward compatibility)
        imageUrl: {
            type: String,
            default: '',
        },
        showImage: {
            type: Boolean,
            default: false,
        },
        links: [
            {
                name: String,
                url: String,
            },
        ],
        notes: {
            type: String,
            default: '',
        },
    },
    { _id: false }
); // Don't create _id for subdocuments

// Room Schema
const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        budget: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['Not Started', 'In Progress', 'Completed'],
            default: 'Not Started',
        },
        items: [itemSchema],
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

// Virtual property to calculate actual_spent
// For completed items, use actual_price if set, otherwise budget_price
roomSchema.virtual('actual_spent').get(function() {
    return this.items
        .filter(item => item.status === 'Completed')
        .reduce((sum, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const actualPrice = parseFloat(item.actual_price) || 0;
            const budgetPrice = parseFloat(item.budget_price) || 0;
            // Use actual_price if it's set and non-zero, otherwise use budget_price
            const price = actualPrice > 0 ? actualPrice : budgetPrice;
            return sum + (quantity * price);
        }, 0);
});

// Virtual property to calculate total_items
roomSchema.virtual('total_items').get(function() {
    return this.items.length;
});

// Virtual property to calculate completed_items
roomSchema.virtual('completed_items').get(function() {
    return this.items.filter(item => item.status === 'Completed').length;
});

// Virtual property to calculate progress_percent
roomSchema.virtual('progress_percent').get(function() {
    if (this.items.length === 0) return 0;
    return (this.completed_items / this.items.length) * 100;
});

// Ensure virtuals are included when converting to JSON/Object
roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

// Create model
const Room = mongoose.model('Room', roomSchema, 'rooms');

module.exports = Room;
