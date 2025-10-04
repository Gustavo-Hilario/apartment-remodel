const { connectDB, getCollection } = require('../db/connection');

/**
 * Migration script to add product fields to all room items
 * Adds: favorite, imageUrl, links, notes
 */
async function migrateAddProductFields() {
    try {
        console.log('🚀 Starting migration to add product fields...\n');

        await connectDB();
        const roomsCollection = await getCollection('rooms');

        // Get all rooms
        const rooms = await roomsCollection.find({}).toArray();
        console.log(`📊 Found ${rooms.length} rooms to update\n`);

        let totalItemsUpdated = 0;

        for (const room of rooms) {
            console.log(`\n🏠 Processing room: ${room.name} (${room.slug})`);
            console.log(`   Items in room: ${room.items.length}`);

            // Update each item to include the new fields if they don't exist
            const updatedItems = room.items.map(item => ({
                ...item,
                favorite: item.favorite !== undefined ? item.favorite : false,
                imageUrl: item.imageUrl || '',
                links: item.links || [],
                notes: item.notes || ''
            }));

            // Update the room with the new items
            const result = await roomsCollection.updateOne(
                { _id: room._id },
                { 
                    $set: { 
                        items: updatedItems,
                        updated_at: new Date()
                    } 
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`   ✅ Updated ${room.items.length} items`);
                totalItemsUpdated += room.items.length;
            } else {
                console.log(`   ⚪ No changes needed`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Migration completed successfully!`);
        console.log(`📊 Total rooms processed: ${rooms.length}`);
        console.log(`📝 Total items updated: ${totalItemsUpdated}`);
        console.log('='.repeat(60) + '\n');

        console.log('New fields added to all items:');
        console.log('  - favorite: false (boolean)');
        console.log('  - imageUrl: "" (string)');
        console.log('  - links: [] (array)');
        console.log('  - notes: "" (string)\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateAddProductFields();
