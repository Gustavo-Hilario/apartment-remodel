#!/usr/bin/env node

/**
 * Migration Script: Add Status Field to Expenses
 * 
 * This script adds a default 'Pending' status to all existing expenses
 * that don't already have a status field.
 */

const mongoose = require('mongoose');
const Expense = require('../db/models/Expense');

const MONGODB_URI = 'mongodb://localhost:27017/apartment_remodel';

async function migrateExpenseStatus() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all expenses without a status field
        const expensesWithoutStatus = await Expense.find({
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: '' }
            ]
        });

        console.log(`📊 Found ${expensesWithoutStatus.length} expenses without status\n`);

        if (expensesWithoutStatus.length === 0) {
            console.log('✅ All expenses already have a status field!');
            await mongoose.disconnect();
            return;
        }

        // Update each expense with default 'Pending' status
        let updatedCount = 0;
        for (const expense of expensesWithoutStatus) {
            console.log(`📝 Updating expense: "${expense.description}" - ${expense.category}`);
            expense.status = 'Pending';
            await expense.save();
            updatedCount++;
        }

        console.log(`\n✅ Successfully updated ${updatedCount} expenses with default 'Pending' status`);

        // Show summary
        const statusCounts = await Expense.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n📊 Status Summary:');
        statusCounts.forEach(item => {
            console.log(`   ${item._id || 'null'}: ${item.count}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the migration
migrateExpenseStatus();
