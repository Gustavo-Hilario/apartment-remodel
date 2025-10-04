# MongoDB Quick Reference Commands

## Connection

```bash
# Connect to MongoDB shell
mongosh

# Use the apartment_remodel database
use apartment_remodel
```

## Useful Queries

### Rooms Collection

```javascript
// Get all rooms (summary)
db.rooms.find({}, { name: 1, budget: 1, actual_spent: 1, status: 1 }).pretty()

// Get specific room by name
db.rooms.findOne({ name: "Cocina" })

// Get rooms with low progress
db.rooms.find({ progress_percent: { $lt: 10 } })

// Get room items only
db.rooms.findOne({ slug: "cocina" }, { items: 1 })

// Count total rooms
db.rooms.countDocuments()

// Update room status
db.rooms.updateOne(
  { name: "Cocina" },
  { $set: { status: "In Progress", updated_at: new Date() } }
)
```

### Expenses Collection

```javascript
// Get all expenses
db.expenses.find().sort({ date: -1 }).pretty()

// Get general expenses only
db.expenses.find({ is_general: true })

// Get expenses that apply to all rooms
db.expenses.find({ applies_to_all_rooms: true })

// Get expenses by category
db.expenses.find({ category: "Labor" })

// Total expenses by category
db.expenses.aggregate([
  { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  { $sort: { total: -1 } }
])

// Add new expense
db.expenses.insertOne({
  room_id: null,
  room_name: "General",
  is_general: true,
  applies_to_all_rooms: false,
  date: new Date(),
  category: "Documentación",
  room_category: "Documentación",
  description: "New Document Fee",
  amount: 500,
  created_at: new Date()
})
```

## Aggregation Queries

### Total Budget vs Actual

```javascript
db.rooms.aggregate([
  {
    $group: {
      _id: null,
      total_budget: { $sum: "$budget" },
      total_actual: { $sum: "$actual_spent" },
      total_items: { $sum: "$total_items" },
      completed_items: { $sum: "$completed_items" }
    }
  }
])
```

### Rooms by Status

```javascript
db.rooms.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Items by Category (across all rooms)

```javascript
db.rooms.aggregate([
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.category",
      total_budget: { $sum: { $multiply: ["$items.budget_price", "$items.quantity"] } },
      total_actual: { $sum: { $multiply: ["$items.actual_price", "$items.quantity"] } },
      count: { $sum: 1 }
    }
  },
  { $sort: { total_budget: -1 } }
])
```

### Expenses with Room Details (JOIN)

```javascript
db.expenses.aggregate([
  {
    $lookup: {
      from: "rooms",
      localField: "room_id",
      foreignField: "_id",
      as: "room_details"
    }
  },
  { $unwind: { path: "$room_details", preserveNullAndEmptyArrays: true } }
])
```

## Backup & Restore

### Backup

```bash
# Backup entire database
mongodump --db apartment_remodel --out ~/backups/apartment-remodel-$(date +%Y%m%d)

# Backup specific collection
mongodump --db apartment_remodel --collection rooms --out ~/backups/rooms-backup
```

### Restore

```bash
# Restore entire database
mongorestore --db apartment_remodel ~/backups/apartment-remodel-20251004/apartment_remodel

# Restore specific collection
mongorestore --db apartment_remodel --collection rooms ~/backups/rooms-backup/apartment_remodel/rooms.bson
```

## Export to JSON

```bash
# Export rooms to JSON
mongoexport --db apartment_remodel --collection rooms --out rooms.json --pretty

# Export expenses to JSON
mongoexport --db apartment_remodel --collection expenses --out expenses.json --pretty
```

## Import from JSON

```bash
# Import rooms from JSON
mongoimport --db apartment_remodel --collection rooms --file rooms.json --jsonArray

# Import expenses from JSON
mongoimport --db apartment_remodel --collection expenses --file expenses.json --jsonArray
```

## Indexes

```javascript
// List indexes for rooms
db.rooms.getIndexes()

// List indexes for expenses
db.expenses.getIndexes()

// Create custom index
db.rooms.createIndex({ "items.status": 1 })

// Drop index
db.rooms.dropIndex("items.status_1")
```

## Database Administration

```javascript
// Database statistics
db.stats()

// Collection statistics
db.rooms.stats()
db.expenses.stats()

// Drop collection (DANGEROUS!)
db.rooms.drop()

// Drop database (VERY DANGEROUS!)
db.dropDatabase()
```

## Node.js Repository Usage

```javascript
const roomsRepo = require('./db/roomsRepository');
const expensesRepo = require('./db/expensesRepository');

// Get all rooms
const rooms = await roomsRepo.getAllRooms();

// Get specific room
const cocina = await roomsRepo.getRoomBySlug('cocina');

// Get room expenses
const expenses = await roomsRepo.getRoomExpenses(roomId);

// Create expense
const expenseId = await expensesRepo.createExpense({
  room_id: null,
  room_name: 'General',
  is_general: true,
  applies_to_all_rooms: false,
  date: new Date(),
  category: 'Materials',
  description: 'Cement bags',
  amount: 500
});
```

## Useful One-Liners

```bash
# Count documents in each collection
mongosh apartment_remodel --quiet --eval "print('Rooms: ' + db.rooms.countDocuments()); print('Expenses: ' + db.expenses.countDocuments());"

# Show total budget
mongosh apartment_remodel --quiet --eval "var r = db.rooms.aggregate([{$group:{_id:null,total:{$sum:'$budget'}}}]).toArray(); print('Total Budget: S/ ' + r[0].total);"

# Show completion percentage
mongosh apartment_remodel --quiet --eval "var r = db.rooms.aggregate([{$group:{_id:null,completed:{$sum:'$completed_items'},total:{$sum:'$total_items'}}}]).toArray(); print('Progress: ' + (r[0].completed/r[0].total*100).toFixed(1) + '%');"
```
