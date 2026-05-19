#!/bin/bash
# =============================================================
# Sniper Car Care - VPS Deployment Script
# Run this on the Hostinger VPS after uploading the files
# =============================================================

echo "🚀 Starting Sniper Car Care Frontend Deployment..."

# Step 1: Create directories
echo "📁 Creating web directories..."
sudo mkdir -p /var/www/pos-dashboard
sudo mkdir -p /var/www/customer-saloon
sudo mkdir -p /var/www/customer-4x4

# Step 2: Set permissions
echo "🔒 Setting permissions..."
sudo chown -R $USER:$USER /var/www/pos-dashboard
sudo chown -R $USER:$USER /var/www/customer-saloon
sudo chown -R $USER:$USER /var/www/customer-4x4

# Step 3: Install Nginx (if not installed)
echo "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt update
    sudo apt install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

# Step 4: Copy Nginx config
echo "⚙️ Configuring Nginx..."
sudo cp ~/nginx-sites.conf /etc/nginx/sites-available/sniper-car-care
sudo ln -sf /etc/nginx/sites-available/sniper-car-care /etc/nginx/sites-enabled/sniper-car-care

# Remove default site to avoid conflicts on port 80
sudo rm -f /etc/nginx/sites-enabled/default

# Step 5: Test Nginx config
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    # Step 6: Restart Nginx
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    echo "✅ Nginx restarted and enabled on boot"
else
    echo "❌ Nginx config has errors! Please fix before continuing."
    exit 1
fi

# Step 7: Open firewall ports
echo "🔥 Configuring firewall..."
sudo ufw allow 80/tcp    # POS Dashboard
sudo ufw allow 4000/tcp  # Saloon
sudo ufw allow 4001/tcp  # 4x4
sudo ufw allow 5000/tcp  # Backend API
echo "✅ Firewall ports opened"

echo ""
echo "=============================================="
echo "✅ Deployment Setup Complete!"
echo "=============================================="
echo ""
echo "Now upload the dist files:"
echo "  POS Dashboard  → /var/www/pos-dashboard/"
echo "  Saloon Site    → /var/www/customer-saloon/"
echo "  4x4 Site       → /var/www/customer-4x4/"
echo ""
echo "URLs:"
echo "  POS Dashboard:  http://72.62.254.128"
echo "  Saloon Site:    http://72.62.254.128:4000"
echo "  4x4 Site:       http://72.62.254.128:4001"
echo "  Backend API:    http://72.62.254.128:5000/api"
echo ""
