from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt_handler import verify_token

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return payload

async def require_doctor(user=Depends(get_current_user)):
    if user.get("role") != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access required")
    return user

async def require_patient(user=Depends(get_current_user)):
    if user.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access required")
    return user

async def optional_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    return verify_token(credentials.credentials)
