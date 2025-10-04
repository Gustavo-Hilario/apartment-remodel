#!/usr/bin/env node

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

class ExcelReportGenerator {
    constructor() {
        this.workbook = new ExcelJS.Workbook();
        this.dataDir = path.join(__dirname, '..', 'data');
        this.outputDir = path.join(__dirname, '..', 'reports');

        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async loadCSV(filename) {
        const filePath = path.join(this.dataDir, filename);
        if (!fs.existsSync(filePath)) {
            console.warn(`Warning: ${filename} not found, skipping...`);
            return [];
        }

        const csvContent = fs.readFileSync(filePath, 'utf8');
        const result = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true
        });
        return result.data;
    }

    parseCurrency(value) {
        if (!value || value === '') return 0;
        return parseFloat(value.replace(/[S/\s,]/g, ''));
    }

    formatCurrency(value) {
        return `S/ ${value.toLocaleString('es-PE')}`;
    }

    setupWorksheetStyle(worksheet, title) {
        // Set title
        worksheet.getCell('A1').value = title;
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.mergeCells('A1:F1');

        // Set column widths
        worksheet.columns = [
            { width: 20 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 20 }
        ];
    }

    async createBudgetSummarySheet() {
        const worksheet = this.workbook.addWorksheet('Budget Summary');
        this.setupWorksheetStyle(worksheet, 'Apartment Remodel - Budget Summary');

        // Load budget data
        const budgetData = await this.loadCSV('budget-overview.csv');

        // Headers
        const headers = ['Room', 'Budget', 'Actual', 'Difference', 'Status', 'Variance %'];
        worksheet.addRow([]); // Empty row
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

        let totalBudget = 0;
        let totalActual = 0;

        // Add data rows
        budgetData.forEach(row => {
            const budget = this.parseCurrency(row.Budget);
            const actual = this.parseCurrency(row.Actual);
            const difference = this.parseCurrency(row.Difference);
            const variance = actual > 0 ? ((actual - budget) / budget * 100).toFixed(1) + '%' : 'N/A';

            totalBudget += budget;
            totalActual += actual;

            const dataRow = worksheet.addRow([
                row.Room,
                this.formatCurrency(budget),
                actual > 0 ? this.formatCurrency(actual) : 'Not started',
                this.formatCurrency(Math.abs(difference)),
                row.Status,
                variance
            ]);

            // Color coding for status
            if (row.Status === 'Completed') {
                dataRow.getCell(5).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF90EE90' }
                };
            }

            // Color coding for over/under budget
            if (difference < 0) {
                dataRow.getCell(4).font = { color: { argb: 'FFFF0000' } }; // Red for over budget
            } else if (difference > 0 && actual > 0) {
                dataRow.getCell(4).font = { color: { argb: 'FF008000' } }; // Green for under budget
            }
        });

        // Total row
        worksheet.addRow([]);
        const totalRow = worksheet.addRow([
            'TOTAL',
            this.formatCurrency(totalBudget),
            this.formatCurrency(totalActual),
            this.formatCurrency(totalBudget - totalActual),
            `${((totalActual/totalBudget) * 100).toFixed(1)}% Complete`,
            ''
        ]);
        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFE0' }
        };
    }

    async createExpenseSheet() {
        const worksheet = this.workbook.addWorksheet('Expenses');
        this.setupWorksheetStyle(worksheet, 'Project Expenses');

        const expenseData = await this.loadCSV('expenses.csv');

        // Headers
        const headers = ['Description', 'Amount', 'Category', 'Date'];
        worksheet.addRow([]);
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

        let totalExpenses = 0;
        const categoryTotals = {};

        // Add data rows
        expenseData.forEach(row => {
            const amount = this.parseCurrency(row.Amount);
            totalExpenses += amount;

            if (!categoryTotals[row.Category]) {
                categoryTotals[row.Category] = 0;
            }
            categoryTotals[row.Category] += amount;

            worksheet.addRow([
                row.Description,
                this.formatCurrency(amount),
                row.Category,
                row.Date || 'TBD'
            ]);
        });

        // Category summary
        worksheet.addRow([]);
        worksheet.addRow(['Category Summary']).font = { bold: true };
        Object.entries(categoryTotals).forEach(([category, total]) => {
            worksheet.addRow([category, this.formatCurrency(total), '', '']);
        });

        // Total row
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(['TOTAL EXPENSES', this.formatCurrency(totalExpenses), '', '']);
        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFE0' }
        };
    }

    async createProductSheet() {
        const worksheet = this.workbook.addWorksheet('Products');
        this.setupWorksheetStyle(worksheet, 'Product Selections');

        const productData = await this.loadCSV('products.csv');

        // Headers
        const headers = ['Category', 'Product Type', 'Description', 'Selected', 'Price', 'Status'];
        worksheet.addRow([]);
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

        let totalSelected = 0;

        // Add data rows
        productData.forEach(row => {
            const price = this.parseCurrency(row.Price);
            const isSelected = row.Selected === 'TRUE';

            if (isSelected) {
                totalSelected += price;
            }

            const dataRow = worksheet.addRow([
                row.Category,
                row.Product,
                row.Description,
                isSelected ? 'YES' : 'NO',
                this.formatCurrency(price),
                isSelected ? 'Selected' : 'Option'
            ]);

            // Highlight selected items
            if (isSelected) {
                dataRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF90EE90' }
                };
            }
        });

        // Total selected
        worksheet.addRow([]);
        const totalRow = worksheet.addRow(['', '', 'TOTAL SELECTED', '', this.formatCurrency(totalSelected), '']);
        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFE0' }
        };
    }

    async createDashboardSheet() {
        const worksheet = this.workbook.addWorksheet('Dashboard');
        this.setupWorksheetStyle(worksheet, 'Project Dashboard');

        // Load all data for summary calculations
        const budgetData = await this.loadCSV('budget-overview.csv');
        const expenseData = await this.loadCSV('expenses.csv');
        const incomeData = await this.loadCSV('income.csv');

        const totalBudget = budgetData.reduce((sum, row) => sum + this.parseCurrency(row.Budget), 0);
        const totalSpent = budgetData.reduce((sum, row) => sum + this.parseCurrency(row.Actual), 0);
        const totalExpenses = expenseData.reduce((sum, row) => sum + this.parseCurrency(row.Amount), 0);
        const totalIncome = incomeData.reduce((sum, row) => sum + this.parseCurrency(row.Amount_Soles), 0);

        const completedRooms = budgetData.filter(row => row.Status === 'Completed').length;
        const totalRooms = budgetData.length;
        const progressPercent = ((totalSpent / totalBudget) * 100).toFixed(1);

        // Key metrics
        worksheet.addRow([]);
        worksheet.addRow(['KEY PROJECT METRICS']).font = { size: 14, bold: true };
        worksheet.addRow([]);

        const metrics = [
            ['Total Project Budget', this.formatCurrency(totalBudget)],
            ['Room Budget Spent', this.formatCurrency(totalSpent)],
            ['Additional Expenses', this.formatCurrency(totalExpenses)],
            ['Total Spent', this.formatCurrency(totalSpent + totalExpenses)],
            ['Remaining Budget', this.formatCurrency(totalBudget - totalSpent)],
            ['Available Funding', this.formatCurrency(totalIncome)],
            ['', ''],
            ['Rooms Completed', `${completedRooms} of ${totalRooms}`],
            ['Project Progress', `${progressPercent}%`],
            ['Average per Room', this.formatCurrency(totalBudget / totalRooms)]
        ];

        metrics.forEach(([label, value]) => {
            const row = worksheet.addRow([label, value]);
            if (label) {
                row.getCell(1).font = { bold: true };
            }
        });

        // Status by room
        worksheet.addRow([]);
        worksheet.addRow(['ROOM STATUS']).font = { size: 14, bold: true };
        worksheet.addRow([]);

        budgetData.forEach(room => {
            const budget = this.parseCurrency(room.Budget);
            const actual = this.parseCurrency(room.Actual);
            const status = actual > 0 ?
                (actual > budget ? `Over by ${this.formatCurrency(actual - budget)}` :
                 `Under by ${this.formatCurrency(budget - actual)}`) :
                'Not started';

            worksheet.addRow([room.Room, room.Status, status]);
        });
    }

    async generateReport() {
        try {
            console.log('Generating Excel report...');

            await this.createDashboardSheet();
            await this.createBudgetSummarySheet();
            await this.createExpenseSheet();
            await this.createProductSheet();

            const filename = `apartment-remodel-report-${new Date().toISOString().split('T')[0]}.xlsx`;
            const filepath = path.join(this.outputDir, filename);

            await this.workbook.xlsx.writeFile(filepath);
            console.log(`✅ Report generated successfully: ${filepath}`);

            return filepath;
        } catch (error) {
            console.error('❌ Error generating report:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new ExcelReportGenerator();
    generator.generateReport()
        .then(filepath => {
            console.log('\n📊 Excel report ready!');
            console.log(`📁 File: ${filepath}`);
        })
        .catch(error => {
            console.error('Failed to generate report:', error);
            process.exit(1);
        });
}

module.exports = ExcelReportGenerator;