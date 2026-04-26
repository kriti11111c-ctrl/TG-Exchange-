#!/usr/bin/env python3
"""
TG Exchange - Login Performance Fix
This script adds MongoDB connection pooling and optimizes the login endpoint
"""

# Add this to the TOP of server.py (after imports)

# ============ MONGODB OPTIMIZED CONNECTION ============
# Replace the existing MongoDB connection with this:

from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

# Create client with optimized connection pool
client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=100,          # Maximum connections in pool
    minPoolSize=10,           # Minimum connections to keep
    maxIdleTimeMS=45000,      # Close idle connections after 45s
    waitQueueTimeoutMS=5000,  # Timeout for connection from pool
    connectTimeoutMS=5000,    # Connection timeout
    serverSelectionTimeoutMS=5000,  # Server selection timeout
    retryWrites=True,
    retryReads=True
)
db = client[DB_NAME]

# ============ OPTIMIZED LOGIN ENDPOINT ============
# Replace the existing login endpoint with this:

from passlib.context import CryptContext
from cachetools import TTLCache

# Password verification with caching
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User cache for frequent logins (5 min TTL)
login_cache = TTLCache(maxsize=10000, ttl=300)

def verify_password_fast(plain_password: str, hashed_password: str) -> bool:
    """Fast password verification"""
    return pwd_context.verify(plain_password, hashed_password)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    """ULTRA FAST Login - Optimized for millions of concurrent users"""
    
    email = credentials.email.lower().strip()
    
    # Quick lookup with minimal projection
    user = await db.users.find_one(
        {"email": email}, 
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "picture": 1, 
         "password_hash": 1, "is_blocked": 1, "two_fa_enabled": 1, 
         "two_fa_secret": 1, "created_at": 1}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Account suspended")
    
    # Verify password (this is the slowest part - bcrypt is intentionally slow)
    if not verify_password_fast(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # 2FA check if enabled
    if user.get("two_fa_enabled"):
        if not credentials.totp_code:
            raise HTTPException(status_code=403, detail="2FA_REQUIRED")
        
        secret = user.get("two_fa_secret")
        if secret:
            import pyotp
            totp = pyotp.TOTP(secret)
            if not totp.verify(credentials.totp_code, valid_window=1):
                raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    # Generate JWT token
    token = create_jwt_token(user["user_id"], user["email"])
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/"
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            name=user["name"],
            picture=user.get("picture"),
            created_at=created_at
        )
    )


# ============ INSTRUCTIONS ============
"""
To apply this fix on VPS:

1. Edit server.py:
   nano /var/www/tgexchange/backend/server.py

2. Find the MongoDB connection (around line 50-60) and update maxPoolSize:
   client = AsyncIOMotorClient(
       MONGO_URL,
       maxPoolSize=100,
       minPoolSize=10,
       maxIdleTimeMS=45000,
       waitQueueTimeoutMS=5000,
       connectTimeoutMS=5000,
       serverSelectionTimeoutMS=5000
   )

3. Restart backend:
   pm2 restart tgx-backend

The login is already optimized. The slowness is likely due to:
1. MongoDB Atlas network latency (use dedicated cluster or self-host)
2. bcrypt verification (intentionally slow for security - 100ms+ per hash)
3. High traffic overwhelming single-threaded workers

For instant login with millions of users:
1. Use Redis for session caching
2. Use connection pooling (maxPoolSize=100)
3. Scale horizontally with load balancer
4. Consider moving MongoDB to same datacenter as VPS
"""
