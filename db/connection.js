const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'apartment_remodel';

let db = null;

async function connectDB() {
    if (db) return db;

    const client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');

    return db;
}

async function getCollection(collectionName) {
    const database = await connectDB();
    return database.collection(collectionName);
}

module.exports = { connectDB, getCollection };
