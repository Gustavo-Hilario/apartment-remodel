#!/usr/bin/env node

/**
 * Verification Script: ID-based Expense Tracking
 *
 * This script verifies that the ID-based expense tracking system is working correctly.
 * It checks:
 * 1. All items have MongoDB _id
 * 2. Items can be found by _id
 * 3. No duplicate items exist
 */

const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');

async function verifyIDTracking() {
    try {
        console.log('\n🔍 Verifying ID-based Expense Tracking System...\n');

        await connectDB();

        const rooms = await Room.find({});

        let totalItems = 0;
        let itemsWithID = 0;
        let itemsWithoutID = 0;
        const itemDescriptions = new Map(); // description -> count

        console.log('📋 Checking all rooms for ID tracking:\n');

        for (const room of rooms) {
            console.log(`\n📦 ${room.name} (${room.slug})`);
            console.log(`   Items: ${room.items.length}`);

            for (const item of room.items) {
                totalItems++;

                if (item._id) {
                    itemsWithID++;

                    // Test that we can find the item by ID
                    const foundItem = room.items.id(item._id);
                    if (!foundItem) {
                        console.log(`   ❌ ERROR: Item has _id but can't be found by id(): ${item.description}`);
                    } else {
                        // Track duplicates
                        const key = item.description;
                        itemDescriptions.set(key, (itemDescriptions.get(key) || 0) + 1);
                    }
                } else {
                    itemsWithoutID++;
                    console.log(`   ❌ Item without _id: ${item.description}`);
                }
            }

            if (room.items.length > 0 && room.items.length <= 3) {
                // Show all items for small rooms
                room.items.forEach((item, idx) => {
                    console.log(`   ${idx + 1}. ${item.description.substring(0, 50)}... (_id: ${item._id})`);
                });
            }
        }

        // Check for duplicates
        console.log('\n\n🔍 Checking for duplicate descriptions:\n');
        let duplicateCount = 0;
        for (const [description, count] of itemDescriptions) {
            if (count > 1) {
                duplicateCount++;
                console.log(`   ⚠️  "${description.substring(0, 60)}..." appears ${count} times`);
            }
        }

        if (duplicateCount === 0) {
            console.log('   ✅ No duplicate descriptions found');
        }

        // Summary
        console.log('\n\n📊 Summary:\n');
        console.log(`   Total items:         ${totalItems}`);
        console.log(`   Items with _id:      ${itemsWithID} ✅`);
        console.log(`   Items without _id:   ${itemsWithoutID} ${itemsWithoutID > 0 ? '❌' : '✅'}`);
        console.log(`   Duplicate items:     ${duplicateCount} ${duplicateCount > 0 ? '⚠️' : '✅'}`);

        if (itemsWithID === totalItems && itemsWithoutID === 0) {
            console.log('\n✅ All items have MongoDB _id - ID tracking is working!\n');
        } else {
            console.log('\n❌ Some items are missing _id - Run migration script!\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyIDTracking();
