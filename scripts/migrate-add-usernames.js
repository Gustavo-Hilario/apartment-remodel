#!/usr/bin/env node

/**
 * Migration Script: Add Usernames to Existing Users
 *
 * This script adds usernames to users who don't have one.
 * It generates usernames from email addresses (part before @)
 * and ensures uniqueness by adding numbers if needed.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { connectDB, disconnectDB } = require('../db/mongoose-connection');
const User = require('../db/models/User');

/**
 * Generate a username from an email address
 * @param {string} email - User's email
 * @returns {string} - Generated username
 */
function generateUsernameFromEmail(email) {
    // Get part before @ and clean it
    let username = email.split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_') // Replace invalid chars with underscore
        .substring(0, 30); // Max 30 chars

    return username;
}

/**
 * Ensure username is unique by adding numbers if needed
 * @param {string} baseUsername - Base username to make unique
 * @param {Array} existingUsernames - Array of existing usernames
 * @returns {string} - Unique username
 */
function makeUsernameUnique(baseUsername, existingUsernames) {
    let username = baseUsername;
    let counter = 1;

    while (existingUsernames.includes(username)) {
        // If username exists, add/increment number
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
}

async function migrateUsernames() {
    try {
        console.log('\n🔄 Starting username migration...\n');

        await connectDB();

        // Find all users without username
        const usersWithoutUsername = await User.find({
            $or: [
                { username: { $exists: false } },
                { username: null },
                { username: '' }
            ]
        });

        if (usersWithoutUsername.length === 0) {
            console.log('✅ All users already have usernames!\n');
            return;
        }

        console.log(`📊 Found ${usersWithoutUsername.length} users without usernames\n`);

        // Get all existing usernames to avoid duplicates
        const allUsers = await User.find({});
        const existingUsernames = allUsers
            .filter(u => u.username)
            .map(u => u.username);

        // Track usernames we're creating in this migration
        const newUsernames = [];

        // Process each user
        for (const user of usersWithoutUsername) {
            // Generate username from email
            const baseUsername = generateUsernameFromEmail(user.email);

            // Make sure it's unique
            const uniqueUsername = makeUsernameUnique(
                baseUsername,
                [...existingUsernames, ...newUsernames]
            );

            // Update user
            user.username = uniqueUsername;
            await user.save();

            newUsernames.push(uniqueUsername);

            console.log(`✅ ${user.email} → ${uniqueUsername}`);
        }

        console.log(`\n✨ Successfully migrated ${usersWithoutUsername.length} users!\n`);
        console.log('📝 Users can now log in with their username or email.\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await disconnectDB();
    }
}

// Run migration
if (require.main === module) {
    migrateUsernames()
        .then(() => {
            console.log('✅ Migration complete!\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration error:', error);
            process.exit(1);
        });
}

module.exports = { migrateUsernames };
