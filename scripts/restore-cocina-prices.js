const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import Room model
const Room = require('../db/models/Room');

const MONGODB_URI = 'mongodb://localhost:27017/apartment_remodel';
const CSV_FILE = path.join(__dirname, '../data/rooms/cocina.csv');

// Simple CSV parser - skip first 2 metadata rows
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter((line) => line.trim());
    // Skip first 2 lines (Room,Cocina and Budget,40000) and get the header
    const headers = lines[2].split(',').map((h) => h.trim());

    // Parse data rows starting from line 4 (index 3)
    return lines.slice(3).map((line) => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        return obj;
    });
}

async function restoreCocinasPrices() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Read CSV file
        console.log(`📄 Reading CSV file: ${CSV_FILE}`);
        const csvText = fs.readFileSync(CSV_FILE, 'utf-8');
        const csvData = parseCSV(csvText);

        console.log(`✅ Read ${csvData.length} items from CSV`);
        console.log(`📝 First CSV item:`, csvData[0]);
        console.log(`📝 CSV headers found:`, Object.keys(csvData[0] || {}));
        console.log('');

        // Get the Cocina room from DB
        const room = await Room.findOne({ slug: 'cocina' });

        if (!room) {
            console.error('❌ Cocina room not found in database');
            await mongoose.disconnect();
            return;
        }

        console.log(`📦 Found Cocina room with ${room.items.length} items\n`);

        // Create a map of CSV items by description for easier matching
        const csvMap = {};
        csvData.forEach((csvItem) => {
            const desc = csvItem['Description'];
            if (desc) {
                csvMap[desc.trim()] = csvItem;
            }
        });

        console.log(`📋 CSV contains ${Object.keys(csvMap).length} items\n`);

        let updatedCount = 0;
        let skippedCount = 0;
        let notFoundCount = 0;

        // Update only prices for each item
        for (let i = 0; i < room.items.length; i++) {
            const dbItem = room.items[i];
            const csvItem = csvMap[dbItem.description.trim()];

            if (!csvItem) {
                console.log(
                    `⚠️  No CSV match for item ${i + 1}: ${dbItem.description}`
                );
                notFoundCount++;
                continue;
            }

            // Parse prices from CSV
            const csvBudgetPrice = parseFloat(csvItem['Budget_Price']) || 0;
            const csvActualPrice = parseFloat(csvItem['Actual_Price']) || 0;

            // Only update if prices have changed
            if (
                dbItem.budget_price !== csvBudgetPrice ||
                dbItem.actual_price !== csvActualPrice
            ) {
                console.log(`🔄 Updating item ${i + 1}: ${dbItem.description}`);
                console.log(
                    `   Budget Price: ${dbItem.budget_price} → ${csvBudgetPrice}`
                );
                console.log(
                    `   Actual Price: ${dbItem.actual_price} → ${csvActualPrice}`
                );

                room.items[i].budget_price = csvBudgetPrice;
                room.items[i].actual_price = csvActualPrice;
                updatedCount++;
            } else {
                skippedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`\n💾 Saving changes to database...`);
            await room.save();
            console.log(`✅ Successfully updated ${updatedCount} items`);
        } else {
            console.log(
                `\n✅ No changes needed - all prices already match CSV`
            );
        }

        console.log(`📊 Summary:`);
        console.log(`   - Updated: ${updatedCount} items`);
        console.log(`   - Skipped (no change): ${skippedCount} items`);
        console.log(`   - Not found in CSV: ${notFoundCount} items`);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the restoration
restoreCocinasPrices();
