# Azure VM Deployment Guide for Image Editor

## Overview
This guide provides step-by-step instructions to deploy the Image Editor application on an Azure Virtual Machine while retaining your existing PostgreSQL database server in Azure.

**Current Architecture:**
- PostgreSQL Server: Azure Database for PostgreSQL (existing)
- Frontend: Next.js app (currently on App Service → moving to VM)
- Backend: FastAPI app (currently on App Service → moving to VM)

**New Architecture:**
- PostgreSQL Server: Azure Database for PostgreSQL (unchanged)
- Frontend + Backend: Both running on a single Azure Linux VM via Docker containers

---

## Prerequisites

1. **Azure Account** with existing PostgreSQL server and resource group
2. **Local machine with:**
   - Git installed
   - Docker Desktop installed (for building images locally - optional)
   - Azure CLI installed (`az` command) - optional
   - Web browser (for Bastion access)

3. **Access to:**
   - Your Azure subscription (can create/manage resources)
   - Your PostgreSQL server credentials
   - Your repository code

---

## Part 1: Azure VM Setup

### Step 1.1: Create the Virtual Machine

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Virtual Machines" and click "Create"
3. **Basic Configuration:**
   - **Resource Group:** Select your existing resource group
   - **VM Name:** `image-editor-vm` (or your preferred name)
   - **Region:** Select the same region as your PostgreSQL server
   - **Image:** Ubuntu 22.04 LTS (free tier eligible)
   - **Size:** Standard_B2s (recommended starting point; costs ~$50/month)

4. **Administrator Account:**
   - **Authentication Type:** SSH public key (recommended) OR Password
   - If SSH: Create new key pair and download `.pem` file
   - If Password: Create a strong password

5. **Networking:**
   - **Virtual Network:** Create new or use existing
   - **Subnet:** Accept default
   - **Public IP:** Create new
   - **Network Security Group:** Create new

6. Review and click **Create**

7. Wait for deployment to complete (5-10 minutes)

### Step 1.2: Configure Network Security Group (Firewall Rules)

1. Once VM is created, go to the VM resource in Azure Portal
2. Click **Networking** in the left sidebar
3. Click **Add inbound port rule** for each of these:

   **Rule 1: SSH Access**
   - Source: Your IP (or 0.0.0.0/0 if you don't have static IP)
   - Destination Port: 22
   - Protocol: TCP
   - Action: Allow
   - Priority: 100

   **Rule 2: Frontend (HTTP)**
   - Source: 0.0.0.0/0 (allow from anywhere)
   - Destination Port: 3000
   - Protocol: TCP
   - Action: Allow
   - Priority: 101

   **Rule 3: Backend (HTTP)**
   - Source: 0.0.0.0/0 (allow from anywhere)
   - Destination Port: 8000
   - Protocol: TCP
   - Action: Allow
   - Priority: 102

   **Rule 4: HTTPS (optional, for production)**
   - Source: 0.0.0.0/0
   - Destination Port: 443
   - Protocol: TCP
   - Action: Allow
   - Priority: 103

4. Click **Add** for each rule

### Step 1.3: Get VM Connection Details

1. Go to your VM resource in Azure Portal
2. Copy the **Public IP address** (you'll need this)
3. Note your **Username** (usually `azureuser`)

---

## Part 2: VM Setup and Docker Configuration

### Step 2.1: Connect to the VM Using Azure Bastion

**Using Azure Bastion (Browser-based - Recommended):**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your VM resource
3. Click **Connect** at the top
4. Select the **Bastion** tab
5. Click **Use Bastion**
6. A browser terminal will open (wait 10-15 seconds for it to load)
7. You'll be logged in as your VM user (usually `azureuser`)

You now have a terminal window open in your browser. All commands below run in this Bastion terminal.

**Alternative - Using SSH (if you prefer terminal):**

```bash
# Navigate to where you saved the .pem file
cd ~/Downloads

# Set permissions on the key
chmod 600 your-key.pem

# Connect to VM (replace with your VM's public IP)
ssh -i your-key.pem azureuser@<VM_PUBLIC_IP>
```

### Step 2.2: Update VM System Packages

Once connected to the VM via Bastion (or SSH), run these commands in your terminal:

```bash
sudo apt update
sudo apt upgrade -y
```

Wait for the commands to complete (may take 2-3 minutes).

### Step 2.3: Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2.4: Install Git

```bash
sudo apt install git -y
```

---

## Part 3: Prepare Application Files on VM

### Step 3.1: Clone Repository

```bash
# Create a directory for your application
mkdir -p ~/apps
cd ~/apps

# Clone your repository
git clone https://github.com/Krishhiv17/Image_Editor.git
cd Image_Editor
```

### Step 3.2: Create Environment Variables File

Create a `.env` file in the VM that Docker Compose will use:

```bash
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://username:password@your-postgres-server.postgres.database.azure.com:5432/your_database_name?sslmode=require

# JWT Settings
JWT_SECRET_KEY=your-secret-key-here-change-this-to-something-strong
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key-change-this

# Google OAuth (from your Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://<VM_PUBLIC_IP>:8000/auth/google/callback

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointProtocol=https;AccountName=your-account;AccountKey=your-key;EndpointSuffix=core.windows.net

# CORS - Allow requests from frontend
CORS_ORIGINS=http://<VM_PUBLIC_IP>:3000,http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://<VM_PUBLIC_IP>:8000
EOF
```

**Important:** Replace the following values with your actual credentials:
- `username` and `password`: Your PostgreSQL credentials
- `your-postgres-server.postgres.database.azure.com`: Your Azure PostgreSQL server host
- `your_database_name`: Your database name
- `JWT_SECRET_KEY` and `JWT_REFRESH_SECRET_KEY`: Generate random strings (e.g., `$(openssl rand -hex 32)`)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: From your Google OAuth setup
- `AZURE_STORAGE_*`: From your Azure Storage Account
- `<VM_PUBLIC_IP>`: Replace with your VM's public IP address

---

## Part 4: Docker Image Build and Push (Optional: Local Build Alternative)

You have two options:

### Option A: Build Images on the VM (Recommended for simplicity)

This builds directly on the VM—no need to push to registry.

```bash
# In the VM, in the Image_Editor directory
cd ~/apps/Image_Editor

# Build the images
docker-compose build
```

**Proceed to Part 5.**

### Option B: Build Locally and Push to Azure Container Registry (Advanced)

This is faster if you want to rebuild frequently or have multiple VMs.

**On your local machine:**

1. Create an Azure Container Registry:
   ```bash
   az acr create --resource-group <your-rg> --name <registry-name> --sku Basic
   ```

2. Login to the registry:
   ```bash
   az acr login --name <registry-name>
   ```

3. Build and push images:
   ```bash
   docker-compose -f docker-compose.yml build
   docker-compose -f docker-compose.yml push
   ```

4. Update `.env` on VM to use your registry images

---

## Part 5: Start the Application with Docker Compose

### Step 5.1: Start Containers

On the VM, in the `Image_Editor` directory:

```bash
cd ~/apps/Image_Editor

# Start the containers in the background
docker-compose up -d

# Check status
docker-compose ps

# View logs (helpful for debugging)
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Step 5.2: Verify Services Are Running

```bash
# Check if containers are healthy
docker-compose ps

# Test backend health endpoint
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000
```

### Step 5.3: Access Your Application

Open a browser and navigate to:
- **Frontend:** `http://<VM_PUBLIC_IP>:3000`
- **Backend API:** `http://<VM_PUBLIC_IP>:8000/docs`

---

## Part 6: Database Migrations (First Time Only)

If you're using a new database or need to run migrations:

### Step 6.1: Run Alembic Migrations

**Using Bastion (Recommended):**

In your Bastion terminal, run:

```bash
cd ~/apps/Image_Editor/backend

# Run migrations (adjust DATABASE_URL as needed)
export DATABASE_URL="postgresql://username:password@your-postgres-server.postgres.database.azure.com:5432/your_database_name?sslmode=require"

alembic upgrade head
```

Or if using Docker:

```bash
docker exec -it image_editor-backend-1 alembic upgrade head
```

**Alternative using SSH:**

```bash
# Connect to the VM
ssh -i your-key.pem azureuser@<VM_PUBLIC_IP>

cd ~/apps/Image_Editor/backend

# Run migrations
export DATABASE_URL="postgresql://username:password@your-postgres-server.postgres.database.azure.com:5432/your_database_name?sslmode=require"

alembic upgrade head
```

---

## Part 7: Optional - Set Up Auto-Start on Reboot

To ensure Docker containers start automatically when the VM reboots:

### Step 7.1: Create a Systemd Service

```bash
sudo bash -c 'cat > /etc/systemd/system/image-editor.service << "EOF"
[Unit]
Description=Image Editor Docker Compose Application
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=azureuser
WorkingDirectory=/home/azureuser/apps/Image_Editor
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF'
```

### Step 7.2: Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable image-editor.service
sudo systemctl start image-editor.service

# Check status
sudo systemctl status image-editor.service
```

---

## Part 8: Monitoring and Maintenance

### Check Container Logs

```bash
# View recent logs
docker-compose logs --tail 50 backend
docker-compose logs --tail 50 frontend

# Follow live logs
docker-compose logs -f
```

### Restart Services

```bash
# Restart all containers
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Stop Services

```bash
# Stop all containers
docker-compose stop

# Remove stopped containers
docker-compose rm -f
```

### Update Code and Rebuild

```bash
cd ~/apps/Image_Editor

# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart services
docker-compose down
docker-compose up -d
```

---

## Part 9: Troubleshooting

### Issue: "Connection refused" when accessing the app

**Solution:**
1. Check if containers are running: `docker-compose ps`
2. Check firewall rules in Azure Portal (make sure ports 3000 and 8000 are open)
3. Check container logs: `docker-compose logs backend`

### Issue: Database connection fails

**Solution:**
1. Verify `DATABASE_URL` in `.env` is correct
2. Check if Azure PostgreSQL firewall allows VM IP:
   - Go to your PostgreSQL server in Azure Portal
   - Click **Connection security**
   - Add your VM's public IP to allowed IPs
   - Enable "Allow access to Azure services" (optional)

### Issue: Frontend can't connect to backend

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` in `.env`
2. Check CORS configuration in `backend/app/main.py`
3. Ensure backend is running: `docker-compose logs backend`

### Issue: Docker commands require sudo

**Solution:**
```bash
# Already done in setup, but if needed:
sudo usermod -aG docker $USER
newgrp docker
```

### Issue: Out of disk space

**Solution:**
```bash
# Check disk usage
df -h

# Remove unused Docker images and containers
docker system prune -a

# Remove old logs
docker system prune --volumes
```

---

## Part 10: Production Considerations

### Enable HTTPS (Let's Encrypt)

For production, you should use HTTPS. Consider using:
- **Azure Application Gateway** with WAF
- **Caddy reverse proxy** (simpler, auto HTTPS)
- **Nginx with Certbot**

### Database Backups

Set up automated backups through Azure:
1. Go to your PostgreSQL server in Azure Portal
2. Click **Backup**
3. Configure backup retention policy

### Monitoring

1. **VM Metrics:**
   - Azure Portal → VM → Metrics
   - Monitor CPU, Memory, Network usage

2. **Container Logs:**
   - Set up log aggregation (Azure Monitor, ELK Stack)

3. **Application Health:**
   - Implement health check endpoints
   - Set up alerts in Azure

### Scaling

If you need more resources:
1. Upgrade VM size (requires restart)
2. Use Azure Load Balancer for multiple VMs
3. Consider Azure Kubernetes Service (AKS) for advanced scaling

---

## Quick Reference Commands

### Using Bastion (Recommended)

1. Go to VM in Azure Portal → Click **Connect** → Select **Bastion** tab → Click **Use Bastion**
2. Run commands in the browser terminal:

```bash
# Navigate to app directory
cd ~/apps/Image_Editor

# Start application
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Rebuild images
docker-compose build

# Update code and restart
git pull origin main && docker-compose build && docker-compose up -d
```

### Using SSH (Alternative)

```bash
# SSH into VM
ssh -i key.pem azureuser@<IP>

# Then run the same commands as above
```

---

## Support and Next Steps

1. **If Bastion won't open:** Wait 10-15 seconds for it to load. If still blank, refresh the page or restart the VM.
2. **If services don't start:** Check logs with `docker-compose logs`
3. **If database won't connect:** Verify PostgreSQL firewall rules and credentials
4. **For HTTPS setup:** Implement a reverse proxy (Nginx, Caddy, or Application Gateway)
5. **For better reliability:** Consider Azure backup solutions and monitoring

**Bastion Benefits:**
- ✅ No SSH troubleshooting needed
- ✅ Secure browser-based access
- ✅ Works from anywhere with Azure Portal access
- ✅ No port forwarding or firewall issues
- ✅ Built into Azure (no extra tools needed)

---

**Document Created:** December 7, 2025
**Last Updated:** December 7, 2025
**Access Method:** Azure Bastion (Browser-based Terminal)
