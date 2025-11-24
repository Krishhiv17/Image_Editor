# Azure Database Connection Troubleshooting

## Issue
Cannot connect to Azure PostgreSQL database when trying to add `thumbnail_url` column.

**Error:**
```
could not translate host name "photo-editor-db.postgres.database.azure.com" 
to address: nodename nor servname provided, or not known
```

## Root Cause
Network/DNS issue preventing connection to Azure database.

## Solutions

### Option 1: Check Internet Connection
1. Open browser: https://portal.azure.com
2. If Azure Portal loads → Azure is reachable
3. If not → Check your Wi-Fi/network connection

### Option 2: Wait for Azure (Temporary Outage)
- Azure services sometimes have brief outages 
- Wait 1-2 minutes
- Tell the agent to retry the migration

### Option 3: Verify Azure Firewall Settings
1. Go to Azure Portal
2. Navigate to PostgreSQL server: `photo-editor-db`
3. Click "Networking" or "Connection security"
4. Ensure "Allow public access" is enabled
5. Add your current IP address to allowed list

### Option 4: Flush DNS Cache (Mac)
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

## What Needs to Happen
Once connection is restored, run:
```bash
cd backend
./venv/bin/alembic upgrade head
```

This will add the missing `thumbnail_url` column to the photos table.

## Temporary Workaround
If Azure is unreachable but backend server is running locally, photo uploads will fail until the column is added.
