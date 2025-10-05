const mongoose = require('mongoose');

const MONGO_URL =
    process.env.MONGO_URL || 'mongodb://localhost:27017/apartment_remodel';

let isConnected = false;

async function connectDB() {
    if (isConnected) {
        return mongoose.connection;
    }

    try {
        await mongoose.connect(MONGO_URL);
        isConnected = true;
        console.log('✅ Connected to MongoDB with Mongoose');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
    isConnected = false;
});

module.exports = { connectDB, mongoose };
