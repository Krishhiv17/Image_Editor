# Azure Setup Guide for Photo Editor Application

## Prerequisites
- Azure Student Account
- Azure CLI installed locally
- PostgreSQL client (psql)
- Basic understanding of Azure Portal

## Step 1: Create Resource Group

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name photo-editor-rg \
  --location eastus
```

## Step 2: Create Azure Database for PostgreSQL

### Using Azure Portal:
1. Go to Azure Portal → Create a resource → Azure Database for PostgreSQL
2. Select **Flexible Server**
3. Configure:
   - **Resource group**: photo-editor-rg
   - **Server name**: photo-editor-db (must be globally unique)
   - **Region**: East US
   - **PostgreSQL version**: 15
   - **Compute + storage**: Burstable, B1ms (1 vCore, 2 GiB RAM) - good for student account
   - **Admin username**: photoeditor_admin
   - **Password**: (create a strong password and save it)
4. **Networking tab**:
   - Allow public access from Azure services and resources
   - Add your current IP address
5. Click **Review + create** → **Create**

### After creation:
1. Go to your database → **Connection strings**
2. Copy the connection string and update your `.env` file
3. Format: `postgresql://username:password@servername.postgres.database.azure.com:5432/postgres?sslmode=require`

## Step 3: Create Azure Storage Account

### Using Azure Portal:
1. Create a resource → Storage account
2. Configure:
   - **Resource group**: photo-editor-rg
   - **Storage account name**: photoeditstorage (must be globally unique, lowercase only)
   - **Region**: East US
   - **Performance**: Standard
   - **Redundancy**: LRS (Locally-redundant storage) - most cost-effective
3. **Advanced tab**:
   - Enable blob public access
   - Enable blob soft delete (7 days)
4. Click **Review + create** → **Create**

### After creation:
1. Go to storage account → **Access keys**
2. Copy **Storage account name** and **Key** (key1)
3. Go to **Containers** and create three containers:
   - `originals` (Private)
   - `variants` (Private or Blob - depending on if you want public CDN access)
   - `backups` (Private)

## Step 4: Configure Google OAuth

### Get OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen (External, add test users)
6. Application type: **Web application**
7. Add authorized redirect URIs:
   - `http://localhost:8000/api/auth/oauth/callback` (development)
   - `https://your-domain.com/api/auth/oauth/callback` (production)
8. Copy **Client ID** and **Client Secret**

## Step 5: Create Azure VM (Optional - for deployment)

### Using Azure Portal:
1. Create a resource → Ubuntu Server 22.04 LTS
2. Configure:
   - **Resource group**: photo-editor-rg
   - **VM name**: photo-editor-vm
   - **Region**: East US
   - **Size**: B2s (2 vCPUs, 4 GiB RAM) - good for student account
   - **Authentication**: SSH public key
   - **Inbound ports**: SSH (22), HTTP (80), HTTPS (443)
3. Click **Review + create** → **Create**
4. Download the private key for SSH access

### After creation:
1. Note the public IP address
2. Configure NSG (Network Security Group) to restrict SSH to your IP
3. Install required software:
```bash
ssh -i <your-key>.pem azureuser@<vm-public-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install PostgreSQL client
sudo apt install postgresql-client -y

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

## Step 6: Update Environment Variables

### Backend `.env` file:
```bash
# Copy example and edit
cd backend
cp .env.example .env
nano .env
```

Update with your Azure credentials:
```
DATABASE_URL=postgresql://photoeditor_admin:YOUR_PASSWORD@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require

JWT_SECRET_KEY=<generate-random-secret-key>

GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/oauth/callback

AZURE_STORAGE_ACCOUNT_NAME=photoeditstorage
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=photoeditstorage;AccountKey=<your-key>;EndpointSuffix=core.windows.net

CORS_ORIGINS=http://localhost:3000,https://your-domain.com

DEBUG=True
```

### Frontend `.env.local` file:
```bash
cd ../frontend
cp .env.example .env.local
nano .env.local
```

Update:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
```

## Step 7: Generate JWT Secret Key

```bash
# Generate a secure random key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Use this value for `JWT_SECRET_KEY` in your `.env` file.

## Step 8: Test Database Connection

```bash
# Test connection to Azure PostgreSQL
psql "postgresql://photoeditor_admin:YOUR_PASSWORD@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require"

# If successful, you'll see the PostgreSQL prompt
# Type \q to exit
```

## Step 9: Create Database and Run Migrations

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize Alembic (migration tool)
alembic init migrations

# Run migrations (we'll create these in the next step)
alembic upgrade head
```

## Cost Optimization Tips for Student Account

1. **Use Burstable tier** for VM and Database
2. **LRS storage** instead of GRS (geo-redundant)
3. **Stop VM** when not in use to save costs
4. **Use Azure Advisor** to monitor spending
5. **Set up spending alerts** in Cost Management
6. **Delete unused resources** regularly

## Quick Reference

### Azure Resources Created:
- Resource Group: `photo-editor-rg`
- PostgreSQL Server: `photo-editor-db.postgres.database.azure.com`
- Storage Account: `photoeditstorage.blob.core.windows.net`
- VM (optional): `photo-editor-vm.<region>.cloudapp.azure.com`

### Containers:
- `originals/` - Original uploaded photos
- `variants/` - Edited/processed versions
- `backups/` - Database backups

### Next Steps:
1. Configure database migrations
2. Set up backend dependencies
3. Test API endpoints
4. Deploy application
