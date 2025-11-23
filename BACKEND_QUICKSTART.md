# Quick Start Script for Backend Development

This guide will help you set up the backend locally or with Azure PostgreSQL.

## Option 1: Local Development (without Azure - Recommended for testing)

### Step 1: Install PostgreSQL Locally

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

### Step 2: Create Local Database

```bash
# Create database
createdb photoedit

# Or use psql
psql postgres
CREATE DATABASE photoedit;
\q
```

### Step 3: Set Up Backend Environment

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

### Step 4: Configure Local .env

Edit `backend/.env`:
```bash
# Use local PostgreSQL
DATABASE_URL=postgresql://your_username:@localhost:5432/photoedit

# Generate a secret key
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/oauth/google/callback

# You can skip Azure Blob Storage for now - will set up later
AZURE_STORAGE_ACCOUNT_NAME=placeholder
AZURE_STORAGE_ACCOUNT_KEY=placeholder
AZURE_STORAGE_CONNECTION_STRING=placeholder

CORS_ORIGINS=http://localhost:3000

DEBUG=True
```

### Step 5: Run Database Migrations

```bash
# Create initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head
```

### Step 6: Start Backend Server

```bash
python app/main.py
```

Backend will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

## Option 2: With Azure PostgreSQL

If you've set up Azure resources, update `.env`:

```bash
DATABASE_URL=postgresql://username:password@your-server.postgres.database.azure.com:5432/postgres?sslmode=require
```

Then follow steps 5-6 above.

---

## Testing the API

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Sign Up
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### 3. Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### 4. Get Current User
```bash
# Use the access_token from login response
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Troubleshooting

### Database Connection Error
- Make sure PostgreSQL is running: `brew services list` or `systemctl status postgresql`
- Check database exists: `psql -l`
- Verify connection string in `.env`

### Module Import Errors
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Alembic Migration Issues
```bash
# Reset migrations (CAUTION: destroys data)
alembic downgrade base
alembic upgrade head
```

---

## Next Steps

Once backend is running:
1. Test all auth endpoints in Swagger UI: http://localhost:8000/docs
2. Set up Google OAuth (see AZURE_SETUP.md)
3. Continue with frontend authentication UI
4. Add photo upload endpoints
