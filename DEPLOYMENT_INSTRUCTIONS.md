# 🚀 Sniper Car Care - Hostinger VPS Deployment Guide

This document outlines the steps to deploy the recent updates (POS system, manual check-in, dashboard stats restriction, and service completion duration tracking) to your Hostinger VPS.

---

## 📦 What We Built / Prepared
All the frontend code has been built locally into production-ready static assets:
1. **POS Dashboard (Admin/Staff)**: Located in `frontend/dist/`
2. **Saloon Website**: Located in `customer-website-saloon/dist/`
3. **4x4 Website**: Located in `customer-website-4x4/dist/`

---

## 🛠️ Step-by-Step Deployment

Choose **one** of the following options based on your workflow.

### 🔹 Option 1: Deploying via Git (Recommended & Fastest)
If your VPS has Git installed and is cloned from your GitHub repository:

1. **Push your local changes to GitHub** (run this on your local computer's terminal):
   ```bash
   git add .
   git commit -m "Deploying POS, manual check-in, and service duration features"
   git push origin ravix
   ```

2. **Pull the changes on the VPS**:
   SSH into your VPS and run:
   ```bash
   cd /path/to/your/project-on-vps
   git pull origin ravix
   ```

3. **Install any new dependencies and restart Backend**:
   ```bash
   cd backend
   npm install
   # Restart your Node.js application (if using PM2)
   pm2 restart all
   ```

4. **Rebuild the Frontends on the VPS** (Optional, if you build directly on the VPS):
   ```bash
   # Build POS Dashboard
   cd ../frontend
   npm install && npm run build
   sudo cp -r dist/* /var/www/pos-dashboard/

   # Build Saloon site
   cd ../customer-website-saloon
   npm install && npm run build
   sudo cp -r dist/* /var/www/customer-saloon/

   # Build 4x4 site
   cd ../customer-website-4x4
   npm install && npm run build
   sudo cp -r dist/* /var/www/customer-4x4/
   ```

---

### 🔹 Option 2: Deploying via FileZilla / WinSCP / Hostinger File Manager
If you prefer manual upload:

1. **Upload the Backend Files**:
   - Open FileZilla / WinSCP and connect to your VPS.
   - Go to your backend application directory.
   - Upload the updated files from the local `backend/` directory (specifically controllers and routes):
     - `backend/controllers/analyticsController.js`
     - `backend/controllers/anprController.js`
     - `backend/controllers/publicCustomerController.js`
     - `backend/controllers/orderController.js`
     - `backend/controllers/publicOrderController.js`
     - `backend/controllers/serviceController.js`
     - `backend/routes/anprRoutes.js`
     - `backend/routes/publicRoutes.js`

2. **Upload the Compiled Frontend Assets**:
   Copy the contents of the local `dist` folders to the Nginx web directories on your VPS:
   - Copy contents of **`frontend/dist/`** to `/var/www/pos-dashboard/`
   - Copy contents of **`customer-website-saloon/dist/`** to `/var/www/customer-saloon/`
   - Copy contents of **`customer-website-4x4/dist/`** to `/var/www/customer-4x4/`

3. **Restart the Backend Process**:
   - SSH into the VPS and restart PM2 (e.g. `pm2 restart all` or `pm2 restart server.js`).
   - Alternatively, if Hostinger provides a Node.js management panel, click **"Restart Application"**.

---

## 🎯 Verification after Deployment
Once deployed, verify the system:
1. Access the POS dashboard at `http://72.62.254.128` and log in to verify dashboard card limits.
2. Open the **Sales** tab, run a quick checkout, and ensure it creates an order and service successfully.
3. Open the saloon/4x4 customer sites (ports `4000`/`4001`) and test a one-tap booking.
4. Verify the active service appears in the **Services** panel on the POS dashboard.
