# Azure Database Connection Helper

## Your Connection Details (from Azure Portal):

- Server: `photo-editor-db.postgres.database.azure.com`
- Username: `photoeditor_admin`
- Port: `5432`
- Database: `postgres`
- Password: `[YOUR_PASSWORD_HERE]`

## Connection String Format:

```
postgresql://photoeditor_admin:[YOUR_PASSWORD]@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

## Steps to Complete Setup:

### 1. Update backend/.env file

Replace the DATABASE_URL line with:
```bash
DATABASE_URL=postgresql://photoeditor_admin:YOUR_ACTUAL_PASSWORD@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

**Replace `YOUR_ACTUAL_PASSWORD` with the password you created when setting up the database.**

### 2. Set up Python virtual environment

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# You should see (venv) in your terminal prompt
```

### 3. Install dependencies

```bash
# Make sure venv is activated (you should see (venv) in prompt)
pip install -r requirements.txt
```

This will install all required packages including:
- FastAPI, SQLAlchemy, Alembic
- Azure SDK
- Authentication libraries
- Image processing tools

### 4. Run database migrations

```bash
# Generate migration from models
alembic revision --autogenerate -m "Initial schema: users, albums, photos, versions, tags, shares"

# Apply migration to Azure database
alembic upgrade head
```

This creates all the tables in your Azure PostgreSQL database!

### 5. Start the backend server

```bash
python app/main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### 6. Test the API

Open your browser to:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## What's Your Password?

**Option 1:** Tell me your password and I'll update the .env file for you

**Option 2:** You can manually edit `backend/.env` and replace this line:
```bash
DATABASE_URL=postgresql://krishhiv:@localhost:5432/photoedit
```

With:
```bash
DATABASE_URL=postgresql://photoeditor_admin:YOUR_PASSWORD@photo-editor-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

Then run the commands above!
