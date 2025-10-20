/**
 * Database Restore Script
 *
 * Restores data from the backup database to the main database.
 * This will OVERWRITE all data in the main database with the backup data.
 *
 * Usage: node scripts/restore-from-backup.js
 * Or: npm run restore
 *
 * IMPORTANT: This operation cannot be undone!
 */

const { connectDB, mongoose } = require('../db/mongoose-connection');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function restoreDatabase() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Get current database name
        const currentDB = mongoose.connection.db;
        const currentDBName = currentDB.databaseName;
        const backupDBName = `${currentDBName}_backup`;

        console.log('\n⚠️  DATABASE RESTORE');
        console.log('═'.repeat(50));
        console.log(`📊 Source (Backup): ${backupDBName}`);
        console.log(`💾 Destination (Main): ${currentDBName}`);
        console.log('═'.repeat(50));
        console.log('\n⚠️  WARNING: This will OVERWRITE all data in your main database!');
        console.log('   This operation CANNOT be undone!\n');

        const answer = await question('Type "RESTORE" to confirm, or anything else to cancel: ');

        if (answer.trim().toUpperCase() !== 'RESTORE') {
            console.log('\n❌ Restore cancelled.\n');
            process.exit(0);
        }

        // Get backup database connection
        const backupDB = mongoose.connection.client.db(backupDBName);

        // Check if backup exists
        const backupCollections = await backupDB.listCollections().toArray();
        if (backupCollections.length === 0) {
            console.log(`\n❌ Error: Backup database "${backupDBName}" is empty or doesn't exist.`);
            console.log('   Create a backup first using: npm run backup\n');
            process.exit(1);
        }

        const collectionNames = backupCollections.map(c => c.name);

        console.log(`\n📋 Found ${collectionNames.length} collections in backup:`);
        collectionNames.forEach(name => console.log(`   - ${name}`));
        console.log('\n🔄 Starting restore...\n');

        // Drop all existing collections in main database
        const existingCollections = await currentDB.listCollections().toArray();
        for (const col of existingCollections) {
            console.log(`🗑️  Dropping main database collection: ${col.name}`);
            await currentDB.collection(col.name).drop().catch(() => {});
        }

        console.log('');

        // Copy each collection from backup to main
        let totalDocuments = 0;
        for (const collectionName of collectionNames) {
            const backupCollection = backupDB.collection(collectionName);
            const mainCollection = currentDB.collection(collectionName);

            // Get all documents from backup
            const documents = await backupCollection.find({}).toArray();

            if (documents.length > 0) {
                // Insert into main database
                await mainCollection.insertMany(documents);
                totalDocuments += documents.length;
                console.log(`✅ Restored ${documents.length} documents to ${collectionName}`);
            } else {
                console.log(`⏭️  Skipped empty collection: ${collectionName}`);
            }

            // Copy indexes
            const indexes = await backupCollection.indexes();
            if (indexes.length > 1) { // More than just _id index
                for (const index of indexes) {
                    if (index.name !== '_id_') {
                        try {
                            await mainCollection.createIndex(
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

        console.log('\n✅ Restore completed successfully!');
        console.log(`📊 Total collections: ${collectionNames.length}`);
        console.log(`📄 Total documents: ${totalDocuments}`);
        console.log(`💾 Restored to: ${currentDBName}\n`);

        rl.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Restore failed:', error);
        rl.close();
        process.exit(1);
    }
}

// Run restore
restoreDatabase();
