# Deployment Guide - Apartment Remodel App

This guide walks you through deploying your Apartment Remodel application online using free-tier services.

## 📋 Overview

**Tech Stack:**
- **Frontend**: Next.js 15.5.4 (deployed on Vercel)
- **Backend**: Express 5.1.0 (deployed on Render)
- **Database**: MongoDB (hosted on MongoDB Atlas)
- **Authentication**: NextAuth.js with role-based access control (Admin/Family/Guest)

**Estimated Time**: 1-2 hours for complete setup

---

## Phase 1: Prepare Your Repository

### 1.1 Push to GitHub

If you haven't already, create a GitHub repository for this project:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: Initial commit for deployment"

# Create GitHub repository (visit github.com/new)
# Then connect your local repo:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 1.2 Verify Environment Files

Make sure you have:
- `.env.example` in the root directory (for backend)
- `client/.env.example` (for frontend)
- `.env.local` in both locations (for local development - NOT committed to Git)

---

## Phase 2: Set Up MongoDB Atlas (Database)

### 2.1 Create MongoDB Atlas Account

1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with Google, GitHub, or email
3. Choose the **FREE** tier (M0 Sandbox)

### 2.2 Create a Free Cluster

1. Click "Build a Database"
2. Select **M0 FREE** tier
3. Choose a cloud provider (AWS, Google Cloud, or Azure - doesn't matter)
4. Select a region closest to your users (e.g., US East, São Paulo, etc.)
5. Name your cluster (e.g., "apartment-remodel")
6. Click "Create Cluster" (takes 3-5 minutes)

### 2.3 Set Up Database Access

**Create Database User:**
1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `apartment_admin` (or your choice)
5. Click "Autogenerate Secure Password" - **COPY AND SAVE THIS PASSWORD**
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

**Configure Network Access:**
1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - This is needed for Render to connect
   - For better security, you can add specific IPs later
4. Click "Confirm"

### 2.4 Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 5.5 or later
5. **Copy the connection string** - it looks like:
   ```
   mongodb+srv://apartment_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the password you saved earlier
7. Add the database name before the `?`:
   ```
   mongodb+srv://apartment_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/apartment_remodel?retryWrites=true&w=majority
   ```

**Save this connection string** - you'll need it for Render deployment.

---

## Phase 3: Deploy Backend to Render

### 3.1 Create Render Account

1. Go to [https://render.com/](https://render.com/)
2. Sign up with GitHub (recommended for easier deployment)
3. Authorize Render to access your GitHub repositories

### 3.2 Create New Web Service

1. Click "New +" in the top right
2. Select "Web Service"
3. Connect your GitHub repository (apartment-remodel)
4. Click "Connect"

### 3.3 Configure Service Settings

Fill in the following:

- **Name**: `apartment-remodel-api` (or your choice)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (backend is in root)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node scripts/server.js`
- **Plan**: **Free** (select this!)

### 3.4 Add Environment Variables

Click "Advanced" and add these environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8000` |
| `MONGO_URL` | Your MongoDB Atlas connection string from Step 2.4 |
| `CLIENT_URL` | `https://your-app.vercel.app` (we'll update this after Vercel deployment) |
| `JWT_SECRET` | Generate a secure random string (e.g., use `openssl rand -base64 32`) |

Click "Create Web Service"

### 3.5 Wait for Deployment

- Render will build and deploy your backend (takes 2-5 minutes)
- Once complete, you'll see a green "Live" status
- **Copy your Render URL** (e.g., `https://apartment-remodel-api.onrender.com`)
- Test it by visiting: `https://apartment-remodel-api.onrender.com/api/totals`

**Important Note**: Free tier sleeps after 15 minutes of inactivity. First load takes ~30 seconds.

---

## Phase 4: Deploy Frontend to Vercel

### 4.1 Create Vercel Account

1. Go to [https://vercel.com/signup](https://vercel.com/signup)
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your repositories

### 4.2 Import Project

1. Click "Add New..." → "Project"
2. Select your GitHub repository (apartment-remodel)
3. Click "Import"

### 4.3 Configure Project Settings

- **Framework Preset**: Next.js (should auto-detect)
- **Root Directory**: `client`
- **Build Command**: Leave default (`next build`)
- **Output Directory**: Leave default

### 4.4 Add Environment Variables

Click "Environment Variables" and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://apartment-remodel-api.onrender.com/api` (your Render URL from Phase 3) |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (your Vercel URL - we'll update after first deploy) |
| `NEXTAUTH_SECRET` | Generate a secure random string (e.g., use `openssl rand -base64 32`) |

**Note:** After your first deployment, you'll need to update `NEXTAUTH_URL` with your actual Vercel URL.

### 4.5 Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build and deployment
3. Once complete, you'll get a URL like `https://your-app.vercel.app`
4. **Copy this URL**

### 4.6 Update Backend CORS

Go back to Render:
1. Navigate to your web service
2. Go to "Environment" tab
3. Update `CLIENT_URL` to your Vercel URL (e.g., `https://your-app.vercel.app`)
4. Click "Save Changes"
5. Service will automatically redeploy

---

## Phase 5: Create Admin User

### 5.1 Access MongoDB Atlas

1. Go to your MongoDB Atlas dashboard
2. Click "Database" in the left sidebar
3. Click "Browse Collections" on your cluster
4. Select your database (e.g., `apartment_remodel`)
5. Find or create the `users` collection

### 5.2 Create First Admin User

Click "Insert Document" and add this document (replace with your details):

```json
{
  "name": "Your Name",
  "email": "youremail@example.com",
  "password": "$2b$10$YourHashedPasswordHere",
  "role": "admin",
  "createdAt": {"$date": "2025-01-15T00:00:00.000Z"}
}
```

**To generate a hashed password:**

Option 1 - Use Node.js locally:
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword123!', 10));"
```

Option 2 - Use an online bcrypt generator (use reputable sites only):
- Generate a bcrypt hash with 10 salt rounds
- Copy the hash to the password field

**Important:** Save your login credentials securely!

---

## Phase 6: Testing & Verification

### 6.1 Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. You should see the login page
3. Click "Sign In" and enter your admin credentials
4. After login, verify:
   - Homepage loads with data
   - Products page works
   - Timeline page works
   - Budget and expense tracking works
   - User management page is accessible (Admin only)

### 6.2 Test Authentication & Authorization

1. **Admin Access:**
   - Login with your admin account
   - Verify you can access all pages including user management
   - Create a family member account and a guest account

2. **Role-Based Access:**
   - Logout and login as family member
   - Verify you can edit but not access user management
   - Logout and login as guest
   - Verify you can only view (read-only access)

3. **Session Management:**
   - Logout (click logout button in navigation)
   - Try accessing protected pages - should redirect to login
   - Login again and verify session persists

### 6.3 Common Issues & Fixes

**Issue**: "Failed to load data" on homepage
- **Fix**: Check that Render backend URL is correct in Vercel environment variables
- **Fix**: Wait 30 seconds if backend was sleeping (free tier limitation)

**Issue**: NextAuth login doesn't work
- **Fix**: Verify `NEXTAUTH_URL` matches your Vercel URL exactly (with https://)
- **Fix**: Ensure `NEXTAUTH_SECRET` is set in Vercel environment variables
- **Fix**: Check browser console for specific NextAuth errors

**Issue**: "Invalid credentials" when logging in
- **Fix**: Verify admin user exists in MongoDB users collection
- **Fix**: Ensure password was hashed correctly with bcrypt
- **Fix**: Check email address matches exactly (case-sensitive)

**Issue**: CORS errors
- **Fix**: Ensure `CLIENT_URL` in Render matches your Vercel URL exactly (with https://)

**Issue**: Database connection errors
- **Fix**: Verify MongoDB connection string in Render environment variables
- **Fix**: Check MongoDB Atlas Network Access allows 0.0.0.0/0

**Issue**: "Unauthorized" or role-based access not working
- **Fix**: Verify user role in MongoDB is exactly "admin", "family", or "guest" (lowercase)
- **Fix**: Clear browser cookies and login again

---

## Phase 7: Share with Family

### 7.1 Create User Accounts

As an admin, create accounts for your family members:

1. Login to your deployed app
2. Navigate to "User Management" (Admin only)
3. Click "Add User"
4. Create accounts with appropriate roles:
   - **Family**: Can view and edit all data
   - **Guest**: Read-only access

### 7.2 Create Family Access Guide

Share this information with your family:

```
🏗️ Apartment Remodel Tracker

Website: https://your-app.vercel.app

Login Instructions:
1. Click "Sign In" on the homepage
2. Use the email and password provided by the admin
3. (Optional) Check "Remember me" for convenience

Your Access Level: [Admin/Family/Guest]

Features:
- Track renovation budget and expenses
- Manage products and purchases
- View timeline and progress
- Track progress by room

Note: The app may take 30 seconds to load if it hasn't been used recently (free tier).
```

### 7.3 Optional: Custom Domain

If you want a custom domain (costs ~$10-15/year):

1. Buy a domain from Namecheap, Google Domains, or similar
2. In Vercel, go to your project → Settings → Domains
3. Add your custom domain
4. Follow Vercel's instructions to update DNS records
5. Update `CLIENT_URL` in Render to your custom domain

---

## 📊 Cost Summary

- **MongoDB Atlas (M0)**: FREE (512MB storage)
- **Render (Free tier)**: FREE (750 hours/month, sleeps after 15min)
- **Vercel (Hobby)**: FREE (Unlimited bandwidth for personal projects)
- **Total**: **$0/month** ✅

---

## 🔧 Ongoing Maintenance

### Updating Your App

When you make changes locally:

```bash
git add .
git commit -m "feat: Your changes"
git push origin main
```

Both Vercel and Render will automatically redeploy with your changes.

### Monitoring

- **Vercel**: Dashboard shows deployment status and analytics
- **Render**: Dashboard shows service status and logs
- **MongoDB Atlas**: Monitor database usage and performance

### Upgrading Later

If you need more resources:
- **Render**: $7/month for always-on service (no sleep)
- **MongoDB Atlas**: $9/month for M2 cluster (2GB storage)
- **Vercel**: Hobby tier remains free

---

## 🆘 Support

If you encounter issues:

1. Check service logs:
   - Render: Dashboard → Your Service → Logs
   - Vercel: Dashboard → Your Project → Deployments → View Logs

2. Verify environment variables are set correctly

3. Test API endpoints directly:
   - `https://your-render-url.onrender.com/api/totals`
   - Should return JSON data

---

## ✅ Deployment Checklist

- [ ] GitHub repository created and pushed
- [ ] MongoDB Atlas cluster created (M0 FREE)
- [ ] Database user and network access configured
- [ ] MongoDB connection string obtained
- [ ] Render backend deployed with environment variables
- [ ] Backend API tested and working
- [ ] Vercel frontend deployed with environment variables
- [ ] Frontend tested and working
- [ ] Backend CORS updated with Vercel URL
- [ ] Admin user created in MongoDB
- [ ] NextAuth authentication tested (login/logout)
- [ ] Role-based access verified (Admin/Family/Guest)
- [ ] Family member accounts created
- [ ] All features verified in production
- [ ] Family access credentials shared

Congratulations! Your app is now live! 🎉
