# Azure Blob Storage Setup - Step-by-Step Guide

Complete guide to set up Azure Blob Storage for the Photo Editor application.

---

## Step 1: Create Azure Storage Account

### 1.1 Navigate to Storage Accounts

1. Go to [Azure Portal](https://portal.azure.com)
2. In the search bar at the top, type **"Storage accounts"**
3. Click on **"Storage accounts"** from the results

### 1.2 Create New Storage Account

1. Click **"+ Create"** or **"Create storage account"** button
2. You'll see the "Create a storage account" form

### 1.3 Configure Basics Tab

**Project Details:**
- **Subscription**: Select your "Azure for Students" subscription
- **Resource group**: Select **"photo-editor-rg"** (the one we created for PostgreSQL)

**Instance Details:**
- **Storage account name**: `photoeditstorage` (or choose a unique name)
  - Must be globally unique
  - 3-24 characters, lowercase letters and numbers only
  - No hyphens or special characters
  - Example: `photoeditstorage`, `photoeditor2024`, etc.
- **Region**: Choose the **same region** as your PostgreSQL database (e.g., East US)
- **Performance**: Select **"Standard"** (most cost-effective for student accounts)
- **Redundancy**: Select **"Locally-redundant storage (LRS)"** (cheapest option, sufficient for development)

### 1.4 Configure Advanced Tab

1. Click **"Next: Advanced"** at the bottom
2. Settings to configure:
   - **Require secure transfer for REST API operations**: ✅ Enabled (keep default)
   - **Enable blob public access**: ✅ **CHECK THIS BOX** (we need public access for variants)
   - **Enable storage account key access**: ✅ Enabled (keep default)
   - **Default to Microsoft Entra authorization**: ❌ Disabled
   - **Minimum TLS version**: **Version 1.2** (keep default)
   - **Enable hierarchical namespace**: ❌ Disabled
   - **Access tier**: **Hot** (for frequently accessed data)

### 1.5 Configure Networking Tab

1. Click **"Next: Networking"**
2. **Network access**: Select **"Enable public access from all networks"**
   - (You can restrict this later for production)
3. **Network routing**: Keep default (Microsoft network routing)

### 1.6 Configure Data Protection Tab

1. Click **"Next: Data protection"**
2. **Recovery** section:
   - ✅ Enable soft delete for blobs (recommended)
   - Days: **7 days** (default)
   - ✅ Enable soft delete for containers
   - Days: **7 days**
3. **Tracking** section:
   - ✅ Enable versioning for blobs (helpful for debugging)
   - ❌ Uncheck "Enable blob change feed" (not needed)

### 1.7 Review + Create

1. Click **"Next: Review + create"**
2. Review all settings
3. Click **"Create"**
4. Wait 1-2 minutes for deployment to complete
5. Click **"Go to resource"** when deployment completes

---

## Step 2: Create Blob Containers

### 2.1 Navigate to Containers

1. In your storage account page, find the left sidebar
2. Under **"Data storage"** section, click **"Containers"**

### 2.2 Create "originals" Container

1. Click **"+ Container"** at the top
2. Fill in the form:
   - **Name**: `originals`
   - **Public access level**: **Private (no anonymous access)**
3. Click **"Create"**

### 2.3 Create "variants" Container

1. Click **"+ Container"** again
2. Fill in the form:
   - **Name**: `variants`
   - **Public access level**: **Blob (anonymous read access for blobs only)**
     - This allows CDN to serve edited images publicly
3. Click **"Create"**

### 2.4 Create "backups" Container

1. Click **"+ Container"** again
2. Fill in the form:
   - **Name**: `backups`
   - **Public access level**: **Private (no anonymous access)**
3. Click **"Create"**

### 2.5 Verify All Containers

You should now see three containers:
- ✅ `originals` (Private)
- ✅ `variants` (Blob)
- ✅ `backups` (Private)

---

## Step 3: Get Storage Account Keys

### 3.1 Navigate to Access Keys

1. In your storage account, find the left sidebar
2. Under **"Security + networking"** section, click **"Access keys"**

### 3.2 Copy Connection Information

You'll see two keys (key1 and key2). You only need one.

**Copy the following information:**

1. **Storage account name**: (e.g., `photoeditstorage`)
2. **Key**: Click **"Show"** next to **key1**, then copy the key value
3. **Connection string**: Click **"Show"** next to **Connection string** under key1, then copy it

**Example of what you'll copy:**
```
Storage account name: photoeditstorage
Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Connection string: DefaultEndpointsProtocol=https;AccountName=photoeditstorage;AccountKey=xxxx;EndpointSuffix=core.windows.net
```

---

## Step 4: Update Backend Configuration

### 4.1 Update .env File

1. Open `backend/.env` in your text editor
2. Replace the placeholder Azure Blob Storage values:

```bash
# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=photoeditstorage
AZURE_STORAGE_ACCOUNT_KEY=your-actual-key-from-step-3
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=photoeditstorage;AccountKey=your-actual-key;EndpointSuffix=core.windows.net
BLOB_CONTAINER_ORIGINALS=originals
BLOB_CONTAINER_VARIANTS=variants
BLOB_CONTAINER_BACKUPS=backups
```

**Important**: Replace:
- `photoeditstorage` with YOUR storage account name
- `your-actual-key-from-step-3` with the actual key you copied
- The full connection string with what you copied

### 4.2 Restart Backend Server

The backend server needs to be restarted to pick up the new environment variables.

**In your terminal where backend is running:**
1. Press `Ctrl+C` to stop the server
2. Restart it:
```bash
cd backend
PYTHONPATH=/Users/krishhiv/Desktop/DPCS/Image_Editor/backend ./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Step 5: Test Blob Storage Connection

### 5.1 Quick Python Test

Run this script to verify your connection works:

```bash
cd backend
./venv/bin/python << 'EOF'
from azure.storage.blob import BlobServiceClient
from app.config import settings

print("🔍 Testing Azure Blob Storage connection...")
print(f"Storage Account: {settings.azure_storage_account_name}")

try:
    # Create BlobServiceClient
    blob_service_client = BlobServiceClient.from_connection_string(
        settings.azure_storage_connection_string
    )
    
    # List containers
    containers = blob_service_client.list_containers()
    container_names = [c.name for c in containers]
    
    print(f"\n✅ Connected successfully!")
    print(f"✅ Found {len(container_names)} containers:")
    for name in container_names:
        print(f"   • {name}")
    
    # Test upload to originals container
    print("\n🧪 Testing upload to 'originals' container...")
    container_client = blob_service_client.get_container_client("originals")
    blob_client = container_client.get_blob_client("test.txt")
    blob_client.upload_blob(b"Hello from Photo Editor!", overwrite=True)
    print("✅ Test upload successful!")
    
    # Clean up test file
    blob_client.delete_blob()
    print("✅ Test cleanup complete!")
    
    print("\n🎉 Azure Blob Storage is ready to use!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\n💡 Troubleshooting:")
    print("   1. Check your connection string in backend/.env")
    print("   2. Verify storage account name and key are correct")
    print("   3. Ensure containers exist: originals, variants, backups")

EOF
```

---

## Step 6: Verify in Azure Portal

### 6.1 Check Test File Upload (if test was successful)

1. Go back to Azure Portal → Your storage account
2. Click **"Containers"**
3. Click on **"originals"**
4. You should see it's empty (we deleted the test file)

---

## Troubleshooting

### Error: "Storage account not found"

**Solution:**
- Double-check the storage account name in `.env` matches exactly (no typos)
- Ensure the storage account was created successfully in Azure Portal

### Error: "Authentication failed"

**Solution:**
- Verify the connection string is copied correctly
- Make sure there are no extra spaces or line breaks
- Try generating a new key from Azure Portal → Access keys

### Error: "Container not found"

**Solution:**
- Go to Azure Portal → Storage account → Containers
- Verify all three containers exist: `originals`, `variants`, `backups`
- Container names are case-sensitive and must be lowercase

### Connection String Issues

If you see `%` or special characters causing issues in the connection string:
- Make sure the entire connection string is on one line in `.env`
- Don't manually URL-encode it - use it exactly as copied from Azure

---

## Security Best Practices

### For Production:

1. **Use Managed Identities** instead of connection strings
2. **Restrict network access** to specific IPs
3. **Enable CORS** only for your frontend domain
4. **Rotate access keys** regularly
5. **Use SAS tokens** for user uploads (we'll implement this)
6. **Enable Azure AD authentication** for admin access

### For Development (Current Setup):

- ✅ Connection string in `.env` (gitignored)
- ✅ Soft delete enabled (7 days)
- ✅ Versioning enabled
- ✅ LRS redundancy (cost-effective)

---

## Cost Monitoring

### Free Tier Limits (Azure for Students):

- First 5 GB storage: **Free**
- After that: ~$0.0184/GB per month (LRS)
- Operations: 20,000 write operations free per month

### Tips to Stay Within Budget:

1. Delete unused test files
2. Use soft delete but keep retention short (7 days)
3. Monitor usage in Azure Portal → Storage account → Metrics
4. Set up budget alerts in Cost Management

---

## What's Next?

Once Blob Storage is set up, you'll be able to:

1. ✅ Upload photos to `originals/` container
2. ✅ Store edited versions in `variants/` container
3. ✅ Generate SAS tokens for secure uploads
4. ✅ Serve images via CDN (from `variants/`)

**Next Steps:**
1. Build photo upload backend endpoint
2. Build photo upload frontend UI
3. Implement image processing with operation graphs

---

## Quick Reference

**Storage Account Details:**
- Name: `photoeditstorage` (yours may differ)
- Type: Standard LRS
- Region: East US (or your chosen region)

**Containers:**
- `originals/` - Private - Original uploaded photos
- `variants/` - Blob (public) - Edited/processed versions
- `backups/` - Private - Database backups

**Configuration:**
- Location: `backend/.env`
- Required variables: `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_ACCOUNT_KEY`, `AZURE_STORAGE_CONNECTION_STRING`

---

Let me know when you've completed the setup and the test passes! 🚀
