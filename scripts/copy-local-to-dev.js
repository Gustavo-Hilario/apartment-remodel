/**
 * Copy Local Database to Development Database
 *
 * Copies all data from apartment_remodel to apartment_remodel_dev
 * Both databases are on your local MongoDB instance.
 *
 * Usage: node scripts/copy-local-to-dev.js
 * Or: npm run copy:local-to-dev
 */

const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function copyLocalToDev() {
    const sourceDB = 'apartment_remodel';
    const targetDB = 'apartment_remodel_dev';
    const mongoURL = 'mongodb://localhost:27017';

    let sourceConnection;
    let targetConnection;

    try {
        console.log('\n📋 COPY LOCAL DATABASE TO DEV');
        console.log('═'.repeat(60));
        console.log(`📊 Source: ${sourceDB}`);
        console.log(`💾 Target: ${targetDB}`);
        console.log('═'.repeat(60));
        console.log('\n⚠️  This will OVERWRITE all data in apartment_remodel_dev!\n');

        const answer = await question('Type "COPY" to confirm, or anything else to cancel: ');

        if (answer.trim().toUpperCase() !== 'COPY') {
            console.log('\n❌ Copy cancelled.\n');
            rl.close();
            process.exit(0);
        }

        console.log('\n🔌 Connecting to local MongoDB...');
        sourceConnection = await mongoose.createConnection(`${mongoURL}/${sourceDB}`).asPromise();
        targetConnection = await mongoose.createConnection(`${mongoURL}/${targetDB}`).asPromise();
        console.log('✅ Connected to MongoDB\n');

        const source = sourceConnection.db;
        const target = targetConnection.db;

        // Get all collections from source
        const collections = await source.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.length === 0) {
            console.log('⚠️  Source database is empty. Nothing to copy.');
            await sourceConnection.close();
            await targetConnection.close();
            rl.close();
            process.exit(0);
        }

        console.log(`📋 Found ${collectionNames.length} collections:`);
        collectionNames.forEach(name => console.log(`   - ${name}`));
        console.log('\n🔄 Starting copy...\n');

        // Drop all existing collections in target database
        const existingTargetCollections = await target.listCollections().toArray();
        for (const col of existingTargetCollections) {
            console.log(`🗑️  Dropping target collection: ${col.name}`);
            await target.collection(col.name).drop().catch(() => {});
        }

        console.log('');

        // Copy each collection
        let totalDocuments = 0;
        for (const collectionName of collectionNames) {
            const sourceCollection = source.collection(collectionName);
            const targetCollection = target.collection(collectionName);

            // Get all documents from source
            const documents = await sourceCollection.find({}).toArray();

            if (documents.length > 0) {
                // Insert into target
                await targetCollection.insertMany(documents);
                totalDocuments += documents.length;
                console.log(`✅ Copied ${documents.length} documents from ${collectionName}`);
            } else {
                console.log(`⏭️  Skipped empty collection: ${collectionName}`);
            }

            // Copy indexes
            const indexes = await sourceCollection.indexes();
            if (indexes.length > 1) { // More than just _id index
                for (const index of indexes) {
                    if (index.name !== '_id_') {
                        try {
                            await targetCollection.createIndex(
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

        console.log('\n✅ Copy completed successfully!');
        console.log(`📊 Total collections: ${collectionNames.length}`);
        console.log(`📄 Total documents: ${totalDocuments}`);
        console.log(`💾 Target database: ${targetDB}\n`);

        await sourceConnection.close();
        await targetConnection.close();
        rl.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Copy failed:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n⚠️  Could not connect to local MongoDB.');
            console.error('   Make sure MongoDB is running:');
            console.error('   - macOS: brew services start mongodb-community');
            console.error('   - Or run: mongod\n');
        }

        if (sourceConnection) await sourceConnection.close();
        if (targetConnection) await targetConnection.close();
        rl.close();
        process.exit(1);
    }
}

// Run copy
copyLocalToDev();
