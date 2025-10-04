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
        const validRooms = [
            'cocina',
            'sala',
            'cuarto1',
            'cuarto2',
            'cuarto3',
            'bano1',
            'bano2',
            'bano_visita',
            'balcon',
        ];
        if (!validRooms.includes(roomName)) {
            return res.status(400).json({ error: 'Invalid room name' });
        }

        // Generate CSV content
        let csvContent = `Room,${roomData.name}\n`;
        csvContent += `Budget,${roomData.budget}\n`;
        csvContent +=
            'Description,Category,Quantity,Unit,Budget_Price,Actual_Price,Subtotal,Status\n';

        roomData.items.forEach((item) => {
            csvContent += `${item.description},${item.category},${item.quantity},${item.unit},${item.budgetRate},${item.actualRate},${item.subtotal},${item.status}\n`;
        });

        // Save to file
        const filePath = path.join(
            __dirname,
            '..',
            'data',
            'rooms',
            `${roomName}.csv`
        );
        fs.writeFileSync(filePath, csvContent, 'utf8');

        console.log(`✅ Saved ${roomData.name} data to ${filePath}`);

        // Auto-run aggregation
        const { spawn } = require('child_process');
        const aggregateProcess = spawn(
            'node',
            [path.join(__dirname, 'data-aggregator.js')],
            {
                cwd: path.join(__dirname, '..'),
            }
        );

        aggregateProcess.on('close', (code) => {
            console.log(`📊 Data aggregation completed with code ${code}`);
        });

        res.json({
            success: true,
            message: `${roomData.name} data saved successfully`,
            filePath: `data/rooms/${roomName}.csv`,
        });
    } catch (error) {
        console.error('Error saving room data:', error);
        res.status(500).json({
            error: 'Failed to save room data',
            details: error.message,
        });
    }
});

// Helper function to check if categories match (handles legacy Spanish names)
function categoriesMatch(category1, category2) {
    if (category1 === category2) return true;

    // Map legacy Spanish names to English
    const categoryMap = {
        Servicio: 'Services',
        Material: 'Materials',
        Producto: 'Products',
        'Mano de Obra': 'Labor',
    };

    // Check if either category maps to the other
    return (
        categoryMap[category1] === category2 ||
        categoryMap[category2] === category1
    );
}

// Route to save expenses data
app.post('/api/save-expenses', (req, res) => {
    try {
        const { expenses } = req.body;

        // First, read existing expenses to detect deletions
        const expensesFilePath = path.join(
            __dirname,
            '..',
            'data',
            'expenses.csv'
        );
        let existingExpenses = [];

        if (fs.existsSync(expensesFilePath)) {
            const existingContent = fs.readFileSync(expensesFilePath, 'utf8');
            const existingLines = existingContent.split('\n');

            for (let i = 1; i < existingLines.length; i++) {
                const line = existingLines[i].trim();
                if (!line) continue;

                const parts = parseCSVLine(line);
                if (parts.length >= 6) {
                    existingExpenses.push({
                        description: parts[0],
                        amount: parseCurrencyValue(parts[1]),
                        category: parts[2],
                        date: parts[3],
                        room: parts[4],
                        roomCategory: parts[5],
                    });
                }
            }
        }

        // Detect deleted expenses (expenses that were in existing but not in new)
        const deletedExpenses = existingExpenses.filter(
            (existing) =>
                !expenses.some(
                    (exp) =>
                        exp.description === existing.description &&
                        exp.category === existing.category &&
                        exp.room === existing.room &&
                        exp.roomCategory === existing.roomCategory
                )
        );

        // Remove deleted expenses from room CSVs
        if (deletedExpenses.length > 0) {
            console.log(
                `\n🗑️  Removing ${deletedExpenses.length} deleted expense(s) from room CSVs...`
            );

            const roomNameMap = {
                Cocina: 'cocina',
                Sala: 'sala',
                'Cuarto 1': 'cuarto1',
                'Cuarto 2': 'cuarto2',
                'Cuarto 3': 'cuarto3',
                'Baño 1': 'bano1',
                'Baño 2': 'bano2',
                'Baño Visita': 'bano_visita',
                Balcón: 'balcon',
            };

            deletedExpenses.forEach((deleted) => {
                console.log(
                    `   Deleting: "${deleted.description}" (${
                        deleted.roomCategory || 'General'
                    })`
                );

                // Determine which rooms to delete from
                let roomsToClean = [];
                if (deleted.room === 'All Rooms') {
                    roomsToClean = Object.values(roomNameMap);
                } else if (deleted.room && roomNameMap[deleted.room]) {
                    roomsToClean = [roomNameMap[deleted.room]];
                }

                roomsToClean.forEach((roomFileName) => {
                    const roomFilePath = path.join(
                        __dirname,
                        '..',
                        'data',
                        'rooms',
                        `${roomFileName}.csv`
                    );

                    if (fs.existsSync(roomFilePath)) {
                        const roomContent = fs.readFileSync(
                            roomFilePath,
                            'utf8'
                        );
                        const roomLines = roomContent.split('\n');

                        // Filter out lines matching the deleted expense
                        const filteredLines = [];
                        let deletedCount = 0;

                        for (let i = 0; i < roomLines.length; i++) {
                            if (i < 3) {
                                // Keep header lines
                                filteredLines.push(roomLines[i]);
                                continue;
                            }

                            const line = roomLines[i].trim();
                            if (!line) {
                                filteredLines.push(roomLines[i]);
                                continue;
                            }

                            const parts = line.split(',');
                            // Check if this line matches the deleted expense
                            const matchesDescription =
                                parts[0] === deleted.description;
                            const matchesCategory = deleted.roomCategory
                                ? categoriesMatch(
                                      parts[1],
                                      deleted.roomCategory
                                  )
                                : parts[1] === 'General';

                            if (matchesDescription && matchesCategory) {
                                deletedCount++;
                                console.log(
                                    `      ✓ Removed from ${roomFileName}.csv`
                                );
                                continue; // Skip this line (delete it)
                            }

                            filteredLines.push(roomLines[i]);
                        }

                        if (deletedCount > 0) {
                            fs.writeFileSync(
                                roomFilePath,
                                filteredLines.join('\n'),
                                'utf8'
                            );
                        }
                    }
                });
            });
            console.log('');
        }

        // Generate CSV content for main expenses file
        let csvContent = 'Description,Amount,Category,Date,Room,RoomCategory\n';

        expenses.forEach((expense) => {
            const amount = `"S/ ${expense.amount.toLocaleString('es-PE')}"`;
            csvContent += `${expense.description},${amount},${
                expense.category
            },${expense.date || ''},${expense.room || ''},${
                expense.roomCategory || ''
            }\n`;
        });

        // Save to main expenses file
        const filePath = path.join(__dirname, '..', 'data', 'expenses.csv');
        fs.writeFileSync(filePath, csvContent, 'utf8');

        console.log(`✅ Saved expenses data to ${filePath}`);

        // Save expenses to individual room CSV files
        const roomNameMap = {
            Cocina: 'cocina',
            Sala: 'sala',
            'Cuarto 1': 'cuarto1',
            'Cuarto 2': 'cuarto2',
            'Cuarto 3': 'cuarto3',
            'Baño 1': 'bano1',
            'Baño 2': 'bano2',
            'Baño Visita': 'bano_visita',
            Balcón: 'balcon',
        };

        expenses.forEach((expense) => {
            // Handle "All Rooms" - split expense equally across all rooms
            if (expense.room === 'All Rooms') {
                const allRoomNames = Object.keys(roomNameMap);
                const totalAmount = parseFloat(expense.amount);
                const amountPerRoom = totalAmount / allRoomNames.length;

                console.log(
                    `\n🏠 Splitting "${expense.description}" (S/ ${totalAmount}) across ${allRoomNames.length} rooms...`
                );
                console.log(
                    `   Amount per room: S/ ${amountPerRoom.toFixed(2)}`
                );

                if (expense.roomCategory && expense.roomCategory !== '') {
                    console.log(
                        `   Category: ${expense.roomCategory} (distributed to items in this category)\n`
                    );
                } else {
                    console.log(`   Category: General (new item)\n`);
                }

                allRoomNames.forEach((roomDisplayName) => {
                    const roomFileName = roomNameMap[roomDisplayName];
                    const roomFilePath = path.join(
                        __dirname,
                        '..',
                        'data',
                        'rooms',
                        `${roomFileName}.csv`
                    );

                    if (fs.existsSync(roomFilePath)) {
                        const roomContent = fs.readFileSync(
                            roomFilePath,
                            'utf8'
                        );
                        const roomLines = roomContent.split('\n');

                        // Check if a room category is selected - distribute to items in that category
                        if (
                            expense.roomCategory &&
                            expense.roomCategory !== ''
                        ) {
                            let itemUpdated = false;

                            // Look for an exact match: description AND category
                            for (let i = 3; i < roomLines.length; i++) {
                                const line = roomLines[i].trim();
                                if (!line) continue;
                                const parts = line.split(',');

                                if (
                                    parts.length >= 8 &&
                                    parts[0] === expense.description &&
                                    categoriesMatch(
                                        parts[1],
                                        expense.roomCategory
                                    )
                                ) {
                                    // Found exact match - update this item
                                    const currentActual =
                                        parseFloat(parts[5]) || 0;
                                    const newActual =
                                        currentActual + amountPerRoom;
                                    const quantity = parseFloat(parts[2]) || 1;
                                    const newSubtotal = newActual * quantity;
                                    parts[5] = newActual;
                                    parts[6] = newSubtotal;
                                    parts[7] = 'Completed'; // Mark as completed
                                    roomLines[i] = parts.join(',');
                                    itemUpdated = true;
                                    break; // Only update one matching item
                                }
                            }

                            if (itemUpdated) {
                                fs.writeFileSync(
                                    roomFilePath,
                                    roomLines.join('\n'),
                                    'utf8'
                                );
                                console.log(
                                    `   ✅ Updated existing "${expense.description}" in ${roomDisplayName}`
                                );
                            } else {
                                // No exact match - add as new item with the expense description
                                const newLine = `${expense.description},${expense.roomCategory},1,,0,${amountPerRoom},${amountPerRoom},Completed`;

                                const lastLineEmpty =
                                    roomLines[roomLines.length - 1].trim() ===
                                    '';
                                if (lastLineEmpty) {
                                    roomLines.splice(
                                        roomLines.length - 1,
                                        0,
                                        newLine
                                    );
                                } else {
                                    roomLines.push(newLine);
                                }

                                fs.writeFileSync(
                                    roomFilePath,
                                    roomLines.join('\n'),
                                    'utf8'
                                );
                                console.log(
                                    `   ✅ Added S/ ${amountPerRoom.toFixed(
                                        2
                                    )} as new "${
                                        expense.roomCategory
                                    }" item in ${roomDisplayName}`
                                );
                            }
                        } else {
                            // No category - add as new General item
                            const expenseExists = roomLines.some(
                                (line) =>
                                    line.includes(expense.description) &&
                                    line.includes('General')
                            );

                            if (!expenseExists) {
                                const newLine = `${expense.description},General,1,,0,${amountPerRoom},${amountPerRoom},Completed`;

                                const lastLineEmpty =
                                    roomLines[roomLines.length - 1].trim() ===
                                    '';
                                if (lastLineEmpty) {
                                    roomLines.splice(
                                        roomLines.length - 1,
                                        0,
                                        newLine
                                    );
                                } else {
                                    roomLines.push(newLine);
                                }

                                fs.writeFileSync(
                                    roomFilePath,
                                    roomLines.join('\n'),
                                    'utf8'
                                );
                                console.log(
                                    `   ✅ Added S/ ${amountPerRoom.toFixed(
                                        2
                                    )} to ${roomDisplayName}`
                                );
                            }
                        }
                    }
                });
            }
            // Handle single room assignment
            else if (expense.room && roomNameMap[expense.room]) {
                const roomFileName = roomNameMap[expense.room];
                const roomFilePath = path.join(
                    __dirname,
                    '..',
                    'data',
                    'rooms',
                    `${roomFileName}.csv`
                );

                if (fs.existsSync(roomFilePath)) {
                    // Read existing room file
                    const roomContent = fs.readFileSync(roomFilePath, 'utf8');
                    const roomLines = roomContent.split('\n');
                    const amount = parseFloat(expense.amount);

                    if (expense.roomCategory && expense.roomCategory !== '') {
                        // Add to ALL items in the specified category
                        let itemUpdated = false;

                        // Look for an exact match: description AND category
                        for (let i = 3; i < roomLines.length; i++) {
                            const line = roomLines[i].trim();
                            if (!line) continue;
                            const parts = line.split(',');

                            if (
                                parts.length >= 8 &&
                                parts[0] === expense.description &&
                                categoriesMatch(parts[1], expense.roomCategory)
                            ) {
                                // Found exact match - update this item
                                const currentActual = parseFloat(parts[5]) || 0;
                                const newActual = currentActual + amount;
                                const quantity = parseFloat(parts[2]) || 1;
                                const newSubtotal = newActual * quantity;
                                parts[5] = newActual;
                                parts[6] = newSubtotal;
                                parts[7] = 'Completed'; // Mark as completed
                                roomLines[i] = parts.join(',');
                                itemUpdated = true;
                                break; // Only update one matching item
                            }
                        }

                        if (itemUpdated) {
                            fs.writeFileSync(
                                roomFilePath,
                                roomLines.join('\n'),
                                'utf8'
                            );
                            console.log(
                                `✅ Updated existing "${expense.description}" in ${expense.room}`
                            );
                        } else {
                            // No exact match - add as new item with the expense description
                            const newLine = `${expense.description},${expense.roomCategory},1,,0,${amount},${amount},Completed`;

                            const lastLineEmpty =
                                roomLines[roomLines.length - 1].trim() === '';
                            if (lastLineEmpty) {
                                roomLines.splice(
                                    roomLines.length - 1,
                                    0,
                                    newLine
                                );
                            } else {
                                roomLines.push(newLine);
                            }

                            fs.writeFileSync(
                                roomFilePath,
                                roomLines.join('\n'),
                                'utf8'
                            );
                            console.log(
                                `✅ Added "${expense.description}" as new "${expense.roomCategory}" item in ${expense.room}`
                            );
                        }
                    } else {
                        // Check if General expense already exists
                        const expenseExists = roomLines.some(
                            (line) =>
                                line.includes(expense.description) &&
                                line.includes('General')
                        );

                        if (!expenseExists) {
                            // Add new line for this expense with category "General"
                            const amount = parseFloat(expense.amount);
                            const newLine = `${expense.description},General,1,,0,${amount},${amount},Completed`;

                            // Insert before the last line (which might be empty)
                            const lastLineEmpty =
                                roomLines[roomLines.length - 1].trim() === '';
                            if (lastLineEmpty) {
                                roomLines.splice(
                                    roomLines.length - 1,
                                    0,
                                    newLine
                                );
                            } else {
                                roomLines.push(newLine);
                            }

                            // Write back to room file
                            fs.writeFileSync(
                                roomFilePath,
                                roomLines.join('\n'),
                                'utf8'
                            );
                            console.log(
                                `✅ Added expense "${expense.description}" to ${expense.room} (${roomFileName}.csv)`
                            );
                        }
                    }
                }
            }
        });

        // Auto-run aggregation
        const { spawn } = require('child_process');
        const aggregateProcess = spawn(
            'node',
            [path.join(__dirname, 'data-aggregator.js')],
            {
                cwd: path.join(__dirname, '..'),
            }
        );

        aggregateProcess.on('close', (code) => {
            console.log(`📊 Data aggregation completed with code ${code}`);
        });

        res.json({
            success: true,
            message: 'Expenses data saved successfully',
            filePath: 'data/expenses.csv',
        });
    } catch (error) {
        console.error('Error saving expenses data:', error);
        res.status(500).json({
            error: 'Failed to save expenses data',
            details: error.message,
        });
    }
});

// Route to load expenses data
app.get('/api/load-expenses', (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'expenses.csv');

        if (!fs.existsSync(filePath)) {
            return res.json({ success: true, expenses: [] });
        }

        const csvContent = fs.readFileSync(filePath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        const expenses = [];
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length >= 3) {
                expenses.push({
                    description: parts[0] || '',
                    amount: parseFloat(parts[1].replace(/[S/\s,]/g, '')) || 0,
                    category: parts[2] || '',
                    date: parts[3] || ''
                });
            }
        }

        res.json({ success: true, expenses });

    } catch (error) {
        console.error('Error loading expenses:', error);
        res.status(500).json({ error: 'Failed to load expenses data', details: error.message });
    }
});

// Route to save expenses data
app.post('/api/save-expenses', (req, res) => {
    try {
        const { expenses } = req.body;

        // Generate CSV content
        let csvContent = 'Description,Amount,Category,Date\n';

        expenses.forEach(expense => {
            const amount = expense.amount || 0;
            const formattedAmount = `"S/ ${amount.toLocaleString('es-PE')}"`;
            csvContent += `${expense.description || ''},${formattedAmount},${expense.category || ''},${expense.date || ''}\n`;
        });

        // Save to file
        const filePath = path.join(__dirname, '..', 'data', 'expenses.csv');
        fs.writeFileSync(filePath, csvContent, 'utf8');

        console.log(`✅ Saved expenses data to ${filePath}`);

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
        const filePath = path.join(
            __dirname,
            '..',
            'data',
            'rooms',
            `${roomName}.csv`
        );

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
            items: [],
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
                    status: parts[7] || 'Planning',
                });
            }
        }

        res.json({ success: true, roomData });
    } catch (error) {
        console.error('Error loading room data:', error);
        res.status(500).json({
            error: 'Failed to load room data',
            details: error.message,
        });
    }
});

// Route to get all unique categories from all rooms
app.get('/api/get-all-categories', (req, res) => {
    try {
        const roomsDir = path.join(__dirname, '..', 'data', 'rooms');
        const roomFiles = [
            'cocina.csv',
            'sala.csv',
            'cuarto1.csv',
            'cuarto2.csv',
            'cuarto3.csv',
            'bano1.csv',
            'bano2.csv',
            'bano_visita.csv',
            'balcon.csv',
        ];

        const allCategories = new Set();

        roomFiles.forEach((roomFile) => {
            const filePath = path.join(roomsDir, roomFile);
            if (fs.existsSync(filePath)) {
                const csvContent = fs.readFileSync(filePath, 'utf8');
                const lines = csvContent.split('\n');

                // Parse items (starting from line 3, after header)
                for (let i = 3; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const parts = line.split(',');
                    if (parts.length >= 8 && parts[1]) {
                        allCategories.add(parts[1]);
                    }
                }
            }
        });

        // Convert Set to sorted array, prioritizing Spanish names
        const categories = Array.from(allCategories).sort((a, b) => {
            // Prioritize Spanish names (Servicio, Material, Producto)
            const spanishOrder = ['Servicio', 'Material', 'Producto'];
            const aIndex = spanishOrder.indexOf(a);
            const bIndex = spanishOrder.indexOf(b);

            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });

        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            error: 'Failed to get categories',
            details: error.message,
        });
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
                    room: parts[4] || '',
                    roomCategory: parts[5] || '',
                });
            }
        }

        res.json({ success: true, expenses });
    } catch (error) {
        console.error('Error loading expenses data:', error);
        res.status(500).json({
            error: 'Failed to load expenses data',
            details: error.message,
        });
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
    console.log(
        `🚀 Apartment Remodel Server running at http://localhost:${port}`
    );
    console.log(`🏠 Open http://localhost:${port}/home.html to get started`);
    console.log(
        `✏️ Room Editor: http://localhost:${port}/charts/room-editor.html`
    );
});

module.exports = app;
