# Server Setup Guide

## Overview

The project now runs **two servers** in parallel:
1. **Express API Server** (Port 8000) - Existing backend with MongoDB
2. **Next.js Dev Server** (Port 3000) - New React frontend

---

## Quick Start Commands

### Start Both Servers (Recommended)
```bash
npm run dev:all
```
This runs Express API + Next.js frontend simultaneously with colored output.

### Start Servers Individually

**Express API Only:**
```bash
npm run dev
# or
npm start
```
Runs on: http://localhost:8000

**Next.js Only:**
```bash
npm run client
# or
cd client && npm run dev
```
Runs on: http://localhost:3000

---

## Server Details

### 1. Express API Server (Backend)

**Location**: `scripts/server.js`  
**Port**: 8000  
**Database**: MongoDB (localhost:27017)  
**Purpose**: REST API for all data operations

**Endpoints Available:**
- `GET  /api/rooms` - Get all rooms
- `GET  /api/load-room/:slug` - Get specific room
- `POST /api/save-room/:slug` - Save room data
- `GET  /api/expenses` - Get expenses
- `POST /api/save-expenses` - Save expenses
- `GET  /api/totals` - Get project totals
- `GET  /api/get-all-categories` - Get categories

**Auto-restart**: Uses nodemon for hot reload

**Check if running:**
```bash
curl http://localhost:8000/api/rooms
```

### 2. Next.js Dev Server (Frontend)

**Location**: `client/`  
**Port**: 3000  
**Technology**: Next.js 15.5 with App Router  
**Purpose**: React frontend UI

**Features:**
- Hot Module Replacement (instant updates)
- Turbopack for fast builds
- File-based routing
- API calls to Express backend

**Check if running:**
Visit: http://localhost:3000

---

## MongoDB Setup

### Check if MongoDB is Running

```bash
# Check MongoDB process
ps aux | grep mongod

# Or test connection
mongosh apartment_remodel --eval "db.stats()"
```

### Start MongoDB (if not running)

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Linux/Manual:**
```bash
mongod --dbpath /path/to/data
```

### Verify Database

```bash
# Connect to database
mongosh apartment_remodel

# List collections
show collections

# Check rooms
db.rooms.countDocuments()
```

---

## Environment Variables

### Root `.env` (Optional - for Express if needed)
Not currently used, Express connects directly.

### Client `.env.local` (Required)
```bash
# API endpoint for Next.js to call Express
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# MongoDB URI (only needed for Next.js API routes)
MONGODB_URI=mongodb://localhost:27017/apartment_remodel
```

**Note**: Restart Next.js dev server after changing `.env.local`!

---

## Troubleshooting

### Port Already in Use

**Port 8000 (Express):**
```bash
# Find process
lsof -ti:8000

# Kill it
lsof -ti:8000 | xargs kill -9

# Or use different port in server.js
```

**Port 3000 (Next.js):**
```bash
# Kill process
lsof -ti:3000 | xargs kill -9

# Or run on different port
cd client && npm run dev -- -p 3001
```

### MongoDB Not Running

```bash
# Start MongoDB
brew services start mongodb-community

# Check status
brew services list | grep mongodb
```

### API Calls Failing (CORS)

Express has CORS enabled. Verify in `scripts/server.js`:
```javascript
app.use(cors()); // Should be present
```

### Next.js Can't Connect to API

1. Check Express is running: http://localhost:8000/api/rooms
2. Verify `.env.local` has correct `NEXT_PUBLIC_API_URL`
3. Restart Next.js dev server
4. Check browser console for errors

### Changes Not Showing

**Express:**
- Uses nodemon for auto-restart
- Should restart automatically
- If not, Ctrl+C and `npm run dev`

**Next.js:**
- Has Hot Module Replacement
- Changes should appear instantly
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Win)

---

## Development Workflow

### Typical Development Session

```bash
# 1. Start MongoDB (if not running)
brew services start mongodb-community

# 2. Start both servers
cd /path/to/apartment-remodel
npm run dev:all

# 3. Open in browser
# - Next.js frontend: http://localhost:3000
# - Express API: http://localhost:8000
# - Old HTML: http://localhost:8000/charts/products.html
```

### Making Changes

**Frontend (React/Next.js):**
- Edit files in `client/src/`
- Changes appear instantly (HMR)
- Check browser console for errors

**Backend (Express):**
- Edit `scripts/server.js` or DB models
- Nodemon auto-restarts server
- Check terminal for errors

**Database (MongoDB):**
- Changes persist automatically
- Use MongoDB Compass or mongosh to inspect

---

## Production Build

### Build Next.js for Production

```bash
# Build client
npm run build:client

# Start both in production mode
npm run start:prod
```

**Production URLs:**
- Next.js: http://localhost:3000 (optimized build)
- Express: http://localhost:8000 (same as dev)

---

## Server Logs

### Express Server Output
```
Mongoose connected to MongoDB
✅ Connected to MongoDB with Mongoose
🚀 Server running on http://localhost:8000
📊 Using MongoDB with Mongoose (apartment_remodel database)
```

### Next.js Server Output
```
▲ Next.js 15.5.4 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
✓ Ready in 1888ms
```

---

## Database Connection Options

### Option 1: Use Express API (Current Setup - Recommended)
✅ **Advantages:**
- No changes needed
- Works immediately
- Proven and tested
- Easier to debug

**How it works:**
```
Next.js → HTTP → Express API → Mongoose → MongoDB
```

### Option 2: Next.js API Routes (Optional - Future)
**Advantages:**
- One less server to run
- Direct database access from Next.js
- Better for serverless deployment

**How it works:**
```
Next.js → Next.js API Route → Mongoose → MongoDB
```

**Setup** (if you decide to use this later):
1. Create API route: `client/src/app/api/rooms/route.js`
2. Import mongoose and models
3. Use `dbConnect()` utility we created
4. Migrate endpoints one by one

---

## Quick Reference

### Start Development
```bash
npm run dev:all
```

### Check What's Running
```bash
# Check ports
lsof -i :3000,8000

# Check MongoDB
brew services list | grep mongodb
```

### Stop Everything
```bash
# Stop servers (Ctrl+C in terminal)
# Stop MongoDB
brew services stop mongodb-community
```

### Test API Connection
```bash
# Test Express API
curl http://localhost:8000/api/rooms

# Test from Next.js console (browser)
fetch('/api/rooms').then(r => r.json()).then(console.log)
```

---

## Next Steps

✅ Servers configured and ready  
✅ MongoDB connection established  
✅ npm scripts created for easy startup  

**Ready to start building components!**

See `docs/05-phase-1-complete.md` for next development steps.
