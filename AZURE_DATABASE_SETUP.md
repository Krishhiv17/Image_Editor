# Azure PostgreSQL Setup - Step-by-Step Guide

Follow these steps to create your Azure PostgreSQL database for the Photo Editor project.

## Step 1: Login to Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your student account

## Step 2: Create Azure Database for PostgreSQL

### Using Azure Portal UI:

1. **Search for "Azure Database for PostgreSQL"** in the top search bar
2. Click **"+ Create"** or **"Create Azure Database for PostgreSQL"**

3. **Select Deployment Option:**
   - Choose **"Flexible Server"** (recommended for better performance and cost control)
   - Click **"Create"**

4. **Basics Tab - Configure Server:**
   - **Subscription**: Select your Azure for Students subscription
   - **Resource group**: 
     - Click "Create new"
     - Name: `photo-editor-rg`
   - **Server name**: `photo-editor-db` (or any unique name - must be globally unique)
     - Full server address will be: `photo-editor-db.postgres.database.azure.com`
   - **Region**: Choose closest to you (e.g., `East US`, `West Europe`)
   - **PostgreSQL version**: Select **15**
   - **Workload type**: Select **"Development"** (this optimizes cost for student accounts)
   
5. **Compute + Storage:**
   - Click **"Configure server"**
   - **Compute tier**: Select **"Burstable"** (most cost-effective)
   - **Compute size**: **B1ms** (1 vCore, 2 GiB RAM)
   - **Storage**: 32 GiB is fine (you can increase later)
   - **Backup retention**: 7 days (default)
   - Click **"Save"**

6. **Administrator Account:**
   - **Admin username**: `photoeditor_admin` (or your preference)
   - **Password**: Create a strong password and **SAVE IT SECURELY**
   - **Confirm password**: Re-enter the password

7. **Networking Tab:**
   - **Connectivity method**: Select **"Public access (allowed IP addresses)"**
   - **Firewall rules**:
     - ✅ Check **"Allow public access from any Azure service within Azure to this server"**
     - Click **"+ Add current client IP address"** (this adds your computer's IP)
     - You can add more IPs later
   - **Connection security**:
     - SSL enforcement: Leave as **"Enabled"** (more secure)

8. **Review + Create:**
   - Review all settings
   - Click **"Create"**
   - Wait 5-10 minutes for deployment to complete

## Step 3: Get Connection String

### After deployment completes:

1. Click **"Go to resource"**
2. In the left sidebar, click **"Connection strings"**
3. Copy the **"ADO.NET"** or **"JDBC"** connection string as reference
4. We'll format it for Python/PostgreSQL:

**Format:**
```
postgresql://USERNAME:PASSWORD@SERVERNAME.postgres.database.azure.com:5432/postgres?sslmode=require
```

**Example (replace with YOUR values):**
```
postgresql://photoeditor_admin:YourP@ssw0rd@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

**⚠️ IMPORTANT:** 
- Replace `USERNAME` with your admin username (e.g., `photoeditor_admin`)
- Replace `PASSWORD` with the password you created
- Replace `SERVERNAME` with your server name (e.g., `photo-editor-db`)
- Keep `postgres` as the database name (we'll use the default)
- Keep `?sslmode=require` at the end (required for Azure)

## Step 4: Test Connection from Your Computer

### Option A: Using psql (if you have PostgreSQL tools):
```bash
psql "postgresql://USERNAME:PASSWORD@SERVERNAME.postgres.database.azure.com:5432/postgres?sslmode=require"
```

### Option B: Using Python (we'll do this in the next step):
We'll test it when we run migrations.

## Step 5: Update Backend .env File

Now update your `backend/.env` file with the connection string:

```bash
cd backend
nano .env  # or use any text editor
```

**Update this line:**
```bash
DATABASE_URL=postgresql://photoeditor_admin:YOUR_PASSWORD@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

## Step 6: Install Backend Dependencies

```bash
# Make sure you're in the backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Step 7: Create Database Schema with Alembic

```bash
# Still in backend directory with venv activated

# Generate initial migration
alembic revision --autogenerate -m "Initial schema with users, albums, photos, versions, tags, shares"

# Apply migration to Azure PostgreSQL
alembic upgrade head
```

This will create all the tables (users, albums, photos, photo_versions, tags, photo_tags, shares).

## Step 8: Verify Database Setup

```bash
# Test the API
python app/main.py
```

Visit: http://localhost:8000/docs

You should see all the API endpoints!

## Troubleshooting

### Connection Timeout / Can't Connect:

1. **Check Firewall Rules:**
   - Go to your PostgreSQL server in Azure Portal
   - Click "Networking" in left sidebar
   - Ensure "Allow public access from any Azure service" is checked
   - Add your current IP address

2. **If IP Changed:**
   - Get your current IP: `curl ifconfig.me`
   - Add it to firewall rules in Azure Portal

3. **Connection String Issues:**
   - Ensure password doesn't have special characters that need escaping
   - If password has `@`, `#`, `:`, etc., you may need to URL-encode them
   - Use quotes around the entire connection string

### SSL/TLS Errors:

- Make sure connection string ends with `?sslmode=require`
- Azure PostgreSQL requires SSL

### Authentication Failed:

- Double-check username and password
- Username format should just be the name, not `username@servername`

## Cost Management Tips

- **Stop the database** when not in use (can do this from Azure Portal)
- **Monitor spending** in Cost Management
- **Set up billing alerts** to avoid surprises
- For student accounts, you typically get $100 credit

## Next Steps

Once database is set up:
1. ✅ Backend can connect to database
2. ✅ Run migrations to create tables
3. ✅ Start backend server
4. ✅ Test authentication endpoints
5. Continue building frontend login/signup pages

---

**Let me know when you've:**
1. Created the PostgreSQL server
2. Got the connection string
3. And I'll help you update the .env file and run migrations!
