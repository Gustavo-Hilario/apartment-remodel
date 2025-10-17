#!/usr/bin/env node

/**
 * Clean up duplicate items from individual rooms
 *
 * Removes items from regular rooms that are now stored as shared expenses
 * in the _general room. These duplicates were created during the migration
 * from the old expenses collection.
 */

const mongoose = require('mongoose');
const Room = require('../db/models/Room');
const { connectDB } = require('../db/mongoose-connection');

async function cleanupDuplicateItems() {
    try {
        await connectDB();

        console.log('\n🧹 Cleaning up duplicate items from individual rooms...\n');

        // Get all rooms
        const rooms = await Room.find({});

        // Get _general room and build set of shared expense descriptions
        const generalRoom = rooms.find(r => r.slug === '_general');
        if (!generalRoom) {
            console.error('❌ _general room not found!');
            process.exit(1);
        }

        const sharedExpenseDescriptions = new Set();
        generalRoom.items.forEach((item) => {
            if (item.isSharedExpense) {
                sharedExpenseDescriptions.add(item.description);
                console.log(`📌 Shared expense: "${item.description}"`);
            }
        });

        console.log(`\n🔍 Found ${sharedExpenseDescriptions.size} shared expenses in _general\n`);

        // Process each regular room
        let totalRemoved = 0;
        const regularRooms = rooms.filter(r => r.slug !== '_general');

        for (const room of regularRooms) {
            const initialCount = room.items.length;
            let removedFromRoom = 0;

            // Filter out items that match shared expense descriptions
            const itemsToRemove = [];
            room.items.forEach((item, index) => {
                if (sharedExpenseDescriptions.has(item.description)) {
                    itemsToRemove.push({
                        index,
                        description: item.description,
                        amount: item.actual_price || item.subtotal
                    });
                }
            });

            if (itemsToRemove.length > 0) {
                console.log(`\n📂 ${room.name} (${room.slug}):`);
                itemsToRemove.forEach(item => {
                    console.log(`   ❌ Removing: "${item.description}" (S/ ${item.amount})`);
                });

                // Remove items (reverse order to maintain indices)
                itemsToRemove.reverse().forEach(item => {
                    room.items.splice(item.index, 1);
                    removedFromRoom++;
                });

                await room.save();
                totalRemoved += removedFromRoom;

                console.log(`   ✅ Removed ${removedFromRoom} duplicate(s) from ${room.name}`);
                console.log(`   📊 Items: ${initialCount} → ${room.items.length}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Cleanup completed!');
        console.log(`   🗑️  Total duplicates removed: ${totalRemoved}`);
        console.log(`   📁 Rooms processed: ${regularRooms.length}`);
        console.log('='.repeat(60) + '\n');

        if (totalRemoved === 0) {
            console.log('💡 No duplicates found. Database is already clean!\n');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning up duplicates:', error);
        process.exit(1);
    }
}

cleanupDuplicateItems();
