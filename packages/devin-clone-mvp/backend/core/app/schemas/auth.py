from typing import Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field, validator, root_validator
import re
import string
import random


class UserSignUp(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = Field(None, max_length=255)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must be alphanumeric with only _ and - allowed')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserSignIn(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Schema for token refresh"""
    refresh_token: str


class TokenPayload(BaseModel):
    """Schema for JWT token payload"""
    sub: str
    exp: int
    type: str
    jti: Optional[str] = None


class PasswordReset(BaseModel):
    """Schema for password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class GuestUserCreate(BaseModel):
    """Schema for guest user creation"""
    username: str
    email: str
    is_guest: bool = True
    
    @root_validator(pre=True)
    def generate_guest_credentials(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        """Generate random username and email for guest users if not provided"""
        if not values.get('username'):
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            values['username'] = f'guest_{random_suffix}'
        
        if not values.get('email'):
            random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            values['email'] = f'guest_{random_suffix}@guest.devinclone.app'
            
        values['is_guest'] = True
        return values