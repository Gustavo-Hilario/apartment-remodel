/**
 * Database Backup Script
 *
 * Creates a complete backup by copying all collections from the main database
 * to a backup database. The backup database will be named:
 * - apartment_remodel_backup (for production)
 * - apartment_remodel_dev_backup (for development)
 *
 * Usage: node scripts/backup-database.js
 * Or: npm run backup
 */

const { connectDB, mongoose } = require('../db/mongoose-connection');

async function backupDatabase() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Get current database name
        const currentDB = mongoose.connection.db;
        const currentDBName = currentDB.databaseName;
        const backupDBName = `${currentDBName}_backup`;

        console.log('\n🔄 Starting Database Backup...');
        console.log(`📊 Source: ${currentDBName}`);
        console.log(`💾 Destination: ${backupDBName}\n`);

        // Get backup database connection
        const backupDB = mongoose.connection.client.db(backupDBName);

        // Get all collection names from source
        const collections = await currentDB.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.length === 0) {
            console.log('⚠️  Source database is empty. Nothing to backup.');
            process.exit(0);
        }

        console.log(`📋 Found ${collectionNames.length} collections to backup:`);
        collectionNames.forEach(name => console.log(`   - ${name}`));
        console.log('');

        // Drop all existing collections in backup database
        const existingBackupCollections = await backupDB.listCollections().toArray();
        for (const col of existingBackupCollections) {
            console.log(`🗑️  Dropping old backup collection: ${col.name}`);
            await backupDB.collection(col.name).drop().catch(() => {});
        }

        console.log('');

        // Copy each collection
        let totalDocuments = 0;
        for (const collectionName of collectionNames) {
            const sourceCollection = currentDB.collection(collectionName);
            const backupCollection = backupDB.collection(collectionName);

            // Get all documents from source
            const documents = await sourceCollection.find({}).toArray();

            if (documents.length > 0) {
                // Insert into backup
                await backupCollection.insertMany(documents);
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
                            await backupCollection.createIndex(
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

        console.log('\n✅ Backup completed successfully!');
        console.log(`📊 Total collections: ${collectionNames.length}`);
        console.log(`📄 Total documents: ${totalDocuments}`);
        console.log(`💾 Backup database: ${backupDBName}\n`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Backup failed:', error);
        process.exit(1);
    }
}

// Run backup
backupDatabase();
