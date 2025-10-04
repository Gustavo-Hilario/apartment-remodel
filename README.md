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
- Node.js (v14 or higher)
- Modern web browser

### Installation
```bash
# Install dependencies
npm install

# Start local server to view charts
npm start
```

## 📈 Viewing Charts & Reports

### Interactive Dashboard
1. Start the local server: `npm start`
2. Open your browser to: `http://localhost:8000`
3. Navigate to `charts/budget-overview.html`

### Features:
- **Budget vs Actual comparison** by room
- **Real-time progress tracking**
- **Interactive charts** with Chart.js
- **Responsive design** for mobile/desktop
- **Automatic data loading** from CSV files

## 📝 Updating Data

### Method 1: Edit CSV Files Directly
Edit the CSV files in the `data/` folder:

- **budget-overview.csv**: Update room budgets and actual costs
- **expenses.csv**: Add new expenses as they occur
- **income.csv**: Track funding sources
- **products.csv**: Manage product selections and pricing

### Method 2: Use Scripts
```bash
# Split main.csv into focused files
npm run split-csv

# Generate Excel reports
npm run generate-excel
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

- **Visual Budget Tracking**: Interactive charts showing budget vs actual
- **Progress Monitoring**: Real-time completion percentage
- **Expense Categories**: Organized by Documentación, Mano de Obra, etc.
- **Product Selection**: Track product choices and pricing
- **Mobile Responsive**: Works on all devices
- **Easy Updates**: Simple CSV editing workflow

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