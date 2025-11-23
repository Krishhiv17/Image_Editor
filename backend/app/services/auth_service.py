"""
Authentication service for user registration, login, and OAuth.
"""
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.models import User
from app.schemas.auth import UserCreate
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token
import uuid


class AuthService:
    """Service class for authentication operations."""
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Create a new user with hashed password.
        
        Args:
            db: Database session
            user_data: User creation data
            
        Returns:
            Created user object
        """
        hashed_pw = hash_password(user_data.password)
        
        db_user = User(
            id=uuid.uuid4(),
            email=user_data.email,
            pass_hash=hashed_pw
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password.
        
        Args:
            db: Database session
            email: User email
            password: Plain text password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = AuthService.get_user_by_email(db, email)
        
        if not user:
            return None
        
        if not user.pass_hash:
            # User registered via OAuth, no password set
            return None
        
        if not verify_password(password, user.pass_hash):
            return None
        
        return user
    
    @staticmethod
    def create_user_tokens(user: User) -> Dict[str, str]:
        """
        Create access and refresh tokens for user.
        
        Args:
            user: User object
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        token_data = {"sub": str(user.id), "email": user.email}
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    
    @staticmethod
    def create_oauth_user(
        db: Session,
        email: str,
        oauth_provider: str,
        oauth_sub: str
    ) -> User:
        """
        Create a new user from OAuth authentication.
        
        Args:
            db: Database session
            email: User email from OAuth
            oauth_provider: OAuth provider name (e.g., "google")
            oauth_sub: OAuth subject identifier
            
        Returns:
            Created user object
        """
        db_user = User(
            id=uuid.uuid4(),
            email=email,
            oauth_provider=oauth_provider,
            oauth_sub=oauth_sub,
            pass_hash=None  # No password for OAuth users
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    
    @staticmethod
    def get_or_create_oauth_user(
        db: Session,
        email: str,
        oauth_provider: str,
        oauth_sub: str
    ) -> User:
        """
        Get existing OAuth user or create new one.
        
        Args:
            db: Database session
            email: User email from OAuth
            oauth_provider: OAuth provider name
            oauth_sub: OAuth subject identifier
            
        Returns:
            User object
        """
        # Check if user exists with this OAuth provider
        user = db.query(User).filter(
            User.email == email,
            User.oauth_provider == oauth_provider
        ).first()
        
        if user:
            return user
        
        # Check if user exists with same email (different provider or password-based)
        user = AuthService.get_user_by_email(db, email)
        if user:
            # Update existing user to add OAuth
            user.oauth_provider = oauth_provider
            user.oauth_sub = oauth_sub
            db.commit()
            db.refresh(user)
            return user
        
        # Create new user
        return AuthService.create_oauth_user(db, email, oauth_provider, oauth_sub)
