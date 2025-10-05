const mongoose = require('mongoose');

// Item Schema - for items within a room
const itemSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: true,
            default: '',
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
        actual_spent: {
            type: Number,
            default: 0,
        },
        progress_percent: {
            type: Number,
            default: 0,
        },
        completed_items: {
            type: Number,
            default: 0,
        },
        total_items: {
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

// Create model
const Room = mongoose.model('Room', roomSchema, 'rooms');

module.exports = Room;
