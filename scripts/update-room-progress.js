#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class RoomProgressUpdater {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.roomsDir = path.join(this.dataDir, 'rooms');
        this.outputPath = path.join(this.dataDir, 'room-progress.csv');

        this.rooms = [
            { name: 'Cocina', file: 'cocina.csv' },
            { name: 'Sala', file: 'sala.csv' },
            { name: 'Cuarto 1', file: 'cuarto1.csv' },
            { name: 'Cuarto 2', file: 'cuarto2.csv' },
            { name: 'Cuarto 3', file: 'cuarto3.csv' },
            { name: 'Baño 1', file: 'bano1.csv' },
            { name: 'Baño 2', file: 'bano2.csv' },
            { name: 'Baño Visita', file: 'bano_visita.csv' },
            { name: 'Balcón', file: 'balcon.csv' },
        ];
    }

    parseRoomCSV(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // First line: Room name
        const roomName = lines[0].split(',')[1]?.trim();

        // Second line: Budget
        const budget = parseFloat(lines[1].split(',')[1]) || 0;

        // Parse items (starting from line 3, after header)
        const items = [];
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length >= 8) {
                items.push({
                    description: parts[0],
                    category: parts[1],
                    quantity: parseFloat(parts[2]) || 1,
                    unit: parts[3] || '',
                    budgetPrice: parseFloat(parts[4]) || 0,
                    actualPrice: parseFloat(parts[5]) || 0,
                    subtotal: parseFloat(parts[6]) || 0,
                    status: parts[7]?.trim() || 'Planning',
                });
            }
        }

        return { roomName, budget, items };
    }

    calculateRoomStats(roomData) {
        const { budget, items } = roomData;

        // Calculate actual spending - ONLY from Completed items
        const actualSpent = items
            .filter((item) => item.status === 'Completed')
            .reduce((sum, item) => sum + item.subtotal, 0);

        // Count items
        const totalItems = items.length;
        const completedItems = items.filter(
            (item) => item.status === 'Completed'
        ).length;

        // Calculate progress percentage
        const progressPercent =
            totalItems > 0
                ? ((completedItems / totalItems) * 100).toFixed(1)
                : '0.0';

        // Determine status
        let status;
        if (completedItems === 0) {
            status = 'Not Started';
        } else if (completedItems === totalItems) {
            status = 'Completed';
        } else {
            status = 'In Progress';
        }

        return {
            budget,
            actualSpent,
            progressPercent,
            completedItems,
            totalItems,
            status,
        };
    }

    formatCurrency(value) {
        return `S/ ${value.toLocaleString('es-PE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    }

    async updateRoomProgress() {
        try {
            console.log('🔄 Updating room progress data...');

            const roomProgress = [];

            // Process each room
            for (const room of this.rooms) {
                const filePath = path.join(this.roomsDir, room.file);

                if (!fs.existsSync(filePath)) {
                    console.warn(`⚠️  Room file not found: ${room.file}`);
                    continue;
                }

                const roomData = this.parseRoomCSV(filePath);
                const stats = this.calculateRoomStats(roomData);

                roomProgress.push({
                    room: room.name,
                    ...stats,
                });

                console.log(
                    `✅ ${room.name}: ${stats.completedItems}/${
                        stats.totalItems
                    } items completed, ${this.formatCurrency(
                        stats.actualSpent
                    )} spent`
                );
            }

            // Generate CSV content
            let csvContent =
                'Room,Budget,Actual,Progress_Percent,Completed_Items,Total_Items,Status\n';

            roomProgress.forEach((room) => {
                csvContent += `${room.room},${this.formatCurrency(
                    room.budget
                )},${this.formatCurrency(room.actualSpent)},${
                    room.progressPercent
                }%,${room.completedItems},${room.totalItems},${room.status}\n`;
            });

            // Write to file
            fs.writeFileSync(this.outputPath, csvContent, 'utf8');

            console.log(`\n✅ Room progress updated successfully!`);
            console.log(`📁 File: ${this.outputPath}`);

            // Calculate and display totals
            const totalBudget = roomProgress.reduce(
                (sum, room) => sum + room.budget,
                0
            );
            const totalSpent = roomProgress.reduce(
                (sum, room) => sum + room.actualSpent,
                0
            );
            const totalCompleted = roomProgress.reduce(
                (sum, room) => sum + room.completedItems,
                0
            );
            const totalItems = roomProgress.reduce(
                (sum, room) => sum + room.totalItems,
                0
            );

            console.log(`\n📊 Project Totals:`);
            console.log(`   Total Budget: ${this.formatCurrency(totalBudget)}`);
            console.log(
                `   Total Spent: ${this.formatCurrency(totalSpent)} (${(
                    (totalSpent / totalBudget) *
                    100
                ).toFixed(1)}%)`
            );
            console.log(
                `   Items Completed: ${totalCompleted}/${totalItems} (${(
                    (totalCompleted / totalItems) *
                    100
                ).toFixed(1)}%)`
            );
        } catch (error) {
            console.error('❌ Error updating room progress:', error.message);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const updater = new RoomProgressUpdater();
    updater.updateRoomProgress().catch((error) => {
        console.error('Failed to update room progress:', error);
        process.exit(1);
    });
}

module.exports = RoomProgressUpdater;
