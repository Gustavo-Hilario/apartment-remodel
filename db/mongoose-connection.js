const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
// Priority: .env.local > .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath });
    console.log('📄 Loaded environment from .env.local (development mode)');
} else if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('📄 Loaded environment from .env (production mode)');
}

const MONGO_URL =
    process.env.MONGO_URL || 'mongodb://localhost:27017/apartment_remodel';

// Determine if using local or cloud database
const isLocalDB = MONGO_URL.includes('localhost') || MONGO_URL.includes('127.0.0.1');
const dbName = MONGO_URL.split('/').pop().split('?')[0];

let isConnected = false;

async function connectDB() {
    if (isConnected) {
        return mongoose.connection;
    }

    try {
        console.log(`\n🔌 Connecting to ${isLocalDB ? '🏠 LOCAL' : '☁️  CLOUD'} MongoDB...`);
        console.log(`📊 Database: ${dbName}`);

        await mongoose.connect(MONGO_URL);
        isConnected = true;

        console.log(`✅ Connected to ${isLocalDB ? 'LOCAL' : 'CLOUD'} MongoDB with Mongoose`);
        console.log(`   Database: ${dbName}\n`);

        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);

        if (isLocalDB) {
            console.error('\n⚠️  LOCAL MongoDB connection failed!');
            console.error('   Make sure MongoDB is running locally:');
            console.error('   - macOS: brew services start mongodb-community');
            console.error('   - Or run: mongod\n');
        }

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

async function disconnectDB() {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error);
        throw error;
    }
}

module.exports = { connectDB, disconnectDB, mongoose };
