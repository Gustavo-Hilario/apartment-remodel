#!/usr/bin/env node

/**
 * Migration Script: Move _general room items to expenses collection
 *
 * This script migrates all items from the _general room (fake room in rooms collection)
 * to the proper expenses collection.
 *
 * What it does:
 * 1. Finds the _general room in the rooms collection
 * 2. Converts each item to an Expense document
 * 3. Saves to expenses collection
 * 4. Optionally deletes the _general room (with confirmation)
 *
 * Usage:
 *   node scripts/migrate-general-to-expenses.js [--delete-general]
 *
 * Options:
 *   --delete-general    Delete the _general room after migration (requires confirmation)
 */

require('dotenv').config({ path: '.env.local' });
const { connectDB } = require('../db/mongoose-connection');
const Room = require('../db/models/Room');
const Expense = require('../db/models/Expense');

async function migrateGeneralToExpenses(deleteGeneral = false) {
    try {
        console.log('\n🚀 Starting migration: _general room → expenses collection\n');

        // Find the _general room
        const generalRoom = await Room.findOne({ slug: '_general' });

        if (!generalRoom) {
            console.log('ℹ️  No _general room found. Nothing to migrate.');
            return;
        }

        console.log(`📦 Found _general room with ${generalRoom.items.length} items\n`);

        if (generalRoom.items.length === 0) {
            console.log('ℹ️  _general room is empty. Nothing to migrate.');

            if (deleteGeneral) {
                console.log('\n🗑️  Deleting empty _general room...');
                await Room.deleteOne({ slug: '_general' });
                console.log('✅ Deleted _general room\n');
            }

            return;
        }

        // Migrate each item to expenses collection
        let migratedCount = 0;
        let skippedCount = 0;
        const errors = [];

        console.log('📝 Migrating items...\n');

        for (const item of generalRoom.items) {
            try {
                // Determine amount (use actual_price if set, otherwise budget_price)
                const amount = item.totalAmount ||
                              (parseFloat(item.actual_price) || parseFloat(item.budget_price) || 0) *
                              (parseFloat(item.quantity) || 1);

                // Determine rooms array
                let rooms = [];
                if (item.isSharedExpense && item.roomAllocations && item.roomAllocations.length > 0) {
                    rooms = item.roomAllocations.map(a => a.room);
                } else if (item.roomAllocations && item.roomAllocations.length > 0) {
                    rooms = [item.roomAllocations[0].room];
                }

                // Create expense document
                const expense = new Expense({
                    description: item.description || 'Unnamed Expense',
                    category: item.category || 'Other',
                    amount: amount,
                    status: item.status || 'Pending',

                    // Dates
                    date: item.date || item.completedDate || item.createdDate || new Date(),
                    createdDate: item.createdDate || new Date(),
                    completedDate: item.completedDate || null,

                    // Room linking
                    rooms: rooms,
                    roomAllocations: item.roomAllocations || [],
                    isSharedExpense: item.isSharedExpense || false,

                    // Notes
                    notes: item.notes || ''
                });

                await expense.save();

                console.log(`   ✅ Migrated: ${item.description.substring(0, 50)}...`);
                console.log(`      Amount: ${amount}, Status: ${expense.status}, Rooms: ${rooms.join(', ') || 'General'}`);

                migratedCount++;
            } catch (error) {
                console.error(`   ❌ Failed to migrate: ${item.description}`);
                console.error(`      Error: ${error.message}`);
                errors.push({ item: item.description, error: error.message });
                skippedCount++;
            }
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Migrated: ${migratedCount} items`);
        console.log(`   ❌ Skipped: ${skippedCount} items`);

        if (errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            errors.forEach(({ item, error }) => {
                console.log(`   - ${item}: ${error}`);
            });
        }

        // Delete _general room if requested
        if (deleteGeneral && migratedCount > 0) {
            console.log('\n🗑️  Deleting _general room...');

            // Double check before deleting
            console.log('⚠️  WARNING: This will permanently delete the _general room!');
            console.log('   All items have been migrated to expenses collection.');
            console.log('   Press Ctrl+C within 5 seconds to cancel...\n');

            await new Promise(resolve => setTimeout(resolve, 5000));

            await Room.deleteOne({ slug: '_general' });
            console.log('✅ Deleted _general room');
        } else if (deleteGeneral) {
            console.log('\nℹ️  Skipping deletion because no items were migrated.');
        } else {
            console.log('\nℹ️  To delete the _general room, run this script with --delete-general flag');
        }

        console.log('\n✨ Migration completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    }
}

// Main execution
async function main() {
    try {
        // Check for --delete-general flag
        const deleteGeneral = process.argv.includes('--delete-general');

        // Connect to database
        await connectDB();

        // Run migration
        await migrateGeneralToExpenses(deleteGeneral);

        // Close connection
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

main();
