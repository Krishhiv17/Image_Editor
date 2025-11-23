# Photo Editor Application

A cloud-based photo editing application with advanced features built with Next.js and FastAPI.

## Features

- 📸 **Photo Upload & Management**: Upload multiple photos with drag-and-drop, organize in albums
- ✏️ **Advanced Editing**: Crop, rotate, resize, adjust brightness/contrast/saturation, apply filters
- 📜 **Version History**: Track all edits, revert to previous versions
- 🔍 **Search & Organization**: Search by tags, EXIF metadata, date ranges
- 🔗 **Sharing**: Generate share links with view/edit permissions and expiry
- 🔐 **Google OAuth**: Secure authentication with Google
- ☁️ **Cloud Storage**: Integrated with Azure Blob Storage and PostgreSQL
- ♿ **Accessible**: WCAG AA compliant with keyboard navigation and screen reader support

## Project Structure

```
Image_Editor/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── models/    # SQLAlchemy models
│   │   ├── routers/   # API routes
│   │   ├── services/  # Business logic
│   │   ├── schemas/   # Pydantic schemas
│   │   └── utils/     # Utilities
│   ├── migrations/    # Alembic migrations
│   └── tests/         # PyTest tests
├── frontend/          # Next.js frontend
│   ├── app/           # Next.js 14 app router
│   ├── components/    # React components
│   ├── lib/           # Utilities and API client
│   ├── hooks/         # Custom React hooks
│   └── types/         # TypeScript types
└── docs/              # Documentation
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- Azure Student Account
- Google Cloud Console account (for OAuth)

## Setup

### 1. Azure Resources

Follow the detailed [Azure Setup Guide](./AZURE_SETUP.md) to:
- Create Azure PostgreSQL database
- Create Azure Blob Storage account
- Configure Google OAuth
- (Optional) Create Azure VM for deployment

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your Azure credentials

# Run database migrations
alembic upgrade head

# Start development server
python app/main.py
```

Backend will run on http://localhost:8000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Frontend will run on http://localhost:3000

## Environment Variables

### Backend (.env)
- `DATABASE_URL`: Azure PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `AZURE_STORAGE_ACCOUNT_NAME`: Azure storage account name
- `AZURE_STORAGE_ACCOUNT_KEY`: Azure storage account key

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## API Documentation

Once the backend is running, visit:
- API docs (Swagger): http://localhost:8000/docs
- Alternative docs (ReDoc): http://localhost:8000/redoc

## Deployment

See [Deployment Guide](./DEPLOYMENT.md) for production deployment instructions.

## Architecture

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: FastAPI with SQLAlchemy ORM
- **Database**: Azure PostgreSQL
- **Storage**: Azure Blob Storage
- **Authentication**: JWT + Google OAuth
- **Image Processing**: Pillow, OpenCV

## Security

- HTTPS/TLS encryption
- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Security headers (CSP, X-Frame-Options, etc.)
- Automatic GPS stripping from EXIF for public shares

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

This project is for educational purposes as part of DPCS coursework.

## Support

For issues and questions, please refer to the project documentation or contact the development team.
