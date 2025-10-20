#!/usr/bin/env node

/**
 * Create Admin User Script
 *
 * Run this script to create the first admin user
 * Usage: node scripts/create-admin.js
 */

const bcrypt = require('bcryptjs');
const { connectDB } = require('../db/mongoose-connection');
const User = require('../db/models/User');

async function createAdminUser() {
    try {
        console.log('\n🔐 Admin User Setup\n');

        // Connect to database
        await connectDB();

        // Check if any admin exists
        const existingAdmin = await User.findOne({ role: 'admin' });

        if (existingAdmin) {
            console.log('⚠️  An admin user already exists:');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.name}`);
            console.log('\nIf you need to create another admin, update their role in MongoDB directly.');
            process.exit(0);
        }

        // Get user input (in a real scenario, you'd use readline or prompts)
        // For now, we'll use environment variables or hardcode for first run
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@apartment.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
        const adminName = process.env.ADMIN_NAME || 'Administrator';

        // Validate inputs
        if (adminPassword.length < 8) {
            console.error('❌ Password must be at least 8 characters');
            process.exit(1);
        }

        // Hash password
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Create admin user
        const adminUser = new User({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            isActive: true,
        });

        await adminUser.save();

        console.log('\n✅ Admin user created successfully!\n');
        console.log('   Email:', adminEmail);
        console.log('   Name:', adminName);
        console.log('   Role: admin');
        console.log('\n⚠️  IMPORTANT: Save these credentials securely!\n');
        console.log('You can now log in with these credentials.\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating admin user:', error.message);

        if (error.code === 11000) {
            console.error('   A user with this email already exists.');
        }

        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    createAdminUser();
}

module.exports = createAdminUser;
