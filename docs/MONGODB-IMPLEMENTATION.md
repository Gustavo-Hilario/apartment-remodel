# MongoDB Implementation for Apartment Remodel Project

## Overview

This document describes the MongoDB database structure implemented for the apartment remodel project. The database is designed with **Rooms** as the main collection, with **Expenses** as a separate but related collection.

## Database Structure

### Database Name
`apartment_remodel`

### Collections

#### 1. **rooms** (Main Collection)

This is the primary collection containing all room information and their associated items (materials, services, products, labor).

**Schema:**
```javascript
{
  _id: ObjectId,
  name: String,              // e.g., "Cocina", "Sala", "Cuarto 1"
  slug: String,              // e.g., "cocina", "sala", "cuarto1"
  budget: Number,            // Total budget for the room
  actual_spent: Number,      // Total actual spent
  progress_percent: Number,  // Completion percentage (0-100)
  completed_items: Number,   // Number of completed items
  total_items: Number,       // Total number of items
  status: String,            // "Planning", "In Progress", "Completed"
  items: [                   // Embedded array of room items
    {
      description: String,   // Item description
      category: String,      // "Materials", "Services", "Products", "Labor"
      quantity: Number,      // Quantity needed
      unit: String,          // Unit of measurement (m^2, unit, etc.)
      budget_price: Number,  // Budgeted price per unit
      actual_price: Number,  // Actual price per unit
      subtotal: Number,      // Calculated subtotal
      status: String         // "Pending", "Planning", "Completed"
    }
  ],
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `name`: Unique index
- `slug`: Unique index
- `status`: Standard index

**Current Rooms:**
1. Cocina (Kitchen) - 17 items - S/ 40,000 budget
2. Sala (Living Room) - 16 items - S/ 30,000 budget
3. Cuarto 1 (Bedroom 1) - 9 items - S/ 20,000 budget
4. Cuarto 2 (Bedroom 2) - 9 items - S/ 20,000 budget
5. Cuarto 3 (Bedroom 3) - 5 items - S/ 15,000 budget
6. Baño 1 (Bathroom 1) - 5 items - S/ 15,000 budget
7. Baño 2 (Bathroom 2) - 5 items - S/ 15,000 budget
8. Baño Visita (Guest Bathroom) - 5 items - S/ 10,000 budget
9. Balcón (Balcony) - 6 items - S/ 5,000 budget

**Total Project:** S/ 170,000 budget, 77 items, 11 completed

---

#### 2. **expenses** (Related Collection)

This collection stores expenses that are either general (not tied to any room), specific to one room, or applied to all rooms.

**Schema:**
```javascript
{
  _id: ObjectId,
  room_id: ObjectId | null,     // Reference to rooms._id (null for general)
  room_name: String,             // Room name for reference
  is_general: Boolean,           // True if not tied to a specific room
  applies_to_all_rooms: Boolean, // True if expense applies to all rooms
  date: Date,                    // Expense date
  category: String,              // e.g., "Documentación", "Labor"
  room_category: String,         // Category within the room context
  description: String,           // Expense description
  amount: Number,                // Expense amount
  created_at: Date
}
```

**Indexes:**
- `room_id`: Standard index
- `date`: Descending index
- `category`: Standard index
- `is_general`: Standard index
- `applies_to_all_rooms`: Standard index

**Expense Types:**
1. **General Expenses** (`is_general: true`): Not tied to any specific room (e.g., documentation fees)
2. **All Rooms Expenses** (`applies_to_all_rooms: true`): Shared across all rooms (e.g., labor advances)
3. **Room-Specific Expenses** (`room_id: ObjectId`): Tied to a specific room

---

## Relationships

```
┌─────────────┐
│   rooms     │ (Main Collection)
│             │
│  - _id      │◄──────┐
│  - name     │       │
│  - items[]  │       │  Reference (optional)
│  - budget   │       │
└─────────────┘       │
                      │
                ┌─────┴──────┐
                │  expenses  │
                │            │
                │  - room_id │ (can be null)
                │  - amount  │
                └────────────┘
```

**Relationship Details:**
- **One-to-Many**: One room can have many expenses
- **Flexible**: Expenses can exist without a room (`room_id: null`)
- **Special Cases**:
  - General expenses: `is_general: true`, `room_id: null`
  - Shared expenses: `applies_to_all_rooms: true`, `room_id: null`

---

## Repository Layer

### RoomsRepository (`db/roomsRepository.js`)

**Main Methods:**

1. **Read Operations:**
   - `getAllRooms()` - Get all rooms with full details
   - `getRoomsOverview()` - Get summary without items
   - `getRoomById(id)` - Get room by MongoDB ObjectId
   - `getRoomByName(name)` - Get room by name
   - `getRoomBySlug(slug)` - Get room by slug
   - `getTotals()` - Get aggregated totals across all rooms

2. **Write Operations:**
   - `createRoom(roomData)` - Create a new room
   - `updateRoom(id, updates)` - Update room data
   - `addRoomItem(roomId, item)` - Add an item to a room
   - `updateRoomItem(roomId, itemIndex, updates)` - Update a specific item
   - `recalculateRoomStats(roomId)` - Recalculate totals and progress

3. **Related Data:**
   - `getRoomExpenses(roomId)` - Get all expenses for a room

---

### ExpensesRepository (`db/expensesRepository.js`)

**Main Methods:**

1. **Read Operations:**
   - `getAllExpenses()` - Get all expenses
   - `getExpensesByRoom(roomId)` - Get expenses for a specific room
   - `getGeneralExpenses()` - Get general expenses only
   - `getExpensesForAllRooms()` - Get expenses that apply to all rooms
   - `getExpensesByCategory(category)` - Get expenses by category
   - `getExpensesByRoomCategory(roomCategory)` - Get by room category

2. **Aggregations:**
   - `getExpensesSummary(startDate, endDate)` - Summary by category
   - `getTotalExpenses(options)` - Total with filters
   - `getExpensesWithRoomDetails()` - Expenses joined with room data

3. **Write Operations:**
   - `createExpense(expenseData)` - Create new expense
   - `updateExpense(id, updates)` - Update expense
   - `deleteExpense(id)` - Delete expense

---

## Usage Examples

### Getting Room Overview
```javascript
const roomsRepo = require('./db/roomsRepository');

// Get all rooms overview
const rooms = await roomsRepo.getRoomsOverview();
// Returns: [{ name, slug, budget, actual_spent, progress_percent, status, ... }]

// Get totals
const totals = await roomsRepo.getTotals();
// Returns: [{ total_budget, total_actual, total_rooms, total_items, total_completed }]
```

### Working with Room Items
```javascript
// Get room with all items
const cocina = await roomsRepo.getRoomByName('Cocina');
console.log(cocina.items); // Array of all items

// Update an item
await roomsRepo.updateRoomItem(roomId, 0, { 
  actual_price: 1500, 
  status: 'Completed' 
});

// Recalculate stats
await roomsRepo.recalculateRoomStats(roomId);
```

### Querying Expenses
```javascript
const expensesRepo = require('./db/expensesRepository');

// Get general expenses
const general = await expensesRepo.getGeneralExpenses();

// Get expenses for all rooms
const shared = await expensesRepo.getExpensesForAllRooms();

// Get expenses by category
const labor = await expensesRepo.getExpensesByCategory('Labor');

// Get summary
const summary = await expensesRepo.getExpensesSummary();
```

---

## Migration Script

**File:** `migrate-to-mongodb.js`

**Purpose:** Migrates data from CSV files to MongoDB

**Source Data:**
- `depa/apartment-remodel/data/rooms/*.csv` - Room data with items
- `depa/apartment-remodel/data/expenses.csv` - Expense data

**Running Migration:**
```bash
node migrate-to-mongodb.js
```

**What It Does:**
1. Connects to MongoDB (`mongodb://localhost:27017/apartment_remodel`)
2. Clears existing collections
3. Parses room CSV files (special format: metadata + items)
4. Creates room documents with embedded items
5. Parses expenses CSV
6. Creates expense documents with proper references
7. Creates indexes for performance
8. Displays summary

---

## Connection Setup

**File:** `db/connection.js`

**Configuration:**
- URL: `mongodb://localhost:27017` (default)
- Database: `apartment_remodel`
- Environment Variables:
  - `MONGO_URL` - Custom MongoDB URL
  - `DB_NAME` - Custom database name

**Usage:**
```javascript
const { connectDB, getCollection } = require('./db/connection');

// Get a collection
const collection = await getCollection('rooms');
```

---

## Testing

**File:** `test-mongodb.js`

Run tests to verify everything is working:
```bash
node test-mongodb.js
```

Tests cover:
- Getting all rooms
- Getting totals
- Getting specific rooms
- Querying expenses
- General vs room-specific expenses
- Summary aggregations

---

## Current Project Status

- **Total Budget:** S/ 170,000
- **Total Spent:** S/ 4,000
- **Overall Progress:** 14.3% (11/77 items completed)
- **Rooms:** 9 total
- **Items:** 77 total (across all rooms)
- **Expenses:** 5 tracked
  - 4 general expenses (documentation)
  - 1 shared expense (labor advance)

---

## MongoDB Service Management

**Start MongoDB:**
```bash
brew services start mongodb/brew/mongodb-community@8.0
```

**Stop MongoDB:**
```bash
brew services stop mongodb/brew/mongodb-community@8.0
```

**Check Status:**
```bash
brew services list
```

**MongoDB Shell:**
```bash
mongosh
use apartment_remodel
db.rooms.find()
db.expenses.find()
```

---

## Next Steps

1. **Server Integration**: Update the server.js to use MongoDB instead of CSV files
2. **API Endpoints**: Create REST API endpoints for:
   - GET /api/rooms - Get all rooms
   - GET /api/rooms/:id - Get room details
   - PUT /api/rooms/:id/items/:index - Update item
   - GET /api/expenses - Get all expenses
   - POST /api/expenses - Create expense
3. **Real-time Updates**: Implement WebSocket or polling for live updates
4. **Data Validation**: Add schema validation in MongoDB
5. **Backup Strategy**: Implement regular backups
6. **Analytics**: Create aggregate queries for advanced reporting

---

## Files Created/Modified

1. **db/connection.js** - MongoDB connection manager
2. **db/roomsRepository.js** - Rooms data access layer
3. **db/expensesRepository.js** - Expenses data access layer
4. **migrate-to-mongodb.js** - Migration script from CSV to MongoDB
5. **test-mongodb.js** - Repository testing script

---

## Benefits of This Structure

1. **Embedded Items**: Room items are embedded, reducing joins and improving read performance
2. **Flexible Expenses**: Supports general, room-specific, and shared expenses
3. **Calculated Fields**: Progress and totals are pre-calculated and stored
4. **Indexed Queries**: Common queries are indexed for performance
5. **Repository Pattern**: Clean separation between data access and business logic
6. **Type Safety**: Clear schema definitions for all documents
7. **Scalability**: Can easily add more rooms or expense types
8. **Audit Trail**: Created/updated timestamps on all documents
