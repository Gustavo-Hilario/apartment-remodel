#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Route to save room data
app.post('/api/save-room/:roomName', (req, res) => {
    try {
        const { roomName } = req.params;
        const { roomData } = req.body;

        // Validate room name
        const validRooms = ['cocina', 'sala', 'cuarto1', 'cuarto2', 'cuarto3', 'bano1', 'bano2', 'bano_visita', 'balcon'];
        if (!validRooms.includes(roomName)) {
            return res.status(400).json({ error: 'Invalid room name' });
        }

        // Generate CSV content
        let csvContent = `Room,${roomData.name}\n`;
        csvContent += `Budget,${roomData.budget}\n`;
        csvContent += 'Description,Category,Quantity,Unit,Budget_Price,Actual_Price,Subtotal,Status\n';

        roomData.items.forEach(item => {
            csvContent += `${item.description},${item.category},${item.quantity},${item.unit},${item.budgetRate},${item.actualRate},${item.subtotal},${item.status}\n`;
        });

        // Save to file
        const filePath = path.join(__dirname, '..', 'data', 'rooms', `${roomName}.csv`);
        fs.writeFileSync(filePath, csvContent, 'utf8');

        console.log(`✅ Saved ${roomData.name} data to ${filePath}`);

        // Auto-run aggregation
        const { spawn } = require('child_process');
        const aggregateProcess = spawn('node', [path.join(__dirname, 'data-aggregator.js')], {
            cwd: path.join(__dirname, '..')
        });

        aggregateProcess.on('close', (code) => {
            console.log(`📊 Data aggregation completed with code ${code}`);
        });

        res.json({
            success: true,
            message: `${roomData.name} data saved successfully`,
            filePath: `data/rooms/${roomName}.csv`
        });

    } catch (error) {
        console.error('Error saving room data:', error);
        res.status(500).json({ error: 'Failed to save room data', details: error.message });
    }
});

// Route to save expenses data
app.post('/api/save-expenses', (req, res) => {
    try {
        const { expenses } = req.body;

        // Generate CSV content for main expenses file
        let csvContent = 'Description,Amount,Category,Date,Room\n';
        
        expenses.forEach(expense => {
            const amount = `"S/ ${expense.amount.toLocaleString('es-PE')}"`;
            csvContent += `${expense.description},${amount},${expense.category},${expense.date || ''},${expense.room || ''}\n`;
        });

        // Save to main expenses file
        const filePath = path.join(__dirname, '..', 'data', 'expenses.csv');
        fs.writeFileSync(filePath, csvContent, 'utf8');

        console.log(`✅ Saved expenses data to ${filePath}`);

        // Save expenses to individual room CSV files
        const roomNameMap = {
            'Cocina': 'cocina',
            'Sala': 'sala',
            'Cuarto 1': 'cuarto1',
            'Cuarto 2': 'cuarto2',
            'Cuarto 3': 'cuarto3',
            'Baño 1': 'bano1',
            'Baño 2': 'bano2',
            'Baño Visita': 'bano_visita',
            'Balcón': 'balcon'
        };

        expenses.forEach(expense => {
            if (expense.room && roomNameMap[expense.room]) {
                const roomFileName = roomNameMap[expense.room];
                const roomFilePath = path.join(__dirname, '..', 'data', 'rooms', `${roomFileName}.csv`);

                if (fs.existsSync(roomFilePath)) {
                    // Read existing room file
                    const roomContent = fs.readFileSync(roomFilePath, 'utf8');
                    const roomLines = roomContent.split('\n');

                    // Check if this expense already exists in the room file
                    const expenseExists = roomLines.some(line => 
                        line.includes(expense.description) && line.includes('General')
                    );

                    if (!expenseExists) {
                        // Add new line for this expense with category "General"
                        const amount = parseFloat(expense.amount);
                        const newLine = `${expense.description},General,1,,0,${amount},${amount},Completed`;
                        
                        // Insert before the last line (which might be empty)
                        const lastLineEmpty = roomLines[roomLines.length - 1].trim() === '';
                        if (lastLineEmpty) {
                            roomLines.splice(roomLines.length - 1, 0, newLine);
                        } else {
                            roomLines.push(newLine);
                        }

                        // Write back to room file
                        fs.writeFileSync(roomFilePath, roomLines.join('\n'), 'utf8');
                        console.log(`✅ Added expense "${expense.description}" to ${expense.room} (${roomFileName}.csv)`);
                    }
                }
            }
        });

        // Auto-run aggregation
        const { spawn } = require('child_process');
        const aggregateProcess = spawn('node', [path.join(__dirname, 'data-aggregator.js')], {
            cwd: path.join(__dirname, '..')
        });

        aggregateProcess.on('close', (code) => {
            console.log(`📊 Data aggregation completed with code ${code}`);
        });

        res.json({
            success: true,
            message: 'Expenses data saved successfully',
            filePath: 'data/expenses.csv'
        });

    } catch (error) {
        console.error('Error saving expenses data:', error);
        res.status(500).json({ error: 'Failed to save expenses data', details: error.message });
    }
});

// Route to load room data
app.get('/api/load-room/:roomName', (req, res) => {
    try {
        const { roomName } = req.params;
        const filePath = path.join(__dirname, '..', 'data', 'rooms', `${roomName}.csv`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Room file not found' });
        }

        const csvContent = fs.readFileSync(filePath, 'utf8');
        const lines = csvContent.split('\n');

        // Parse room data
        const roomNameLine = lines[0].split(',');
        const budgetLine = lines[1].split(',');

        const roomData = {
            name: roomNameLine[1],
            budget: parseFloat(budgetLine[1]) || 0,
            items: []
        };

        // Parse items
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length >= 8) {
                roomData.items.push({
                    description: parts[0],
                    category: parts[1],
                    quantity: parseFloat(parts[2]) || 1,
                    unit: parts[3] || '',
                    budgetRate: parseFloat(parts[4]) || 0,
                    actualRate: parseFloat(parts[5]) || 0,
                    subtotal: parseFloat(parts[6]) || 0,
                    status: parts[7] || 'Planning'
                });
            }
        }

        res.json({ success: true, roomData });

    } catch (error) {
        console.error('Error loading room data:', error);
        res.status(500).json({ error: 'Failed to load room data', details: error.message });
    }
});

// Route to load expenses data (for main project costs)
app.get('/api/load-expenses', (req, res) => {
    try {
        const expensesPath = path.join(__dirname, '..', 'data', 'expenses.csv');
        
        if (!fs.existsSync(expensesPath)) {
            return res.status(404).json({ error: 'Expenses file not found' });
        }

        const csvContent = fs.readFileSync(expensesPath, 'utf8');
        const lines = csvContent.split('\n');
        
        const expenses = [];
        
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = parseCSVLine(line);
            if (parts.length >= 3) {
                expenses.push({
                    description: parts[0],
                    amount: parseCurrencyValue(parts[1]),
                    category: parts[2],
                    date: parts[3] || '',
                    room: parts[4] || ''
                });
            }
        }

        res.json({ success: true, expenses });

    } catch (error) {
        console.error('Error loading expenses data:', error);
        res.status(500).json({ error: 'Failed to load expenses data', details: error.message });
    }
});

// Helper function to parse CSV lines with quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Helper function to parse currency values
function parseCurrencyValue(value) {
    if (!value || value === '') return 0;
    // Remove currency symbols, quotes, and spaces, then parse
    return parseFloat(value.replace(/[S/\s,"]/g, '')) || 0;
}

// Start server
app.listen(port, () => {
    console.log(`🚀 Apartment Remodel Server running at http://localhost:${port}`);
    console.log(`🏠 Open http://localhost:${port}/home.html to get started`);
    console.log(`✏️ Room Editor: http://localhost:${port}/charts/room-editor.html`);
});

module.exports = app;