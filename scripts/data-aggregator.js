#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

class DataAggregator {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.roomsDir = path.join(this.dataDir, 'rooms');
        this.rooms = ['cocina', 'sala', 'cuarto1', 'cuarto2', 'cuarto3', 'bano1', 'bano2', 'bano_visita', 'balcon'];
    }

    parseCurrency(value) {
        if (!value || value === '' || value === 0) return 0;
        if (typeof value === 'number') return value;
        return parseFloat(value.toString().replace(/[S/\s,]/g, ''));
    }

    formatCurrency(value) {
        return `S/ ${value.toLocaleString('es-PE')}`;
    }

    async loadRoomData(roomName) {
        const filePath = path.join(this.roomsDir, `${roomName}.csv`);
        if (!fs.existsSync(filePath)) {
            console.warn(`Warning: ${roomName}.csv not found, creating template...`);
            await this.createRoomTemplate(roomName);
            return null;
        }

        const csvContent = fs.readFileSync(filePath, 'utf8');
        const lines = csvContent.split('\n');

        // Extract room name and budget from header
        const roomNameLine = lines[0].split(',');
        const budgetLine = lines[1].split(',');

        const roomData = {
            name: roomNameLine[1],
            budget: this.parseCurrency(budgetLine[1]),
            items: []
        };

        // Parse items starting from line 3 (after headers)
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length >= 8) {
                const item = {
                    description: parts[0],
                    category: parts[1],
                    quantity: parseFloat(parts[2]) || 1,
                    unit: parts[3] || '',
                    budgetRate: this.parseCurrency(parts[4]),
                    actualRate: this.parseCurrency(parts[5]),
                    subtotal: this.parseCurrency(parts[6]),
                    status: parts[7] || 'Planning'
                };
                roomData.items.push(item);
            }
        }

        return roomData;
    }

    async createRoomTemplate(roomName) {
        const roomDisplayName = this.getRoomDisplayName(roomName);
        const budget = this.getDefaultBudget(roomName);

        const template = `Room,${roomDisplayName}
Budget,${budget}
Description,Category,Quantity,Unit,Budget_Rate,Actual_Rate,Subtotal,Status
Electrical,Services,1,,0,0,0,Planning
Plumbing,Services,1,,0,0,0,Planning
Piso,Materials,20,m^2,0,0,0,Planning
Pintura,Materials,40,m^2,10,0,0,Planning
Contratista,Labor,20,Hrs.,54,0,0,Planning`;

        const filePath = path.join(this.roomsDir, `${roomName}.csv`);
        fs.writeFileSync(filePath, template, 'utf8');
        console.log(`✅ Created template for ${roomDisplayName}`);
    }

    getRoomDisplayName(roomName) {
        const names = {
            'cocina': 'Cocina',
            'sala': 'Sala',
            'cuarto1': 'Cuarto 1',
            'cuarto2': 'Cuarto 2',
            'cuarto3': 'Cuarto 3',
            'bano1': 'Baño 1',
            'bano2': 'Baño 2',
            'bano_visita': 'Baño Visita',
            'balcon': 'Balcón'
        };
        return names[roomName] || roomName;
    }

    getDefaultBudget(roomName) {
        const budgets = {
            'cocina': 40000,
            'sala': 30000,
            'cuarto1': 20000,
            'cuarto2': 20000,
            'cuarto3': 15000,
            'bano1': 15000,
            'bano2': 15000,
            'bano_visita': 10000,
            'balcon': 5000
        };
        return budgets[roomName] || 15000;
    }

    async generateBudgetOverview() {
        console.log('📊 Generating budget overview from room data...');

        const budgetLines = ['Room,Budget,Actual,Difference,Status'];
        let totalBudget = 0;
        let totalActual = 0;

        for (const roomName of this.rooms) {
            const roomData = await this.loadRoomData(roomName);
            if (!roomData) continue;

            const budget = roomData.budget;
            // ONLY count Completed items for actual spending
            const actual = roomData.items
                .filter(item => item.status === 'Completed')
                .reduce((sum, item) => sum + item.subtotal, 0);
            const difference = budget - actual;
            
            // Determine status based on completed items
            const completedCount = roomData.items.filter(item => item.status === 'Completed').length;
            const totalCount = roomData.items.length;
            let status;
            if (completedCount === 0) {
                status = 'Not Started';
            } else if (completedCount === totalCount) {
                status = 'Completed';
            } else {
                status = 'In Progress';
            }

            totalBudget += budget;
            totalActual += actual;

            budgetLines.push(`${roomData.name},"${this.formatCurrency(budget)}","${this.formatCurrency(actual)}","${this.formatCurrency(Math.abs(difference))}",${status}`);
        }

        // Add total row
        const totalDifference = totalBudget - totalActual;
        budgetLines.push(`Total,"${this.formatCurrency(totalBudget)}","${this.formatCurrency(totalActual)}","${this.formatCurrency(Math.abs(totalDifference))}",${((totalActual/totalBudget)*100).toFixed(1)}% Complete`);

        const filePath = path.join(this.dataDir, 'budget-overview.csv');
        fs.writeFileSync(filePath, budgetLines.join('\n'), 'utf8');
        console.log('✅ Updated budget-overview.csv (Completed items only)');

        return { totalBudget, totalActual, totalDifference };
    }

    async generateProducts() {
        console.log('🛍️ Generating products list from room data...');

        const productLines = ['Room,Category,Description,Quantity,Unit,Budget_Rate,Actual_Rate,Subtotal,Status'];

        for (const roomName of this.rooms) {
            const roomData = await this.loadRoomData(roomName);
            if (!roomData) continue;

            for (const item of roomData.items) {
                if (item.category === 'Products' || item.category === 'Producto') {
                    productLines.push([
                        roomData.name,
                        item.category,
                        item.description,
                        item.quantity,
                        item.unit,
                        item.budgetRate,
                        item.actualRate,
                        item.subtotal,
                        item.status
                    ].join(','));
                }
            }
        }

        const filePath = path.join(this.dataDir, 'products-detailed.csv');
        fs.writeFileSync(filePath, productLines.join('\n'), 'utf8');
        console.log('✅ Updated products-detailed.csv');
    }

    async generateCategorySummary() {
        console.log('📋 Generating category summary...');

        const categories = {};

        for (const roomName of this.rooms) {
            const roomData = await this.loadRoomData(roomName);
            if (!roomData) continue;

            for (const item of roomData.items) {
                const category = item.category;
                if (!categories[category]) {
                    categories[category] = {
                        budget: 0,
                        actual: 0,
                        items: 0
                    };
                }

                categories[category].budget += item.budgetRate * item.quantity;
                categories[category].actual += item.subtotal;
                categories[category].items += 1;
            }
        }

        const summaryLines = ['Category,Budget_Total,Actual_Total,Items_Count,Avg_Cost'];

        Object.entries(categories).forEach(([category, data]) => {
            const avgCost = data.items > 0 ? data.actual / data.items : 0;
            summaryLines.push([
                category,
                this.formatCurrency(data.budget),
                this.formatCurrency(data.actual),
                data.items,
                this.formatCurrency(avgCost)
            ].join(','));
        });

        const filePath = path.join(this.dataDir, 'category-summary.csv');
        fs.writeFileSync(filePath, summaryLines.join('\n'), 'utf8');
        console.log('✅ Updated category-summary.csv');
    }

    async generateRoomProgress() {
        console.log('📈 Generating room progress report...');

        const progressLines = ['Room,Budget,Actual,Progress_Percent,Completed_Items,Total_Items,Status'];

        for (const roomName of this.rooms) {
            const roomData = await this.loadRoomData(roomName);
            if (!roomData) continue;

            const budget = roomData.budget;
            const actual = roomData.items.reduce((sum, item) => sum + item.subtotal, 0);
            const progressPercent = budget > 0 ? ((actual / budget) * 100).toFixed(1) : 0;

            const completedItems = roomData.items.filter(item =>
                item.status === 'Completed' || item.subtotal > 0
            ).length;
            const totalItems = roomData.items.length;

            const status = completedItems === 0 ? 'Not Started' :
                         completedItems === totalItems ? 'Completed' : 'In Progress';

            progressLines.push([
                roomData.name,
                this.formatCurrency(budget),
                this.formatCurrency(actual),
                `${progressPercent}%`,
                completedItems,
                totalItems,
                status
            ].join(','));
        }

        const filePath = path.join(this.dataDir, 'room-progress.csv');
        fs.writeFileSync(filePath, progressLines.join('\n'), 'utf8');
        console.log('✅ Updated room-progress.csv');
    }

    async aggregateAll() {
        try {
            console.log('🔄 Starting data aggregation from room files...');
            console.log('📂 Source: data/rooms/*.csv');
            console.log('🎯 Target: Auto-generated summary files\n');

            // Ensure rooms directory exists
            if (!fs.existsSync(this.roomsDir)) {
                fs.mkdirSync(this.roomsDir, { recursive: true });
            }

            // Generate all interconnected files
            const summary = await this.generateBudgetOverview();
            await this.generateProducts();
            await this.generateCategorySummary();
            
            // Use the new dedicated room progress updater
            const RoomProgressUpdater = require('./update-room-progress.js');
            const progressUpdater = new RoomProgressUpdater();
            await progressUpdater.updateRoomProgress();

            console.log('\n📊 AGGREGATION COMPLETE!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`💰 Total Budget: ${this.formatCurrency(summary.totalBudget)}`);
            console.log(`📈 Total Spent: ${this.formatCurrency(summary.totalActual)}`);
            console.log(`📉 Remaining: ${this.formatCurrency(summary.totalDifference)}`);
            console.log(`📊 Progress: ${((summary.totalActual/summary.totalBudget)*100).toFixed(1)}%`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            console.log('\n📁 Generated Files:');
            console.log('  ✅ budget-overview.csv (main summary)');
            console.log('  ✅ products-detailed.csv (all products by room)');
            console.log('  ✅ category-summary.csv (spending by category)');
            console.log('  ✅ room-progress.csv (completion status - ONLY Completed items)');

            console.log('\n💡 Next Steps:');
            console.log('  • Edit individual room files in data/rooms/');
            console.log('  • Run this script again to update all summaries');
            console.log('  • View updated charts in budget-overview.html');

        } catch (error) {
            console.error('❌ Error during aggregation:', error);
            throw error;
        }
    }

    async validateRoomFiles() {
        console.log('\n🔍 Validating room files...');

        let allValid = true;
        for (const roomName of this.rooms) {
            const filePath = path.join(this.roomsDir, `${roomName}.csv`);
            if (fs.existsSync(filePath)) {
                console.log(`✅ ${roomName}.csv`);
            } else {
                console.log(`⚠️ ${roomName}.csv - Missing (will create template)`);
                allValid = false;
            }
        }

        return allValid;
    }
}

// Command line interface
if (require.main === module) {
    const aggregator = new DataAggregator();

    const command = process.argv[2] || 'all';

    switch (command) {
        case 'validate':
            aggregator.validateRoomFiles();
            break;
        case 'budget':
            aggregator.generateBudgetOverview();
            break;
        case 'products':
            aggregator.generateProducts();
            break;
        case 'categories':
            aggregator.generateCategorySummary();
            break;
        case 'progress':
            aggregator.generateRoomProgress();
            break;
        case 'all':
        default:
            aggregator.aggregateAll()
                .then(() => {
                    console.log('\n🎉 Data aggregation completed successfully!');
                })
                .catch(error => {
                    console.error('Failed to aggregate data:', error);
                    process.exit(1);
                });
            break;
    }
}

module.exports = DataAggregator;