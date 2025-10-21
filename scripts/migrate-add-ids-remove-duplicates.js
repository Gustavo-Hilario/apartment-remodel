#!/usr/bin/env node

/**
 * Migration: Add IDs to Items and Remove Duplicates
 *
 * This script:
 * 1. Forces Mongoose to add _id to all existing items (by re-saving)
 * 2. Removes duplicate items from _general that exist in other rooms
 * 3. Keeps truly general items in _general
 */

const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');

async function migrateAddIDsAndRemoveDuplicates() {
    try {
        console.log('\n🔄 Starting migration: Add IDs and Remove Duplicates...\n');

        await connectDB();

        const rooms = await Room.find({});
        console.log(`📦 Found ${rooms.length} rooms to process\n`);

        // Step 1: Track all items by description in non-_general rooms
        const itemsInRooms = new Map(); // description -> { room, item }

        console.log('📝 Step 1: Scanning items in all rooms...\n');
        for (const room of rooms) {
            if (room.slug === '_general') continue; // Skip _general for now

            console.log(`   Scanning ${room.name} (${room.slug}): ${room.items.length} items`);

            for (const item of room.items) {
                const key = item.description;
                if (!itemsInRooms.has(key)) {
                    itemsInRooms.set(key, []);
                }
                itemsInRooms.get(key).push({
                    room: room.slug,
                    item: item
                });
            }
        }

        // Step 2: Add IDs to all items in non-_general rooms (by re-saving)
        console.log('\n\n🆔 Step 2: Adding MongoDB _id to all items...\n');
        let itemsUpdated = 0;

        for (const room of rooms) {
            if (room.slug === '_general') continue;

            if (room.items.length > 0) {
                // Force Mongoose to add _id by re-saving
                console.log(`   Processing ${room.name}: ${room.items.length} items`);
                await room.save();
                itemsUpdated += room.items.length;
            }
        }

        console.log(`\n   ✅ Added IDs to ${itemsUpdated} items in regular rooms\n`);

        // Step 3: Clean up _general room
        console.log('\n🧹 Step 3: Cleaning up _general room...\n');

        const generalRoom = await Room.findOne({ slug: '_general' });
        if (!generalRoom) {
            console.log('   ⚠️  No _general room found. Skipping cleanup.');
            console.log('\n✨ Migration Complete!\n');
            process.exit(0);
            return;
        }

        console.log(`   _general room has ${generalRoom.items.length} items`);

        const itemsToKeep = [];
        const itemsToRemove = [];

        for (const item of generalRoom.items) {
            const key = item.description;

            // Check if this item exists in any other room
            if (itemsInRooms.has(key)) {
                // Duplicate - remove from _general
                itemsToRemove.push(item.description);
            } else {
                // Truly general item - keep it
                itemsToKeep.push(item);
            }
        }

        console.log(`\n   Items to keep in _general: ${itemsToKeep.length}`);
        console.log(`   Duplicates to remove: ${itemsToRemove.length}\n`);

        if (itemsToRemove.length > 0) {
            console.log('   Removing duplicates:');
            itemsToRemove.forEach((desc, index) => {
                console.log(`   ${index + 1}. ${desc.substring(0, 60)}...`);
            });
        }

        // Update _general room with only unique items
        generalRoom.items = itemsToKeep;
        await generalRoom.save();

        console.log(`\n   ✅ _general room cleaned. Now has ${generalRoom.items.length} unique items\n`);

        // Step 4: Summary
        console.log('\n📊 Migration Summary:');
        console.log(`   - Added _id to ${itemsUpdated} items`);
        console.log(`   - Removed ${itemsToRemove.length} duplicates from _general`);
        console.log(`   - Kept ${itemsToKeep.length} truly general items\n`);

        console.log('✨ Migration Complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateAddIDsAndRemoveDuplicates();
