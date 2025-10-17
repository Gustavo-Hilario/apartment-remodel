#!/usr/bin/env node

/**
 * Initialize General Room
 * 
 * Creates a special "_general" room for shared/multi-room expenses
 */

const mongoose = require('mongoose');
const Room = require('../db/models/Room');
const { connectDB } = require('../db/mongoose-connection');

async function initGeneralRoom() {
    try {
        await connectDB();
        
        console.log('\n🔧 Initializing _general room...\n');
        
        // Check if _general room already exists
        const existingGeneral = await Room.findOne({ slug: '_general' });
        
        if (existingGeneral) {
            console.log('✅ _general room already exists');
            console.log(`   Name: ${existingGeneral.name}`);
            console.log(`   Items: ${existingGeneral.items.length}`);
        } else {
            // Create _general room
            const generalRoom = await Room.create({
                name: 'General / Shared Expenses',
                slug: '_general',
                budget: 0,
                status: 'Not Started',
                images: [],
                items: []
            });
            
            console.log('✅ Created _general room successfully!');
            console.log(`   ID: ${generalRoom._id}`);
            console.log(`   Slug: ${generalRoom.slug}`);
            console.log(`   Name: ${generalRoom.name}`);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Initialization completed!');
        console.log('='.repeat(60) + '\n');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing _general room:', error);
        process.exit(1);
    }
}

initGeneralRoom();
