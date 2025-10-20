/**
 * Database Sync: Local Development to Cloud
 *
 * Copies all data from the local development database (apartment_remodel_dev) to
 * the cloud database (apartment_remodel).
 *
 * This is useful when you want to push your local development data to production.
 *
 * Usage: node scripts/dbsync-local-to-cloud.js
 * Or: npm run dbsync:local-to-cloud
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

// Load environment URLs
function loadDatabaseURLs() {
    const envPath = path.resolve(process.cwd(), '.env');
    const envLocalPath = path.resolve(process.cwd(), '.env.local');

    let cloudURL, localURL;

    // Load cloud URL from .env
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        cloudURL = process.env.MONGO_URL;
    }

    // Load local URL from .env.local
    if (fs.existsSync(envLocalPath)) {
        // Clear previous dotenv config to avoid conflicts
        delete process.env.MONGO_URL;
        require('dotenv').config({ path: envLocalPath });
        localURL = process.env.MONGO_URL;
    }

    if (!cloudURL) {
        throw new Error('MONGO_URL not found in .env file');
    }
    if (!localURL) {
        throw new Error('MONGO_URL not found in .env.local file');
    }

    return { cloudURL, localURL };
}

async function syncLocalToCloud() {
    let localConnection;
    let cloudConnection;

    try {
        // Get database URLs
        const { cloudURL, localURL } = loadDatabaseURLs();

        // Determine database names from URLs
        const cloudDBName = cloudURL.split('/').pop().split('?')[0];
        const localDBName = localURL.split('/').pop().split('?')[0];

        console.log('\n🏠 → ☁️  LOCAL TO CLOUD SYNC');
        console.log('═'.repeat(60));
        console.log(`🏠 Local Database: ${localDBName}`);
        console.log(`☁️  Cloud Database: ${cloudDBName}`);
        console.log('═'.repeat(60));
        console.log(
            '\n⚠️  WARNING: This will OVERWRITE all data in your CLOUD/PRODUCTION database!'
        );
        console.log('   This operation should be used with extreme caution!\n');

        const answer = await question(
            'Type "SYNC TO CLOUD" to confirm, or anything else to cancel: '
        );

        if (answer.trim().toUpperCase() !== 'SYNC TO CLOUD') {
            console.log('\n❌ Sync cancelled.\n');
            rl.close();
            process.exit(0);
        }

        console.log('\n🔌 Connecting to local database...');
        localConnection = await mongoose.createConnection(localURL).asPromise();
        console.log('✅ Connected to local database');

        console.log('🔌 Connecting to cloud database...');
        cloudConnection = await mongoose.createConnection(cloudURL).asPromise();
        console.log('✅ Connected to cloud database\n');

        // Explicitly use the correct databases
        const localDB = localConnection.useDb(localDBName).db;
        const cloudDB = cloudConnection.useDb(cloudDBName).db;

        // Get all collections from local
        const collections = await localDB.listCollections().toArray();
        const collectionNames = collections.map((c) => c.name);

        if (collectionNames.length === 0) {
            console.log('⚠️  Local database is empty. Nothing to sync.');
            await localConnection.close();
            await cloudConnection.close();
            rl.close();
            process.exit(0);
        }

        console.log(
            `📋 Found ${collectionNames.length} collections in local database:`
        );
        collectionNames.forEach((name) => console.log(`   - ${name}`));
        console.log('\n🔄 Starting sync...\n');

        // Drop all existing collections in cloud database
        const existingCloudCollections = await cloudDB
            .listCollections()
            .toArray();
        for (const col of existingCloudCollections) {
            console.log(`🗑️  Dropping cloud collection: ${col.name}`);
            await cloudDB
                .collection(col.name)
                .drop()
                .catch(() => {});
        }

        console.log('');

        // Copy each collection from local to cloud
        let totalDocuments = 0;
        for (const collectionName of collectionNames) {
            const localCollection = localDB.collection(collectionName);
            const cloudCollection = cloudDB.collection(collectionName);

            // Get all documents from local
            const documents = await localCollection.find({}).toArray();

            if (documents.length > 0) {
                // Insert into cloud
                await cloudCollection.insertMany(documents);
                totalDocuments += documents.length;
                console.log(
                    `✅ Copied ${documents.length} documents from ${collectionName}`
                );
            } else {
                console.log(`⏭️  Skipped empty collection: ${collectionName}`);
            }

            // Copy indexes
            const indexes = await localCollection.indexes();
            if (indexes.length > 1) {
                // More than just _id index
                for (const index of indexes) {
                    if (index.name !== '_id_') {
                        try {
                            await cloudCollection.createIndex(index.key, {
                                name: index.name,
                                ...index,
                            });
                        } catch (err) {
                            // Index might already exist, ignore
                        }
                    }
                }
            }
        }

        console.log('\n✅ Sync completed successfully!');
        console.log(`📊 Total collections: ${collectionNames.length}`);
        console.log(`📄 Total documents: ${totalDocuments}`);
        console.log(`☁️  Cloud database: ${cloudDBName}\n`);

        await localConnection.close();
        await cloudConnection.close();
        rl.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n⚠️  Could not connect to local MongoDB.');
            console.error('   Make sure MongoDB is running:');
            console.error('   - macOS: brew services start mongodb-community');
            console.error('   - Or run: mongod\n');
        }

        if (localConnection) await localConnection.close();
        if (cloudConnection) await cloudConnection.close();
        rl.close();
        process.exit(1);
    }
}

// Run sync
syncLocalToCloud();
