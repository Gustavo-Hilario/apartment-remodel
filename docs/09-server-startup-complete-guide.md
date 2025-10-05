# Server Startup Guide - Complete Configuration

## 📋 Current Setup Overview

You have a **dual-server architecture** that runs simultaneously:

1. **Express API Server** (Port 8000) - Backend with MongoDB
2. **Next.js Dev Server** (Port 3000) - React Frontend

---

## 🚀 How to Start Development

### Primary Command (RECOMMENDED)
```bash
npm run dev:all
```

This single command:
- ✅ Starts Express API server on port 8000
- ✅ Starts Next.js dev server on port 3000
- ✅ Shows color-coded logs (cyan for API, magenta for Next.js)
- ✅ Auto-restarts both on file changes
- ✅ Runs them in parallel with `concurrently`

**Output you'll see:**
```
[API]  🚀 Server running on http://localhost:8000
[NEXT] ▲ Next.js 15.5.4 (Turbopack)
[NEXT] - Local: http://localhost:3000
```

---

## 📦 All Available npm Scripts

### Root Directory (`/apartment-remodel`)

| Command | What It Does | When To Use |
|---------|--------------|-------------|
| `npm run dev:all` | **Start both servers** | ✅ Normal development |
| `npm run server` | Start only Express API | Testing backend only |
| `npm run dev` | Start Express with nodemon | Alternative to `server` |
| `npm start` | Start Express (production) | Production mode |
| `npm run client` | Start only Next.js | Testing frontend only |
| `npm run build:client` | Build Next.js for production | Before deployment |
| `npm run start:prod` | Start both in production | Production testing |

### Client Directory (`/apartment-remodel/client`)

| Command | What It Does | When To Use |
|---------|--------------|-------------|
| `npm run dev` | Start Next.js dev server | When in client folder |
| `npm run build` | Build for production | Before deployment |
| `npm start` | Start production server | After build |
| `npm run lint` | Run ESLint | Code quality checks |

---

## ⚙️ Configuration Files Explained

### 1. Root `nodemon.json` (Express API)
**Location:** `/apartment-remodel/nodemon.json`

```json
{
    "watch": ["scripts/server.js", "charts/**/*.html", "*.html"],
    "ignore": ["data/**/*", "node_modules/**/*", "reports/**/*"],
    "ext": "js,html,json",
    "delay": "1000",
    "env": {
        "NODE_ENV": "development"
    }
}
```

**What this does:**
- Watches `scripts/server.js` for changes
- Watches HTML files in `charts/` folder
- Ignores data, node_modules, reports
- Restarts server 1 second after file changes
- Sets NODE_ENV to development

**When it runs:** When you execute `npm run dev` or `npm run server`

---

### 2. Root `package.json` Scripts
**Location:** `/apartment-remodel/package.json`

```json
{
  "scripts": {
    "start": "node scripts/server.js",           // Production Express
    "dev": "nodemon scripts/server.js",          // Dev Express with auto-restart
    "client": "cd client && npm run dev",         // Navigate + start Next.js
    "server": "npm run dev",                      // Alias for dev
    "dev:all": "concurrently \"npm run server\" \"npm run client\" --names \"API,NEXT\" --prefix-colors \"cyan,magenta\"",
    "build:client": "cd client && npm run build", // Build Next.js
    "start:prod": "concurrently \"npm start\" \"cd client && npm start\" --names \"API,NEXT\""
  }
}
```

**Key Points:**
- `dev:all` uses `concurrently` to run multiple commands in parallel
- `--names` adds prefixes to logs
- `--prefix-colors` makes logs readable

---

### 3. Client `package.json` Scripts
**Location:** `/apartment-remodel/client/package.json`

```json
{
  "scripts": {
    "dev": "next dev --turbopack",      // Fast development with Turbopack
    "build": "next build --turbopack",  // Production build
    "start": "next start",              // Production server
    "lint": "eslint"                    // Code linting
  }
}
```

**What `--turbopack` does:**
- Uses Next.js's new fast bundler
- Replaces Webpack
- Faster builds and Hot Module Replacement (HMR)

---

## 🔄 How Auto-Restart Works

### Express API (Nodemon)
```
File Change → Nodemon Detects → Waits 1s → Restarts server.js
```

**Watched files:**
- `scripts/server.js`
- `charts/**/*.html`
- `*.html`

**Not watched:**
- `data/` folder
- `node_modules/`
- `reports/`

**Manual restart:** Type `rs` in terminal

---

### Next.js (Hot Module Replacement)
```
File Change → Turbopack Detects → Rebuilds → Browser Updates (NO REFRESH)
```

**Watched files:**
- Everything in `client/src/`
- `client/next.config.mjs`
- `client/.env.local`

**When full restart needed:**
- Changing `next.config.mjs`
- Changing `.env.local`
- Installing new packages

---

## 🛠️ Troubleshooting

### Problem: Servers won't start

**Check MongoDB:**
```bash
brew services list | grep mongodb
# If not running:
brew services start mongodb-community
```

**Check ports are free:**
```bash
lsof -i :3000,8000
# If ports are taken, kill them:
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

---

### Problem: Changes not showing

**Express API:**
- Check nodemon is watching your file
- Check terminal for "restarting due to changes"
- Manual restart: Type `rs` in terminal
- Check file is in `watch` array in nodemon.json

**Next.js:**
- Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Win)
- Check terminal for "✓ Compiled..."
- If env vars changed, restart: `Ctrl+C` then `npm run dev:all`

---

### Problem: "concurrently not found"

```bash
npm install
# Or specifically:
npm install concurrently --save-dev
```

---

### Problem: Port already in use

**Option 1: Kill process**
```bash
lsof -ti:3000 | xargs kill -9  # Next.js
lsof -ti:8000 | xargs kill -9  # Express
```

**Option 2: Change port**
- Express: Edit `scripts/server.js` → change `const PORT = 8000`
- Next.js: `cd client && npm run dev -- -p 3001`

---

## 📁 File Structure That Nodemon Watches

```
apartment-remodel/
├── scripts/
│   └── server.js          ← WATCHED by nodemon
├── charts/
│   ├── products.html      ← WATCHED by nodemon
│   └── *.html             ← WATCHED by nodemon
├── *.html                 ← WATCHED by nodemon
├── db/
│   ├── connection.js      ← NOT watched (requires restart)
│   └── *.js               ← NOT watched (requires restart)
├── data/                  ← IGNORED by nodemon
├── node_modules/          ← IGNORED by nodemon
└── reports/               ← IGNORED by nodemon
```

**To watch more files**, edit `nodemon.json`:
```json
{
  "watch": [
    "scripts/server.js",
    "charts/**/*.html",
    "db/**/*.js"           ← Add this line
  ]
}
```

---

## 🎯 Development Workflow

### Typical Session

```bash
# 1. Navigate to project
cd /path/to/apartment-remodel

# 2. Ensure MongoDB is running
brew services start mongodb-community

# 3. Start both servers
npm run dev:all

# 4. Open in browser
# - Frontend: http://localhost:3000
# - API: http://localhost:8000/api/rooms
# - Old HTML: http://localhost:8000/charts/products.html

# 5. Make changes
# - Frontend files: Auto-reloads in browser
# - Backend files: Auto-restarts server

# 6. Stop servers
# Ctrl + C in terminal
```

---

### Working on Frontend Only

```bash
cd client
npm run dev

# Access at: http://localhost:3000
```

**Note:** API calls will fail unless Express is also running!

---

### Working on Backend Only

```bash
npm run server

# Access at: http://localhost:8000
```

**Test endpoints:**
```bash
curl http://localhost:8000/api/rooms
curl http://localhost:8000/api/totals
```

---

## 🔧 Advanced Configuration

### Custom Nodemon Config

Want to watch database models?

**Edit `nodemon.json`:**
```json
{
  "watch": [
    "scripts/server.js",
    "charts/**/*.html",
    "*.html",
    "db/**/*.js"           ← Add this
  ],
  "ignore": [
    "data/**/*",
    "node_modules/**/*",
    "reports/**/*"
  ],
  "ext": "js,html,json",
  "delay": "1000"
}
```

---

### Custom Next.js Port

**Temporary:**
```bash
cd client
npm run dev -- -p 3001
```

**Permanent:**
Edit `client/package.json`:
```json
{
  "scripts": {
    "dev": "next dev --turbopack -p 3001"
  }
}
```

---

### Different Colors for Logs

Edit root `package.json`:
```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run server\" \"npm run client\" --names \"🔴API,🟢NEXT\" --prefix-colors \"red,green\""
  }
}
```

---

## 📊 Process Flow Diagram

```
npm run dev:all
       |
       ├─→ concurrently
              |
              ├─→ npm run server
              |      |
              |      └─→ nodemon scripts/server.js
              |             |
              |             ├─→ Express starts (port 8000)
              |             └─→ Watches for file changes
              |
              └─→ cd client && npm run dev
                     |
                     └─→ next dev --turbopack
                            |
                            ├─→ Next.js starts (port 3000)
                            └─→ Turbopack watches for changes
```

---

## ✅ Quick Reference

### Start Development
```bash
npm run dev:all
```

### Stop Servers
```bash
Ctrl + C
```

### Restart Manually
- **Both:** `Ctrl+C` then `npm run dev:all`
- **Express only:** Type `rs` in terminal
- **Next.js only:** `Ctrl+C` then restart

### Check Status
```bash
# See what's running on ports
lsof -i :3000,8000

# See MongoDB status
brew services list | grep mongodb
```

### View Logs
- **Cyan [API]** = Express backend
- **Magenta [NEXT]** = Next.js frontend

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` |
| Port 8000 in use | `lsof -ti:8000 \| xargs kill -9` |
| MongoDB not running | `brew services start mongodb-community` |
| Changes not showing (Express) | Type `rs` or restart |
| Changes not showing (Next.js) | Hard refresh browser |
| env vars not loaded | Restart servers |
| Module not found | `npm install` in correct directory |

---

## 📝 Notes

1. **Always run `npm run dev:all` from the ROOT directory** (`apartment-remodel/`)
2. **MongoDB must be running** before starting servers
3. **Don't run `npm start` in development** - use `npm run dev:all`
4. **Next.js env vars** require server restart when changed
5. **Express auto-restarts** only for watched files

---

## 🎓 Best Practices

✅ **DO:**
- Use `npm run dev:all` for normal development
- Keep terminal open to see logs
- Check MongoDB is running first
- Use `rs` to manually restart Express

❌ **DON'T:**
- Run `npm start` in development (that's production mode)
- Edit files while servers are starting
- Forget to restart after changing .env files
- Mix up which directory you're in

---

## 🚀 Production Deployment

### Build
```bash
npm run build:client
```

### Start Production
```bash
npm run start:prod
```

**What this does:**
- Runs Express in production mode (no nodemon)
- Runs Next.js production server (optimized)
- Both servers managed by concurrently

---

## Summary

Your setup is **already configured correctly**! 

**To start developing:**
```bash
cd /path/to/apartment-remodel
npm run dev:all
```

Visit:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- Test: http://localhost:3000/test-api

That's it! 🎉
