# Table Headers Documentation

## Overview
This document describes the table structures used across the apartment remodel application.

## Table Headers by Page

### 1. Budget Overview (`charts/budget-overview.html`)
**Purpose**: Display summary of all rooms with budget comparison

**Headers**:
- ⭐ (Favorite) - Width: 50px - Currently empty, reserved for future favorite rooms feature
- Room - Room name
- Budget - Budgeted amount
- Actual - Actual spent amount
- Difference - Budget vs Actual difference
- Status - Room completion status (Not Started, In Progress, Completed)

**Data Source**: `/api/rooms` endpoint (MongoDB via Mongoose)

### 2. Room Editor (`charts/room-editor.html`)
**Purpose**: Edit individual room items with detailed pricing

**Headers**:
- ⭐ (Favorite) - Width: 50px - Star/unstar individual items
- Description - Item description
- Category - Item category (dropdown)
- Qty - Quantity (Width: 60px)
- Unit - Unit of measurement (Width: 80px)
- Budget Price - Budgeted price per unit
- Actual Price - Actual price per unit
- Subtotal - Calculated total (Qty × Actual Price)
- Status - Item status (Planning, Pending, Ordered, Completed)
- Actions - Delete button (Width: 100px)

**Data Source**: `/api/load-room/:roomName` endpoint (MongoDB via Mongoose)

**Schema Fields**:
```javascript
{
  favorite: Boolean (default: false),
  imageUrl: String (default: ''),
  links: Array of {name, url},
  notes: String (default: '')
}
```

### 3. Products Page (`charts/products.html`)
**Purpose**: Product gallery with favorites filtering

**Layout**: Card-based (not table)
- Uses product cards with modal editor
- Shows favorite badge on cards
- Filters: "All Items" / "Favorites Only"

## Header Consistency

All table headers with star (⭐) column use:
```html
<th style="width: 50px;">⭐</th>
```

This ensures consistent column width across all tables.

## Future Enhancements

### Potential Dynamic Headers
While currently hardcoded in HTML, headers could be made dynamic:

**Option 1**: Client-side configuration
```javascript
const tableHeaders = {
  budgetOverview: ['⭐', 'Room', 'Budget', 'Actual', 'Difference', 'Status'],
  roomEditor: ['⭐', 'Description', 'Category', 'Qty', 'Unit', 'Budget Price', 'Actual Price', 'Subtotal', 'Status', 'Actions']
};
```

**Option 2**: Server-side metadata
```javascript
// GET /api/table-config/:tableName
{
  headers: [...],
  columnWidths: {...},
  sortable: [...]
}
```

**Current Decision**: Keep hardcoded
- Headers are part of UI structure
- No requirement for user customization
- Simpler to maintain
- Better performance (no extra API calls)

## Maintenance Notes

When adding a new column:
1. Update `<thead>` section with new `<th>`
2. Update row generation logic to add corresponding `<td>`
3. Ensure column count matches in header and body
4. Add appropriate width styling if needed
5. Update this documentation

## Related Files
- `/depa/apartment-remodel/charts/budget-overview.html` - Budget summary table
- `/depa/apartment-remodel/charts/room-editor.html` - Item editor table
- `/depa/apartment-remodel/charts/products.html` - Product cards (no table)
- `/depa/apartment-remodel/db/models/Room.js` - Room/Item schema
- `/depa/apartment-remodel/scripts/server.js` - API endpoints
