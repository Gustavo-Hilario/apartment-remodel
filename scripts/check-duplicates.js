#!/usr/bin/env node

const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');

async function checkDuplicates() {
    try {
        await connectDB();

        console.log('\n🔍 Checking for duplicate items across all rooms...\n');

        const rooms = await Room.find({});

        // Track all items by description
        const itemsByDescription = {};

        for (const room of rooms) {
            console.log(`📦 Room: ${room.name} (${room.slug})`);
            console.log(`   Items count: ${room.items.length}`);

            if (room.items.length > 0) {
                room.items.forEach((item, index) => {
                    const key = item.description;

                    if (!itemsByDescription[key]) {
                        itemsByDescription[key] = [];
                    }

                    itemsByDescription[key].push({
                        room: room.slug,
                        index: index,
                        _id: item._id,
                        status: item.status,
                        amount: item.actual_price || item.budget_price
                    });

                    if (index < 3) {
                        console.log(`   ${index + 1}. ${item.description.substring(0, 50)}... (${item.status})`);
                        console.log(`      _id: ${item._id || 'NO ID'}`);
                    }
                });

                if (room.items.length > 3) {
                    console.log(`   ... and ${room.items.length - 3} more items`);
                }
            }
            console.log('');
        }

        // Find duplicates
        console.log('\n⚠️  DUPLICATE ITEMS FOUND:\n');
        let duplicateCount = 0;

        for (const [description, locations] of Object.entries(itemsByDescription)) {
            if (locations.length > 1) {
                duplicateCount++;
                console.log(`${duplicateCount}. "${description.substring(0, 60)}..."`);
                console.log(`   Found in ${locations.length} places:`);
                locations.forEach(loc => {
                    console.log(`   - Room: ${loc.room}, _id: ${loc._id || 'NO ID'}, Status: ${loc.status}, Amount: ${loc.amount}`);
                });
                console.log('');
            }
        }

        if (duplicateCount === 0) {
            console.log('   ✅ No duplicates found!');
        } else {
            console.log(`\n📊 Total duplicate items: ${duplicateCount}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDuplicates();
