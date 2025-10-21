const mongoose = require('mongoose');

/**
 * User Model
 *
 * Represents a user account with authentication and authorization
 */

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name must be less than 100 characters'],
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            lowercase: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username must be less than 30 characters'],
            match: [
                /^[a-z0-9_-]+$/,
                'Username can only contain lowercase letters, numbers, dashes, and underscores',
            ],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email address',
            ],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: ['admin', 'user'],
            default: 'user',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
        toJSON: {
            transform: function (doc, ret) {
                // Remove password from JSON responses (except when explicitly needed)
                delete ret.password;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Indexes for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Virtual for full user info (for display)
userSchema.virtual('displayName').get(function () {
    return this.name;
});

// Method to check if user is admin
userSchema.methods.isAdmin = function () {
    return this.role === 'admin';
};

// Static method to find active users
userSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};

// Pre-save hook to update lastLogin could be added here if needed

const User = mongoose.model('User', userSchema);

module.exports = User;
