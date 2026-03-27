from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS
from typing import Optional

def create_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload.get("sub"), "role": payload.get("role")}
    except JWTError:
        return None
