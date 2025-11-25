"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.config import settings
from app.routers import auth

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# Add Session Middleware (required for OAuth)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret_key,  # Use same secret as JWT
    max_age=3600,  # 1 hour session
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' blob: data:; script-src 'self'"
    if not settings.debug:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/")
async def root():
    return {"message": "Photo Editor API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {"status": "ok"}


# Include routers
from app.routers import photos, edits
from app.routes import albums, tags, search, shares

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])
app.include_router(edits.router, prefix="/api/edits", tags=["edits"])
app.include_router(albums.router)  # Albums router has its own prefix
app.include_router(tags.router)  # Tags router has its own prefix
app.include_router(search.router)  # Search router has its own prefix
app.include_router(shares.router)  # Shares router has its own prefix

# Additional routers will be added as we build them
# app.include_router(search.router, prefix="/api/search", tags=["search"])
# app.include_router(shares.router, prefix="/api/shares", tags=["shares"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
