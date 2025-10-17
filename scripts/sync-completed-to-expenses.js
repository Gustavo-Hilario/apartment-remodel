#!/usr/bin/env node

/**
 * Sync Script: Completed Products to Expenses
 * 
 * This script syncs all completed products from rooms to the expenses collection
 */

const mongoose = require('mongoose');
const Room = require('../db/models/Room');
const Expense = require('../db/models/Expense');
const { connectDB } = require('../db/mongoose-connection');

async function syncCompletedToExpenses() {
    try {
        await connectDB();
        
        console.log('\n🔄 Syncing completed products to expenses...\n');
        
        const rooms = await Room.find({});
        let syncedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const room of rooms) {
            console.log(`\n📍 Processing ${room.name} (${room.slug})...`);
            
            for (let i = 0; i < room.items.length; i++) {
                const item = room.items[i];
                
                if (item.status === 'Completed') {
                    // Check if this item already has a linked expense
                    const existingExpense = await Expense.findOne({
                        productRoom: room.slug,
                        productIndex: i,
                        isFromProduct: true
                    });

                    const itemTotal = (parseFloat(item.actual_price) || parseFloat(item.budget_price) || 0) * (parseFloat(item.quantity) || 1);

                    if (existingExpense) {
                        // Update existing expense
                        existingExpense.description = item.description;
                        existingExpense.amount = itemTotal;
                        existingExpense.category = item.category;
                        existingExpense.status = 'Completed';
                        existingExpense.rooms = [room.slug];
                        await existingExpense.save();
                        console.log(`   ✏️  Updated: "${item.description}" (S/ ${itemTotal.toFixed(2)})`);
                        updatedCount++;
                    } else {
                        // Create new expense for this completed item
                        const newExpense = await Expense.create({
                            productRoom: room.slug,
                            productIndex: i,
                            isFromProduct: true,
                            description: item.description,
                            amount: itemTotal,
                            category: item.category,
                            roomCategory: item.category,
                            status: 'Completed',
                            rooms: [room.slug],
                            date: new Date()
                        });
                        console.log(`   ➕ Created: "${item.description}" (S/ ${itemTotal.toFixed(2)})`);
                        syncedCount++;
                    }
                } else {
                    // If item is not completed, check if we need to remove an expense
                    const existingExpense = await Expense.findOne({
                        productRoom: room.slug,
                        productIndex: i,
                        isFromProduct: true
                    });
                    
                    if (existingExpense) {
                        await Expense.deleteOne({ _id: existingExpense._id });
                        console.log(`   🗑️  Removed: "${existingExpense.description}" (status: ${item.status})`);
                        skippedCount++;
                    }
                }
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Sync completed!');
        console.log(`   📦 New expenses created: ${syncedCount}`);
        console.log(`   ✏️  Expenses updated: ${updatedCount}`);
        console.log(`   🗑️  Expenses removed: ${skippedCount}`);
        console.log(`   📊 Total processed: ${syncedCount + updatedCount + skippedCount}`);
        console.log('='.repeat(60) + '\n');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing:', error);
        process.exit(1);
    }
}

syncCompletedToExpenses();
