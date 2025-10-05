# React Migration Plan

## 🎯 Objective

Migrate from static HTML pages to a React application to improve code reusability, maintainability, and developer experience while preserving all existing functionality.

---

## 📊 Current State Analysis

### HTML Pages (Main Application)

1. **home.html** - Dashboard/landing page
2. **charts/budget-overview.html** - Budget summary and charts
3. **charts/products.html** - Product gallery with filters (1556 lines!)
4. **charts/room-editor.html** - Room-specific item editor (1302 lines!)

### Key Duplications Identified

-   **Tables**: Room data tables repeated across pages
-   **Navigation**: Same nav structure in each HTML file
-   **Product Cards**: Card layout and logic
-   **Modals**: Edit modal structure similar across pages
-   **API Calls**: Fetch logic repeated in each page
-   **Filters**: Filter UI and logic duplicated
-   **Styling**: CSS repeated in each file

### Current Tech Stack

-   **Backend**: Express 5.1.0 + Mongoose 8.19.0
-   **Database**: MongoDB 8.0 (local)
-   **Frontend**: Vanilla JavaScript + HTML + CSS
-   **No Build Tools**: Direct script inclusion

### Existing Functionality to Preserve

✅ MongoDB/Mongoose integration  
✅ Room CRUD operations  
✅ Product management with favorites  
✅ Image gallery with heart-based thumbnails  
✅ Drag-and-drop image upload  
✅ Budget tracking and calculations  
✅ Status filtering and search  
✅ Responsive design  
✅ Real-time data updates

---

## 🗺️ Migration Strategy

### Phase 1: Setup & Infrastructure (Week 1)

**Goal**: Create React app alongside existing HTML without breaking anything

#### ✅ SELECTED: Next.js 14+ with App Router (BEST CHOICE ⭐⭐⭐)

**Why Next.js is Perfect for This Project:**

-   🚀 **Built-in API Routes** - Can consolidate Express endpoints into Next.js API
-   📦 **File-based Routing** - No need for React Router
-   ⚡ **Server Components** - Faster initial loads, better SEO
-   🎯 **Zero Config** - Production-ready out of the box
-   🔧 **Image Optimization** - Better than base64 (auto-compress/resize)
-   📱 **Better Mobile Performance** - Automatic code splitting
-   🏗️ **Full-Stack Framework** - Can replace Express eventually
-   � **TypeScript Ready** - Easy to add later

**Setup:**

```bash
npx create-next-app@latest client
# Choose these options:
# ✅ TypeScript? No (for now, can add later)
# ✅ ESLint? Yes
# ✅ Tailwind CSS? Yes (recommended for styling)
# ✅ `src/` directory? Yes
# ✅ App Router? Yes (use new App Router, not Pages)
# ✅ Import alias? Yes (@/*)
```

#### Alternative Options (Not Recommended)

**Option B: Vite + React**

-   Faster dev server than Next.js
-   But: No built-in routing, API routes, or SSR
-   Need more libraries (React Router, etc.)

**Option C: Create React App (CRA)**

-   ❌ Deprecated by Meta
-   ❌ Slow build times
-   Not recommended for new projects

#### Recommended Project Structure (Next.js)

```
apartment-remodel/
├── client/                           # NEW: Next.js frontend
│   ├── src/
│   │   ├── app/                      # App Router (Next.js 14+)
│   │   │   ├── layout.jsx           # Root layout with nav
│   │   │   ├── page.jsx             # Home page
│   │   │   ├── budget/
│   │   │   │   └── page.jsx         # Budget overview
│   │   │   ├── products/
│   │   │   │   └── page.jsx         # Products gallery
│   │   │   ├── rooms/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.jsx     # Room editor (dynamic route)
│   │   │   └── api/                 # API routes (optional, can keep Express)
│   │   │       ├── rooms/
│   │   │       └── products/
│   │   ├── components/              # Reusable components
│   │   │   ├── common/              # Button, Modal, Card
│   │   │   ├── layout/              # Navigation, Header
│   │   │   ├── products/            # ProductCard, ImageGallery
│   │   │   ├── rooms/               # RoomTable, RoomEditor
│   │   │   └── budget/              # Charts, Summary
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useRooms.js
│   │   │   ├── useProducts.js
│   │   │   └── useImageGallery.js
│   │   ├── lib/                     # Utilities & API client
│   │   │   ├── api.js               # Fetch wrapper
│   │   │   ├── currency.js
│   │   │   └── mongodb.js           # Optional: Direct DB access
│   │   └── context/                 # State management
│   │       └── RoomsContext.jsx
│   ├── public/                      # Static assets
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
├── scripts/                          # EXISTING: Express server (optional to keep)
│   └── server.js
├── db/                               # EXISTING: Mongoose models
│   └── models/
│       └── Room.js
└── package.json                      # EXISTING: Server dependencies
```

### Phase 2: Component Extraction (Week 2-3)

**Goal**: Build reusable components matching current functionality

#### Priority 1: Core Components

1. **Layout Components**

    - `Navigation` - Shared nav bar
    - `PageLayout` - Common page wrapper
    - `Modal` - Reusable modal

2. **Data Display**

    - `RoomTable` - Room items table
    - `ProductCard` - Product card with image/actions
    - `ImageGallery` - Image gallery with heart selection
    - `StatsCard` - Budget/stats summary

3. **Forms & Inputs**
    - `FormInput` - Text/number inputs
    - `Select` - Dropdown selectors
    - `FileUpload` - Drag-and-drop zone
    - `LinkManager` - Product links UI

#### Priority 2: State Management

**Options:**

1. **Context API + useReducer** (Start here ⭐)

    - Built-in React
    - No dependencies
    - Good for medium apps

    ```jsx
    // Example: RoomsContext.jsx
    const RoomsContext = createContext();
    ```

2. **Zustand** (If needed later)

    - Tiny (1KB)
    - Simple API
    - No boilerplate

    ```bash
    npm install zustand
    ```

3. **Redux Toolkit** (Overkill for this project)
    - More complex
    - Better for large teams

#### Priority 3: API Integration

**Two approaches with Next.js:**

**Approach 1: Use existing Express API (Start here)**

```javascript
// src/lib/api.js
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const roomsAPI = {
    getAll: () => fetch(`${API_BASE}/rooms`).then((r) => r.json()),
    getOne: (slug) =>
        fetch(`${API_BASE}/load-room/${slug}`).then((r) => r.json()),
    save: (slug, data) =>
        fetch(`${API_BASE}/save-room/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then((r) => r.json()),
};
```

**Approach 2: Next.js API Routes (Optional, later)**

```javascript
// src/app/api/rooms/route.js
import { Room } from '@/db/models/Room';
import dbConnect from '@/lib/mongodb';

export async function GET() {
    await dbConnect();
    const rooms = await Room.find({});
    return Response.json({ success: true, rooms });
}
```

### Phase 3: Routing (Week 4)

**Next.js App Router** (built-in, no installation needed!)

**File-based routing structure:**

```
src/app/
  ├── page.jsx                    → /
  ├── budget/page.jsx             → /budget
  ├── products/page.jsx           → /products
  └── rooms/[slug]/page.jsx       → /rooms/cocina, /rooms/sala, etc.
```

**Dynamic routes automatically work:**

```jsx
// src/app/rooms/[slug]/page.jsx
export default function RoomEditor({ params }) {
    const { slug } = params; // Gets 'cocina', 'sala', etc.
    return <div>Editing {slug}</div>;
}
```

**No React Router needed!** ✅

### Phase 4: Migration Execution (Week 5-6)

**Incremental approach:**

1. **Run both systems in parallel**

    - Keep HTML pages at `/charts/*.html`
    - Serve React app at `/app` or root `/`
    - Update Express to serve both:

    ```javascript
    // Serve React build
    app.use('/app', express.static(path.join(__dirname, '../client/dist')));
    // Keep old HTML
    app.use(express.static(path.join(__dirname, '..')));
    ```

2. **Migrate page by page**

    - Week 5: Home + Navigation
    - Week 6: Products page
    - Week 7: Room Editor
    - Week 8: Budget Overview

3. **Testing checklist per page:**
    - [ ] All data loads correctly
    - [ ] CRUD operations work
    - [ ] Images upload/display
    - [ ] Filters and search work
    - [ ] Responsive on mobile
    - [ ] No console errors

### Phase 5: Enhancement (Week 7+)

Once migration is complete, add improvements:

-   **TypeScript** for type safety
-   **React Query** for better data fetching
-   **Tailwind CSS** for consistent styling
-   **Storybook** for component documentation
-   **Vitest** for testing

---

## 🔧 Technical Decisions

### Styling Approach

**Options:**

1. **Migrate existing CSS** (Start here ⭐)

    - Copy current styles
    - Organize by component
    - Minimal changes

2. **CSS Modules**

    - Scoped styles
    - No conflicts

    ```jsx
    import styles from './ProductCard.module.css';
    ```

3. **Styled Components**

    - CSS-in-JS
    - Dynamic styling

    ```bash
    npm install styled-components
    ```

4. **Tailwind CSS** (Recommended for long-term)
    - Utility-first
    - Consistent design
    - Faster development

### API Communication

**Keep existing Express/Mongoose backend**

-   ✅ No backend changes needed
-   ✅ API already works
-   ✅ MongoDB schema stays same
-   🔄 Just consume APIs from React

**Enable CORS** (already done in server.js):

```javascript
app.use(cors()); // ✅ Already configured
```

### Environment Variables

```bash
# client/.env.local (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# For Next.js API routes (if using Option 2 later)
MONGODB_URI=mongodb://localhost:27017/apartment_remodel
```

```javascript
// Use in client components
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Use in server components or API routes
const MONGODB_URI = process.env.MONGODB_URI;
```

**Note:** `NEXT_PUBLIC_` prefix required for client-side access!

---

## 🚀 Quick Start with Next.js

### Step-by-Step Setup

```bash
# 1. Create Next.js app
cd /Users/gustavo/Documents/Personal/depa/apartment-remodel
npx create-next-app@latest client

# During setup, choose:
# ✅ TypeScript? No (can add later)
# ✅ ESLint? Yes
# ✅ Tailwind CSS? Yes
# ✅ src/ directory? Yes
# ✅ App Router? Yes
# ✅ Import alias (@/*)? Yes

# 2. Navigate to client
cd client

# 3. Install additional dependencies
npm install

# 4. Start Next.js dev server (runs on port 3000)
npm run dev

# 5. In another terminal, keep Express running (if needed)
cd ..
npm start
```

**Result:**

-   Next.js dev: `http://localhost:3000`
-   Express API: `http://localhost:8000` (optional to keep)
-   Old HTML: `http://localhost:8000/charts/products.html` (until migration done)

### Two API Options:

**Option 1: Keep Express (Recommended for Phase 1)**

-   Next.js frontend calls Express backend
-   No backend changes needed
-   Easier migration

**Option 2: Migrate to Next.js API Routes (Phase 2+)**

-   Move Express endpoints to `src/app/api/`
-   Direct MongoDB access from Next.js
-   One less server to run
-   Better for deployment

---

## 📋 Migration Checklist

### Before Starting

-   [ ] Commit all current changes (✅ Already done!)
-   [ ] Create feature branch: `git checkout -b react-migration`
-   [ ] Backup database: `mongodump --db apartment_remodel`
-   [ ] Document current API endpoints
-   [ ] Test all existing features

### During Migration

-   [ ] Setup Vite + React project
-   [ ] Install dependencies (router, etc.)
-   [ ] Create folder structure
-   [ ] Build Navigation component
-   [ ] Build core Layout components
-   [ ] Create API service layer
-   [ ] Implement Context for state
-   [ ] Migrate Products page
-   [ ] Migrate Room Editor
-   [ ] Migrate Budget Overview
-   [ ] Migrate Home page
-   [ ] Test all functionality
-   [ ] Update documentation

### After Migration

-   [ ] Remove old HTML files
-   [ ] Update README with new setup
-   [ ] Configure production build
-   [ ] Setup deployment strategy
-   [ ] Performance testing
-   [ ] Mobile testing

---

## 🎓 Learning Resources

### React Fundamentals

-   [React Docs (Official)](https://react.dev)
-   [Vite Guide](https://vitejs.dev/guide/)

### Useful Patterns for This Project

-   Custom hooks for data fetching
-   Compound components for modals
-   Controlled components for forms
-   Context for global state

### Similar Migration Examples

-   [Vanilla JS to React Guide](https://react.dev/learn/tutorial-tic-tac-toe)
-   [Migration strategies](https://react.dev/learn/add-react-to-an-existing-project)

---

## ⚠️ Risks & Mitigation

| Risk                            | Impact | Mitigation                                    |
| ------------------------------- | ------ | --------------------------------------------- |
| Breaking existing functionality | High   | Run both systems in parallel during migration |
| Time/complexity underestimation | Medium | Migrate page-by-page, test incrementally      |
| State management complexity     | Medium | Start simple (Context), upgrade if needed     |
| Learning curve                  | Low    | You have strong JS skills already             |
| Database incompatibility        | Low    | Backend stays exactly the same                |

---

## 💡 Benefits Summary

### Code Reduction

-   **~70% reduction** in duplicated code
-   **Reusable components** (tables, cards, modals)
-   **Shared logic** via custom hooks

### Developer Experience

-   ⚡ Hot Module Replacement (instant updates)
-   🔍 Better debugging with React DevTools
-   📦 Component isolation and testing
-   🎨 Easier to maintain and extend

### User Experience

-   🚀 SPA (no page reloads)
-   ⚡ Faster interactions
-   🎯 Better state management
-   📱 Easier responsive design

### Future-Proofing

-   🔧 Easy to add new features
-   📚 Larger ecosystem of libraries
-   👥 Easier for other devs to contribute
-   🏗️ Scalable architecture

---

## 🤔 Next Steps

**Let's discuss:**

1. **Which approach excites you most?** (Vite vs CRA)
2. **Preferred timeline?** (Aggressive vs steady)
3. **State management preference?** (Context vs Zustand)
4. **Want to try TypeScript?** (More type safety but learning curve)
5. **Styling choice?** (Keep CSS vs Tailwind)

**I recommend:**

1. ✅ **Vite + React** (fast, modern)
2. ✅ **Context API** first (simple, built-in)
3. ✅ **Keep existing CSS** initially (migrate styles later)
4. ✅ **Start with Products page** (most complex, test viability)
5. ⏸️ **Skip TypeScript** for now (add later if desired)

**Ready to start?** I can help you:

-   Setup the Vite project
-   Create the initial folder structure
-   Build the first component (Navigation or ProductCard)
-   Set up the API service layer

What would you like to explore first? 🚀
