"""
Authentication router for user registration, login, and OAuth.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from app.database import get_db
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    UserResponse
)
from app.services.auth_service import AuthService
from app.dependencies import get_current_user
from app.models import User
from app.config import settings
from app.utils.security import decode_token
from typing import Dict

router = APIRouter()

# OAuth configuration
config = Config(environ={
    "GOOGLE_CLIENT_ID": settings.google_client_id,
    "GOOGLE_CLIENT_SECRET": settings.google_client_secret,
})

oauth = OAuth(config)
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Register a new user with email and password.
    
    Args:
        user_data: User registration data
        db: Database session
        
    Returns:
        Access and refresh tokens with user info
        
    Raises:
        HTTPException: If email already registered
    """
    # Check if user already exists
    existing_user = AuthService.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = AuthService.create_user(db, user_data)
    
    # Generate tokens
    tokens = AuthService.create_user_tokens(user)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Authenticate user with email and password.
    
    Args:
        credentials: Login credentials
        db: Database session
        
    Returns:
        Access and refresh tokens with user info
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Authenticate user
    user = AuthService.authenticate_user(
        db,
        credentials.email,
        credentials.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate tokens
    tokens = AuthService.create_user_tokens(user)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=Dict[str, str])
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Refresh access token using refresh token.
    
    Args:
        token_data: Refresh token data
        db: Database session
        
    Returns:
        New access token
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    # Decode refresh token
    payload = decode_token(token_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user
    user_id = payload.get("sub")
    user = AuthService.get_user_by_id(db, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate new access token
    from app.utils.security import create_access_token
    token_payload = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_payload)
    
    return {"access_token": access_token}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User information
    """
    return UserResponse.model_validate(current_user)


@router.get("/oauth/google/login")
async def google_login():
    """
    Initiate Google OAuth login flow.
    
    Returns:
        Redirect to Google OAuth consent screen
    """
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(redirect_uri)


@router.get("/oauth/google/callback")
async def google_callback(
    code: str,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Handle Google OAuth callback.
    
    Args:
        code: Authorization code from Google
        db: Database session
        
    Returns:
        Access and refresh tokens with user info
        
    Raises:
        HTTPException: If OAuth flow fails
    """
    try:
        # Exchange code for token
        token = await oauth.google.authorize_access_token()
        
        # Get user info from Google
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        email = user_info.get('email')
        oauth_sub = user_info.get('sub')
        
        if not email or not oauth_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user info from Google"
            )
        
        # Get or create user
        user = AuthService.get_or_create_oauth_user(
            db,
            email=email,
            oauth_provider="google",
            oauth_sub=oauth_sub
        )
        
        # Generate tokens
        tokens = AuthService.create_user_tokens(user)
        
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            user=UserResponse.model_validate(user)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth authentication failed: {str(e)}"
        )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user.
    Note: With JWT, actual logout is handled client-side by removing tokens.
    This endpoint is mainly for logging/audit purposes.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    return {"message": "Successfully logged out"}
