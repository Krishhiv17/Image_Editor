# Photo Editor - Azure Deployment Guide

## Prerequisites
- Azure account with active subscription
- Azure CLI installed (`az --version`)
- Docker installed locally (for testing)
- Existing Azure PostgreSQL database
- Existing Azure Blob Storage account

---

## Step 1: Test Docker Locally

### Build and Run Containers
```bash
# From project root
docker-compose up --build

# Test endpoints
# Frontend: http://localhost:3000
# Backend: http://localhost:8000/docs
```

### Verify Everything Works
- [ ] Frontend loads correctly
- [ ] Can log in with Google OAuth
- [ ] Photos upload successfully
- [ ] Albums work
- [ ] Sharing works

---

## Step 2: Prepare for Azure Deployment

### Update Environment Variables

#### Backend `.env` (for Azure)
```bash
DATABASE_URL=postgresql://photoeditor_admin:bunkers%40123@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require
JWT_SECRET_KEY=your-secret-key
JWT_REFRESH_SECRET_KEY=your-refresh-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AZURE_STORAGE_ACCOUNT_NAME=photoeditstorage
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
CORS_ORIGINS=https://your-frontend-app.azurewebsites.net
FRONTEND_URL=https://your-frontend-app.azurewebsites.net
```

#### Frontend `.env` (for Azure)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-app.azurewebsites.net
```

---

## Step 3: Deploy to Azure App Services

### Option A: Using Azure Portal (Recommended for Beginners)

#### Deploy Backend:
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → **Web App**
3. Configure:
   - **Name**: `photo-editor-backend` (or your choice)
   - **Publish**: Docker Container
   - **OS**: Linux
   - **Region**: Same as your database
   - **Pricing**: B1 (Basic, ~$13/month)
4. In **Docker** tab:
   - **Options**: Single Container
   - **Image Source**: Docker Hub (or upload to Azure Container Registry)
   - **Image**: Build and push your image first
5. Click **Review + Create**

#### Deploy Frontend:
1. Repeat steps 1-5 for frontend
2. **Name**: `photo-editor-frontend`
3. Same configuration as backend

#### Configure Environment Variables:
1. Go to your App Service → **Configuration**
2. Click **+ New application setting**
3. Add all environment variables from Step 2
4. Click **Save**

### Option B: Using Azure CLI (Faster)

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="photo-editor-rg"
LOCATION="eastus"
BACKEND_APP="photo-editor-backend"
FRONTEND_APP="photo-editor-frontend"
PLAN="photo-editor-plan"

# Create resource group (if not exists)
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan
az appservice plan create \
  --name $PLAN \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Build and push Docker images (Option 1: Docker Hub)
cd backend
docker build -t yourusername/photo-editor-backend:latest .
docker push yourusername/photo-editor-backend:latest

cd ../frontend
docker build -t yourusername/photo-editor-frontend:latest .
docker push yourusername/photo-editor-frontend:latest

# Create Web Apps
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN \
  --name $BACKEND_APP \
  --deployment-container-image-name yourusername/photo-editor-backend:latest

az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN \
  --name $FRONTEND_APP \
  --deployment-container-image-name yourusername/photo-editor-frontend:latest

# Configure backend environment variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --settings \
    DATABASE_URL="your-database-url" \
    JWT_SECRET_KEY="your-secret" \
    JWT_REFRESH_SECRET_KEY="your-refresh-secret" \
    GOOGLE_CLIENT_ID="your-client-id" \
    GOOGLE_CLIENT_SECRET="your-client-secret" \
    AZURE_STORAGE_ACCOUNT_NAME="photoeditstorage" \
    AZURE_STORAGE_ACCOUNT_KEY="your-key" \
    AZURE_STORAGE_CONNECTION_STRING="your-connection" \
    CORS_ORIGINS="https://$FRONTEND_APP.azurewebsites.net" \
    FRONTEND_URL="https://$FRONTEND_APP.azurewebsites.net"

# Configure frontend environment variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --settings \
    NEXT_PUBLIC_API_URL="https://$BACKEND_APP.azurewebsites.net"

# Enable container logging
az webapp log config \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --docker-container-logging filesystem

az webapp log config \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --docker-container-logging filesystem
```

---

## Step 4: Update OAuth Redirect URLs

### Google OAuth Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add Authorized redirect URI:
   ```
   https://your-backend-app.azurewebsites.net/api/auth/oauth/google/callback
   ```
5. Save

---

## Step 5: Run Database Migrations

```bash
# Connect to your Azure PostgreSQL
psql "postgresql://photoeditor_admin:bunkers%40123@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require"

# Run migrations (if not already done)
\i /path/to/migrations/001_initial_schema.sql
\i /path/to/migrations/002_add_tags.sql
\i /path/to/migrations/003_create_albums.sql
\i /path/to/migrations/004_create_tags.sql
\i /path/to/migrations/005_create_shares.sql
```

---

## Step 6: Test Deployment

1. **Access Frontend**: `https://your-frontend-app.azurewebsites.net`
2. **Test Backend API**: `https://your-backend-app.azurewebsites.net/docs`
3. **Test Features**:
   - [ ] Login with Google
   - [ ] Upload photos
   - [ ] Create albums
   - [ ] Tag photos
   - [ ] Share photos/albums
   - [ ] Search functionality

---

## Step 7: Monitor and Debug

### View Logs:
```bash
# Backend logs
az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP

# Frontend logs
az webapp log tail --resource-group $RESOURCE_GROUP --name $FRONTEND_APP
```

### Common Issues:

**Issue**: OAuth redirect errors
- **Fix**: Update Google OAuth console with correct redirect URI

**Issue**: CORS errors
- **Fix**: Verify CORS_ORIGINS in backend matches frontend URL

**Issue**: Database connection fails
- **Fix**: Check DATABASE_URL and firewall rules in Azure PostgreSQL

**Issue**: Blob storage errors
- **Fix**: Verify Azure Storage credentials and container names

---

## Cost Estimate

### Monthly Costs:
- **Backend App Service (B1)**: ~$13/month
- **Frontend App Service (B1)**: ~$13/month
- **PostgreSQL (Basic)**: Already configured (~$30/month)
- **Blob Storage**: Pay-as-you-go (~$0.02/GB)

**Total**: ~$56+/month

### Cost Optimization:
- Use F1 (Free tier) for testing (limited capacity)
- Scale down to B1 only when needed
- Consider Azure Container Instances for lower cost

---

## Optional: CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: ./backend
          push: true
          tags: yourusername/photo-editor-backend:latest
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: photo-editor-backend
          images: yourusername/photo-editor-backend:latest

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      # Similar steps for frontend
```

---

## Security Checklist

- [ ] Use Azure Key Vault for secrets
- [ ] Enable HTTPS only
- [ ] Configure proper CORS settings
- [ ] Set up Azure Front Door (optional)
- [ ] Enable Application Insights for monitoring
- [ ] Configure backup and disaster recovery
- [ ] Set up alerts for errors and downtime

---

## Support

If you encounter issues:
1. Check logs: `az webapp log tail`
2. Verify environment variables in Azure Portal
3. Test containers locally first
4. Check Azure Status Dashboard for outages

**Your app is now deployed! 🚀**
