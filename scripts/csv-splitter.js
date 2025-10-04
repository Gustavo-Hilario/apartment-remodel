#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

class CSVSplitter {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.mainCSVPath = path.join(this.dataDir, 'main.csv');
    }

    async loadMainCSV() {
        if (!fs.existsSync(this.mainCSVPath)) {
            throw new Error('main.csv not found in data directory');
        }

        const csvContent = fs.readFileSync(this.mainCSVPath, 'utf8');
        return csvContent.split('\n');
    }

    findSectionStart(lines, sectionName) {
        return lines.findIndex(line =>
            line.toLowerCase().includes(sectionName.toLowerCase())
        );
    }

    findSectionEnd(lines, startIndex) {
        for (let i = startIndex + 1; i < lines.length; i++) {
            if (lines[i].trim() === '' || lines[i].includes(':')) {
                return i;
            }
        }
        return lines.length;
    }

    extractSection(lines, startIndex, endIndex) {
        return lines.slice(startIndex, endIndex)
            .filter(line => line.trim() !== '' && !line.includes(':'))
            .join('\n');
    }

    async splitBudgetOverview(lines) {
        console.log('📊 Extracting budget overview...');

        const startIndex = this.findSectionStart(lines, 'Presupuesto: Project Breakdown');
        if (startIndex === -1) return null;

        const budgetLines = [];
        budgetLines.push('Room,Budget,Actual,Difference,Status');

        // Extract room data
        for (let i = startIndex + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '' || line.includes('Total')) break;

            const parts = line.split(',');
            if (parts.length >= 3) {
                const room = parts[0].replace(/"/g, '');
                const budget = parts[1].replace(/"/g, '');
                const actual = parts[2].replace(/"/g, '');
                const difference = parts[3] ? parts[3].replace(/"/g, '') : '';

                // Determine status
                const status = actual && actual !== '' ? 'Completed' : 'Pending';

                if (room && budget) {
                    budgetLines.push(`${room},"${budget}","${actual}","${difference}",${status}`);
                }
            }
        }

        return budgetLines.join('\n');
    }

    async splitExpenses(lines) {
        console.log('💰 Extracting expenses...');

        const startIndex = this.findSectionStart(lines, 'Costos Reales: Expenses');
        if (startIndex === -1) return null;

        const expenseLines = [];
        expenseLines.push('Description,Amount,Category,Date');

        // Extract expense data
        for (let i = startIndex + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '' || line.includes('Total expenses')) break;

            const parts = line.split(',');
            if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
                const description = parts[0].replace(/"/g, '');
                const amount = parts[1].replace(/"/g, '');
                const category = parts[2].replace(/"/g, '');

                if (description && amount && category) {
                    expenseLines.push(`"${description}","${amount}","${category}",`);
                }
            }
        }

        return expenseLines.join('\n');
    }

    async splitIncome(lines) {
        console.log('📈 Extracting income...');

        const startIndex = this.findSectionStart(lines, 'Costos Reales: Income');
        if (startIndex === -1) return null;

        const incomeLines = [];
        incomeLines.push('Source,Amount_Soles,Amount_USD,Date');

        // Extract income data
        for (let i = startIndex + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '' || line.includes('Total income')) break;

            const parts = line.split(',');
            if (parts.length >= 2 && parts[0] && parts[1]) {
                const source = parts[0].replace(/"/g, '');
                const amountSoles = parts[1].replace(/"/g, '');
                const amountUSD = parts[2] ? parts[2].replace(/"/g, '') : '';

                if (source && amountSoles) {
                    incomeLines.push(`"${source}","${amountSoles}","${amountUSD}",`);
                }
            }
        }

        return incomeLines.join('\n');
    }

    async splitProducts(lines) {
        console.log('🛍️ Extracting products...');

        const startIndex = this.findSectionStart(lines, 'Productos/Materiales: Range');
        if (startIndex === -1) return null;

        const productLines = [];
        productLines.push('Category,Product,Description,Links,Selected,Price');

        // Extract product data
        for (let i = startIndex + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '' || line.includes('Selection Total')) break;

            const parts = line.split(',');
            if (parts.length >= 4 && parts[0] && parts[3]) {
                const description = parts[0].replace(/"/g, '');
                const links = parts[1] ? parts[1].replace(/"/g, '') : '';
                const selected = parts[2] ? parts[2].replace(/"/g, '') : 'FALSE';
                const price = parts[3] ? parts[3].replace(/"/g, '') : '';

                // Determine category and product type
                let category = 'Kitchen';
                let product = 'Appliance';

                if (description.toLowerCase().includes('refrigerator')) {
                    product = 'Refrigerator';
                } else if (description.toLowerCase().includes('dishwasher')) {
                    product = 'Dishwasher';
                } else if (description.toLowerCase().includes('range')) {
                    product = 'Range';
                }

                if (description && price) {
                    productLines.push(`${category},${product},"${description}","${links}",${selected},"${price}"`);
                }
            }
        }

        return productLines.join('\n');
    }

    async writeFile(filename, content) {
        if (!content) {
            console.warn(`⚠️ No content for ${filename}, skipping...`);
            return;
        }

        const filepath = path.join(this.dataDir, filename);
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Created ${filename}`);
    }

    async splitCSV() {
        try {
            console.log('🔄 Starting CSV splitting process...');
            console.log(`📂 Reading from: ${this.mainCSVPath}`);

            const lines = await this.loadMainCSV();

            // Split into different files
            const budgetOverview = await this.splitBudgetOverview(lines);
            const expenses = await this.splitExpenses(lines);
            const income = await this.splitIncome(lines);
            const products = await this.splitProducts(lines);

            // Write files
            await this.writeFile('budget-overview.csv', budgetOverview);
            await this.writeFile('expenses.csv', expenses);
            await this.writeFile('income.csv', income);
            await this.writeFile('products.csv', products);

            console.log('\n✅ CSV splitting completed successfully!');
            console.log('📁 Files created:');
            console.log('  - budget-overview.csv (room budgets and actuals)');
            console.log('  - expenses.csv (project expenses)');
            console.log('  - income.csv (funding sources)');
            console.log('  - products.csv (product selections)');
            console.log('\n💡 Tip: The original main.csv is preserved for backup');

        } catch (error) {
            console.error('❌ Error splitting CSV:', error.message);
            throw error;
        }
    }

    async validateFiles() {
        console.log('\n🔍 Validating created files...');

        const files = ['budget-overview.csv', 'expenses.csv', 'income.csv', 'products.csv'];
        let allValid = true;

        for (const file of files) {
            const filepath = path.join(this.dataDir, file);
            if (fs.existsSync(filepath)) {
                const content = fs.readFileSync(filepath, 'utf8');
                const lines = content.split('\n').length - 1; // -1 for empty last line
                console.log(`✅ ${file}: ${lines} lines`);
            } else {
                console.log(`❌ ${file}: Not found`);
                allValid = false;
            }
        }

        return allValid;
    }
}

// Run if called directly
if (require.main === module) {
    const splitter = new CSVSplitter();

    splitter.splitCSV()
        .then(() => splitter.validateFiles())
        .then(valid => {
            if (valid) {
                console.log('\n🎉 All files created and validated successfully!');
            } else {
                console.log('\n⚠️ Some files may have issues. Please check the output above.');
            }
        })
        .catch(error => {
            console.error('Failed to split CSV:', error);
            process.exit(1);
        });
}

module.exports = CSVSplitter;