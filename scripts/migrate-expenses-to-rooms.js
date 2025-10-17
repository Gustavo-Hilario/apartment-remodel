#!/usr/bin/env node

/**
 * Migrate Expenses to Room Items
 * 
 * Converts all existing expenses from the Expense collection to items in rooms
 * - Single-room expenses → added to specific room
 * - Multi-room expenses → added to _general with roomAllocations
 * - General expenses (no rooms) → added to _general
 */

const mongoose = require('mongoose');
const Room = require('../db/models/Room');
const Expense = require('../db/models/Expense');
const { connectDB } = require('../db/mongoose-connection');

async function migrateExpensesToRooms() {
    try {
        await connectDB();
        
        console.log('\n🔄 Migrating expenses to room items...\n');
        
        // Get all expenses
        const expenses = await Expense.find({});
        console.log(`📦 Found ${expenses.length} expenses to migrate\n`);
        
        // Get _general room
        const generalRoom = await Room.findOne({ slug: '_general' });
        if (!generalRoom) {
            console.error('❌ _general room not found! Run init-general-room.js first.');
            process.exit(1);
        }
        
        let migratedToRooms = 0;
        let migratedToGeneral = 0;
        let migratedAsShared = 0;
        let skipped = 0;
        
        for (const expense of expenses) {
            const rooms = expense.rooms || [];
            const description = expense.description;
            const amount = parseFloat(expense.amount) || 0;
            const category = expense.category;
            const status = expense.status || 'Completed';
            
            console.log(`\n📝 Processing: "${description}"`);
            console.log(`   Amount: S/ ${amount.toFixed(2)}`);
            console.log(`   Rooms: ${rooms.length > 0 ? rooms.join(', ') : 'General'}`);
            
            // Case 1: No rooms (general expense)
            if (rooms.length === 0) {
                generalRoom.items.push({
                    description,
                    category,
                    quantity: 1,
                    unit: 'unit',
                    budget_price: 0,
                    actual_price: amount,
                    subtotal: amount,
                    status,
                    isSharedExpense: false,
                    roomAllocations: [],
                    totalAmount: amount
                });
                migratedToGeneral++;
                console.log(`   ✅ Added to _general as general expense`);
            }
            // Case 2: Single room
            else if (rooms.length === 1) {
                const roomSlug = rooms[0];
                const targetRoom = await Room.findOne({ slug: roomSlug });
                
                if (targetRoom) {
                    targetRoom.items.push({
                        description,
                        category,
                        quantity: 1,
                        unit: 'unit',
                        budget_price: 0,
                        actual_price: amount,
                        subtotal: amount,
                        status,
                        isSharedExpense: false,
                        roomAllocations: [],
                        totalAmount: amount
                    });
                    await targetRoom.save();
                    migratedToRooms++;
                    console.log(`   ✅ Added to ${targetRoom.name}`);
                } else {
                    console.log(`   ⚠️  Room "${roomSlug}" not found, adding to _general instead`);
                    generalRoom.items.push({
                        description,
                        category,
                        quantity: 1,
                        unit: 'unit',
                        budget_price: 0,
                        actual_price: amount,
                        subtotal: amount,
                        status,
                        isSharedExpense: false,
                        roomAllocations: [],
                        totalAmount: amount
                    });
                    migratedToGeneral++;
                }
            }
            // Case 3: Multiple rooms (shared expense)
            else {
                // Split equally by default
                const amountPerRoom = amount / rooms.length;
                const percentagePerRoom = 100 / rooms.length;
                
                const roomAllocations = rooms.map(roomSlug => ({
                    room: roomSlug,
                    amount: amountPerRoom,
                    percentage: percentagePerRoom
                }));
                
                generalRoom.items.push({
                    description,
                    category,
                    quantity: 1,
                    unit: 'unit',
                    budget_price: 0,
                    actual_price: 0, // Shared expenses don't use actual_price
                    subtotal: 0,
                    status,
                    isSharedExpense: true,
                    roomAllocations,
                    totalAmount: amount
                });
                migratedAsShared++;
                console.log(`   ✅ Added to _general as shared expense`);
                console.log(`   💰 Allocated: S/ ${amountPerRoom.toFixed(2)} to each of ${rooms.length} rooms`);
            }
        }
        
        // Save _general room with all new items
        await generalRoom.save();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration completed!');
        console.log(`   📦 Migrated to specific rooms: ${migratedToRooms}`);
        console.log(`   📦 Migrated to _general: ${migratedToGeneral}`);
        console.log(`   📦 Migrated as shared: ${migratedAsShared}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   📊 Total: ${migratedToRooms + migratedToGeneral + migratedAsShared + skipped}`);
        console.log('='.repeat(60) + '\n');
        
        console.log('💡 Next steps:');
        console.log('   1. Review the migrated data in your database');
        console.log('   2. Test the API endpoints');
        console.log('   3. When satisfied, you can drop the expenses collection');
        console.log('');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error migrating expenses:', error);
        process.exit(1);
    }
}

migrateExpensesToRooms();
