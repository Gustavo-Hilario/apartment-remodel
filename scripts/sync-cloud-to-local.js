/**
 * Sync Cloud Database to Local Development
 *
 * Copies all data from the cloud database (apartment_remodel) to
 * local development database (apartment_remodel_dev).
 *
 * This is useful when you want to work with production data locally.
 *
 * Usage: node scripts/sync-cloud-to-local.js
 * Or: npm run sync:cloud-to-local
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Load cloud database URL from .env
function loadCloudURL() {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        return process.env.MONGO_URL;
    }
    throw new Error('.env file not found');
}

async function syncCloudToLocal() {
    let cloudConnection;
    let localConnection;

    try {
        // Get cloud database URL
        const cloudURL = loadCloudURL();
        if (!cloudURL) {
            throw new Error('MONGO_URL not found in .env file');
        }

        // Determine local database name
        const cloudDBName = cloudURL.split('/').pop().split('?')[0];
        const localDBName = `${cloudDBName}_dev`;
        const localURL = `mongodb://localhost:27017/${localDBName}`;

        console.log('\n☁️  → 🏠  CLOUD TO LOCAL SYNC');
        console.log('═'.repeat(60));
        console.log(`☁️  Cloud Database: ${cloudDBName}`);
        console.log(`🏠 Local Database: ${localDBName}`);
        console.log('═'.repeat(60));
        console.log('\n⚠️  This will OVERWRITE all data in your local development database!');
        console.log('   Make sure local MongoDB is running.\n');

        const answer = await question('Type "SYNC" to confirm, or anything else to cancel: ');

        if (answer.trim().toUpperCase() !== 'SYNC') {
            console.log('\n❌ Sync cancelled.\n');
            process.exit(0);
        }

        console.log('\n🔌 Connecting to cloud database...');
        cloudConnection = await mongoose.createConnection(cloudURL).asPromise();
        console.log('✅ Connected to cloud database');

        console.log('🔌 Connecting to local database...');
        localConnection = await mongoose.createConnection(localURL).asPromise();
        console.log('✅ Connected to local database\n');

        const cloudDB = cloudConnection.db;
        const localDB = localConnection.db;

        // Get all collections from cloud
        const collections = await cloudDB.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.length === 0) {
            console.log('⚠️  Cloud database is empty. Nothing to sync.');
            await cloudConnection.close();
            await localConnection.close();
            rl.close();
            process.exit(0);
        }

        console.log(`📋 Found ${collectionNames.length} collections in cloud:`);
        collectionNames.forEach(name => console.log(`   - ${name}`));
        console.log('\n🔄 Starting sync...\n');

        // Drop all existing collections in local database
        const existingLocalCollections = await localDB.listCollections().toArray();
        for (const col of existingLocalCollections) {
            console.log(`🗑️  Dropping local collection: ${col.name}`);
            await localDB.collection(col.name).drop().catch(() => {});
        }

        console.log('');

        // Copy each collection from cloud to local
        let totalDocuments = 0;
        for (const collectionName of collectionNames) {
            const cloudCollection = cloudDB.collection(collectionName);
            const localCollection = localDB.collection(collectionName);

            // Get all documents from cloud
            const documents = await cloudCollection.find({}).toArray();

            if (documents.length > 0) {
                // Insert into local
                await localCollection.insertMany(documents);
                totalDocuments += documents.length;
                console.log(`✅ Copied ${documents.length} documents from ${collectionName}`);
            } else {
                console.log(`⏭️  Skipped empty collection: ${collectionName}`);
            }

            // Copy indexes
            const indexes = await cloudCollection.indexes();
            if (indexes.length > 1) { // More than just _id index
                for (const index of indexes) {
                    if (index.name !== '_id_') {
                        try {
                            await localCollection.createIndex(
                                index.key,
                                { name: index.name, ...index }
                            );
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
        console.log(`🏠 Local database: ${localDBName}\n`);

        await cloudConnection.close();
        await localConnection.close();
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

        if (cloudConnection) await cloudConnection.close();
        if (localConnection) await localConnection.close();
        rl.close();
        process.exit(1);
    }
}

// Run sync
syncCloudToLocal();
