# 🏠 Apartment Remodel Project Tracker

A comprehensive budget tracking and project management system for your apartment remodel project.

## 📊 Current Status

- **Total Budget**: S/ 170,000
- **Spent So Far**: S/ 70,067 (41.2%)
- **Remaining**: S/ 99,933
- **Completed Rooms**: 2/9 (Sala, Cocina)

## 📁 Project Structure

```
apartment-remodel/
├── data/                    # CSV data files
│   ├── main.csv            # Master data file (original)
│   ├── budget-overview.csv # Room-by-room budget summary
│   ├── expenses.csv        # Actual expenses incurred
│   ├── income.csv          # Project funding sources
│   └── products.csv        # Product selection and pricing
├── docs/                   # Project documentation
│   └── 01-project-overview.md
├── charts/                 # HTML visualizations
│   └── budget-overview.html # Interactive budget dashboard
├── scripts/                # Utility scripts
│   ├── generate-excel.js   # Excel report generator
│   └── csv-splitter.js     # CSV data management
├── package.json            # Node.js dependencies
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher) - **No Python required!**
- Modern web browser

### Installation
```bash
# Install dependencies (includes live-server for development)
npm install

# Start local server with live reload
npm start
# or for auto-opening browser:
npm run dev
```

## 📈 Viewing Charts & Reports

### Interactive Dashboard
1. Start the local server: `npm start` (opens automatically)
2. Or use: `npm run dev` (opens browser automatically)
3. Navigate through the beautiful home page interface

### Features:
- **Budget vs Actual comparison** by room
- **Real-time progress tracking**
- **Interactive charts** with Chart.js
- **Live reload** - Changes refresh automatically
- **Responsive design** for mobile/desktop
- **Automatic data loading** from CSV files
- **Pure Node.js** - No Python dependencies!

## 📝 Updating Data

### 🎯 Primary Method: Edit Room-Specific Files
The **room files are your primary data source**. All other tables are auto-generated from them.

1. **Edit room costs**: Modify files in `data/rooms/` (cocina.csv, sala.csv, etc.)
2. **Update all tables**: Run `npm run update-all`
3. **View changes**: Check dashboard at `charts/budget-overview.html`

### 🖥️ Web Interface (Recommended)
```bash
npm start
# Open: http://localhost:8000/charts/room-editor.html
```
- ✅ Easy visual editing of room costs
- ✅ Real-time budget calculations
- ✅ Export CSV files directly
- ✅ Add/remove items with clicks

### 💻 Command Line Method
```bash
# Update all interconnected tables from room data
npm run update-all

# Generate Excel reports
npm run generate-excel

# Manual aggregation only
npm run aggregate
```

## 📊 Data Structure

### Budget Overview (budget-overview.csv)
| Field | Description |
|-------|-------------|
| Room | Room name |
| Budget | Planned budget amount |
| Actual | Actual amount spent |
| Difference | Budget variance |
| Status | Completed/Pending |

### Expenses (expenses.csv)
| Field | Description |
|-------|-------------|
| Description | Expense description |
| Amount | Cost amount |
| Category | Expense category |
| Date | Transaction date |

### Products (products.csv)
| Field | Description |
|-------|-------------|
| Category | Product category |
| Product | Product type |
| Description | Product name/model |
| Selected | TRUE/FALSE selection flag |
| Price | Product price |

## 🔧 Utility Scripts

### Generate Excel Reports
```bash
npm run generate-excel
```
Creates comprehensive Excel reports with:
- Budget summary
- Expense tracking
- Product selections
- Progress charts

### CSV Data Management
```bash
npm run split-csv
```
Maintains separation between focused CSV files and master data.

## 🎯 Key Features

- **Intelligent Data System**: Room files auto-generate all other tables
- **Visual Budget Tracking**: Interactive charts showing budget vs actual
- **Web-based Editor**: Easy point-and-click editing interface
- **Real-time Calculations**: Budgets and totals update automatically
- **Progress Monitoring**: Real-time completion percentage
- **Interconnected Tables**: Change one item, update everywhere
- **Mobile Responsive**: Works on all devices
- **Smart Aggregation**: One command updates all dashboards

## 📋 Room Progress

| Room | Budget | Actual | Status | Progress |
|------|--------|--------|---------|----------|
| Sala | S/ 30,000 | S/ 22,601 | ✅ Completed | Under budget |
| Cocina | S/ 40,000 | S/ 47,466 | ✅ Completed | Over budget |
| Baño Visita | S/ 10,000 | - | ⏳ Pending | Not started |
| Cuarto 3 | S/ 15,000 | - | ⏳ Pending | Not started |
| Baño 2 | S/ 15,000 | - | ⏳ Pending | Not started |
| Cuarto 2 | S/ 20,000 | - | ⏳ Pending | Not started |
| Cuarto 1 | S/ 20,000 | - | ⏳ Pending | Not started |
| Baño 1 | S/ 15,000 | - | ⏳ Pending | Not started |
| Balcón | S/ 5,000 | - | ⏳ Pending | Not started |

## 💡 Tips

1. **Regular Updates**: Update CSV files after each expense
2. **Backup Data**: Keep copies of your data files
3. **Review Charts**: Check the dashboard weekly for insights
4. **Budget Monitoring**: Watch for rooms going over budget early

## 🔗 Quick Links

- [View Budget Dashboard](charts/budget-overview.html)
- [Project Overview Documentation](docs/01-project-overview.md)
- [Data Files](data/)

## 📞 Support

For issues or questions about this tracking system, check the documentation in the `docs/` folder.

---

**Last Updated**: October 2024
**Total Project Value**: S/ 170,000
**Current Progress**: 41.2% Complete