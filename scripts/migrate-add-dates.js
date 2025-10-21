#!/usr/bin/env node

/**
 * Database Migration: Add Date Fields to All Existing Items
 *
 * This script updates all existing room items to have proper date fields:
 * - createdDate: Set to today for all items
 * - completedDate: Set to today for items with status = 'Completed'
 * - date: Set to completedDate or createdDate for backwards compatibility
 */

const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');

async function migrateAddDates() {
    try {
        console.log('\n🔄 Starting date migration...\n');

        // Connect to database
        await connectDB();

        // Get all rooms
        const rooms = await Room.find({});
        console.log(`📦 Found ${rooms.length} rooms to process\n`);

        const today = new Date();
        let totalItems = 0;
        let updatedItems = 0;

        // Process each room
        for (const room of rooms) {
            if (room.items && room.items.length > 0) {
                console.log(`\n📂 Processing room: ${room.name} (${room.slug})`);
                console.log(`   Items: ${room.items.length}`);

                let roomUpdated = false;

                // Update each item
                room.items.forEach((item, index) => {
                    totalItems++;
                    let itemUpdated = false;

                    // Set createdDate if not present
                    if (!item.createdDate) {
                        item.createdDate = today;
                        itemUpdated = true;
                    }

                    // Set completedDate if status is Completed and no completedDate
                    if (item.status === 'Completed' && !item.completedDate) {
                        item.completedDate = today;
                        itemUpdated = true;
                    }

                    // Set legacy date field
                    if (!item.date) {
                        item.date = item.completedDate || item.createdDate || today;
                        itemUpdated = true;
                    }

                    if (itemUpdated) {
                        updatedItems++;
                        roomUpdated = true;
                        const status = item.status === 'Completed' ? '✅' : '⏳';
                        console.log(`   ${status} Updated: ${item.description.substring(0, 40)}...`);
                    }
                });

                // Save room if any items were updated
                if (roomUpdated) {
                    await room.save();
                    console.log(`   💾 Saved changes to ${room.name}`);
                }
            }
        }

        console.log(`\n\n✨ Migration Complete!`);
        console.log(`   Total items processed: ${totalItems}`);
        console.log(`   Items updated: ${updatedItems}`);
        console.log(`   Items already had dates: ${totalItems - updatedItems}\n`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateAddDates();
