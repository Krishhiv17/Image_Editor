# Photo Editor - Production Deployment

## 🚀 Quick Deploy to Azure

### Prerequisites
```bash
# Install Azure CLI
brew install azure-cli  # macOS
# or visit https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Install Docker
# https://docs.docker.com/get-docker/
```

### Deploy in 5 Steps

#### 1. Login to Azure
```bash
az login
```

#### 2. Set Your Variables
```bash
export RESOURCE_GROUP="photo-editor-rg"
export LOCATION="eastus"
export BACKEND_APP="photo-editor-backend-$(whoami)"
export FRONTEND_APP="photo-editor-frontend-$(whoami)"
export DOCKER_USERNAME="your-dockerhub-username"
```

#### 3. Build & Push Docker Images
```bash
# Backend
cd backend
docker build -t $DOCKER_USERNAME/photo-editor-backend:latest .
docker push $DOCKER_USERNAME/photo-editor-backend:latest

# Frontend
cd ../frontend
docker build -t $DOCKER_USERNAME/photo-editor-frontend:latest .
docker push $DOCKER_USERNAME/photo-editor-frontend:latest
```

#### 4. Create Azure Resources
```bash
# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan
az appservice plan create \
  --name photo-editor-plan \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Deploy Backend
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan photo-editor-plan \
  --name $BACKEND_APP \
  --deployment-container-image-name $DOCKER_USERNAME/photo-editor-backend:latest

# Deploy Frontend
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan photo-editor-plan \
  --name $FRONTEND_APP \
  --deployment-container-image-name $DOCKER_USERNAME/photo-editor-frontend:latest
```

#### 5. Configure Environment Variables
```bash
# Backend
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --settings \
    DATABASE_URL="<your-azure-postgres-url>" \
    JWT_SECRET_KEY="<generate-random-key>" \
    JWT_REFRESH_SECRET_KEY="<generate-random-key>" \
    GOOGLE_CLIENT_ID="<your-google-client-id>" \
    GOOGLE_CLIENT_SECRET="<your-google-secret>" \
    AZURE_STORAGE_ACCOUNT_NAME="photoeditstorage" \
    AZURE_STORAGE_ACCOUNT_KEY="<your-storage-key>" \
    AZURE_STORAGE_CONNECTION_STRING="<your-connection-string>" \
    CORS_ORIGINS="https://$FRONTEND_APP.azurewebsites.net" \
    FRONTEND_URL="https://$FRONTEND_APP.azurewebsites.net"

# Frontend
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --settings NEXT_PUBLIC_API_URL="https://$BACKEND_APP.azurewebsites.net"
```

### Access Your App

```bash
echo "Frontend: https://$FRONTEND_APP.azurewebsites.net"
echo "Backend API: https://$BACKEND_APP.azurewebsites.net/docs"
```

---

## 🧪 Test Locally with Docker

```bash
# Create .env file with your credentials
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000/docs
```

---

## 📚 Full Documentation

See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for:
- Detailed deployment steps
- Environment variable configuration
- OAuth setup
- Database migrations
- Troubleshooting guide
- Cost estimates
- CI/CD setup

---

## 🔧 Project Structure

```
Image_Editor/
├── backend/              # FastAPI backend
│   ├── app/
│   ├── migrations/       # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # Next.js frontend
│   ├── app/
│   ├── components/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml    # Local development
└── AZURE_DEPLOYMENT.md   # Deployment guide
```

---

## ✨ Features

- 📸 Photo upload and management
- 🎨 Advanced image editing (filters, crop, rotate, etc.)
- 📁 Album organization
- 🏷️ Photo tagging
- 🔍 Search and filtering
- 🔗 Secure sharing (photos & albums)
- 🔐 Google OAuth authentication
- ☁️ Azure Blob Storage integration

---

## 💰 Azure Cost Estimate

**Monthly costs:**
- Backend App Service (B1): ~$13
- Frontend App Service (B1): ~$13
- PostgreSQL (Basic): ~$30
- Blob Storage: ~$0.02/GB

**Total: ~$56+/month**

*Use F1 (Free tier) for testing*

---

## 🛠️ Tech Stack

**Backend:**
- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL
- Azure Blob Storage

**Frontend:**
- Next.js 16
- React
- TypeScript
- Tailwind CSS

**Infrastructure:**
- Docker
- Azure App Services
- Azure PostgreSQL
- Azure Blob Storage

---

## 📝 License

MIT License - feel free to use for your projects!

---

## 🤝 Support

For issues or questions, check the deployment guide or create an issue.

**Happy Deploying! 🚀**
