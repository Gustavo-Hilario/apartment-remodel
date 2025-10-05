# 🚀 Quick Start Cheat Sheet

## One Command to Rule Them All

```bash
npm run dev:all
```

**That's it!** This starts everything you need.

---

## What You'll See

```
[API]  ✅ Connected to MongoDB
[API]  🚀 Server running on http://localhost:8000
[NEXT] ▲ Next.js 15.5.4 (Turbopack)
[NEXT] - Local: http://localhost:3000
[NEXT] ✓ Ready in 1560ms
```

---

## Open These URLs

| URL | What It Shows |
|-----|---------------|
| http://localhost:3000 | 🏠 React Frontend (Home Dashboard) |
| http://localhost:3000/products | 🛍️ Products Page |
| http://localhost:3000/budget | 💰 Budget Overview |
| http://localhost:3000/test-api | 🧪 API Test Page |
| http://localhost:8000/api/rooms | 📡 API Endpoint (JSON) |
| http://localhost:8000/charts/products.html | 📄 Old HTML Version |

---

## Common Commands

```bash
# Start everything
npm run dev:all

# Stop everything
Ctrl + C

# Restart Express manually
Type: rs

# Check if MongoDB is running
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb-community

# Kill stuck ports
lsof -ti:3000 | xargs kill -9   # Next.js
lsof -ti:8000 | xargs kill -9   # Express
```

---

## When Things Change

| What Changed | What Happens |
|--------------|--------------|
| React component | ⚡ Browser updates instantly (HMR) |
| Express server.js | 🔄 Server auto-restarts in ~1s |
| .env.local | 🛑 Must restart manually (Ctrl+C → dev:all) |
| package.json | 🛑 Must restart manually |
| next.config.mjs | 🛑 Must restart manually |

---

## File Structure

```
apartment-remodel/
├── 📁 client/              → Next.js React app
│   ├── src/
│   │   ├── app/           → Pages (page.js files)
│   │   ├── components/    → React components
│   │   └── lib/           → Utilities
│   ├── package.json       → Next.js scripts
│   └── .env.local         → Frontend env vars
│
├── 📁 scripts/
│   └── server.js          → Express API server
│
├── 📁 db/
│   └── models/            → MongoDB schemas
│
├── package.json           → Root scripts (dev:all)
├── nodemon.json           → Express auto-restart config
└── .env                   → Backend env vars (optional)
```

---

## npm Scripts Map

```
Root Directory (/apartment-remodel)
├── npm run dev:all    ⭐ START HERE (both servers)
├── npm run server     → Express only
├── npm run client     → Next.js only
├── npm run build:client → Production build
└── npm run start:prod → Production mode

Client Directory (/client)
├── npm run dev        → Next.js dev server
├── npm run build      → Production build
└── npm run start      → Production server
```

---

## Troubleshooting in 10 Seconds

**Problem:** Servers won't start
```bash
brew services start mongodb-community
lsof -ti:3000,8000 | xargs kill -9
npm run dev:all
```

**Problem:** Changes not showing
```bash
# Express: Type "rs" in terminal
# React: Hard refresh browser (Cmd+Shift+R)
```

**Problem:** API errors
```bash
# Check MongoDB is running
brew services list | grep mongodb
```

---

## Color Legend

When you run `npm run dev:all`:

- **[API]** in cyan = Express backend logs
- **[NEXT]** in magenta = Next.js frontend logs

---

## Development Workflow

```
1. cd /path/to/apartment-remodel
2. npm run dev:all
3. Open http://localhost:3000
4. Edit files → Changes appear automatically
5. Ctrl+C when done
```

---

## Production

```bash
# Build
npm run build:client

# Run
npm run start:prod
```

---

## Quick Tips

✅ Run from **root directory** (apartment-remodel/)
✅ MongoDB must be **running first**
✅ Use **dev:all** for normal development
✅ Type **rs** to restart Express manually
✅ **Hard refresh** browser if React changes don't show

❌ Don't run `npm start` (that's production)
❌ Don't edit .env while servers are running
❌ Don't forget to start MongoDB

---

## That's All You Need! 🎉

**Normal day:**
```bash
npm run dev:all
```

**That one command = Full stack development ready!**
