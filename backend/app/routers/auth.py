"""Authentication & User-Management Router"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
import bcrypt
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ── Schemas ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role_id: int

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# ── Helpers ──────────────────────────────────────────────
def create_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Giriş yapılmadı")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token süresi dolmuş veya geçersiz")

    row = await db.execute(
        text("""
            SELECT u.id, u.username, u.email, u.full_name, u.is_active,
                   r.name as role_name, r.permissions, u.role_id,
                   u.last_login, u.created_at
            FROM users u LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = :uid
        """),
        {"uid": int(user_id)},
    )
    user = row.mappings().first()
    if not user or not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı veya devre dışı")
    return dict(user)


async def require_admin(user: dict = Depends(get_current_user)):
    if user["role_name"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu işlem için yönetici yetkisi gerekli")
    return user


# ── Routes ───────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    row = await db.execute(
        text("""
            SELECT u.id, u.username, u.email, u.full_name, u.hashed_password,
                   u.is_active, r.name as role_name, r.permissions, u.role_id,
                   u.last_login, u.created_at
            FROM users u LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.username = :uname
        """),
        {"uname": body.username},
    )
    user = row.mappings().first()
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı adı veya şifre hatalı")
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap devre dışı bırakılmış")

    # Update last_login
    await db.execute(text("UPDATE users SET last_login = NOW() WHERE id = :uid"), {"uid": user["id"]})
    await db.commit()

    token = create_token({"sub": str(user["id"]), "role": user["role_name"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role_name"],
            "permissions": user["permissions"],
        },
    }


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role_name"],
        "permissions": user["permissions"],
    }


@router.post("/change-password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await db.execute(text("SELECT hashed_password FROM users WHERE id = :uid"), {"uid": user["id"]})
    stored = row.scalar_one()
    if not verify_password(body.current_password, stored):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
    hashed = hash_password(body.new_password)
    await db.execute(text("UPDATE users SET hashed_password = :hp, updated_at = NOW() WHERE id = :uid"), {"hp": hashed, "uid": user["id"]})
    await db.commit()
    return {"message": "Şifre başarıyla güncellendi"}


# ── Admin: User Management ───────────────────────────────

@router.get("/users")
async def list_users(admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("""
        SELECT u.id, u.username, u.email, u.full_name, u.is_active,
               r.name as role_name, u.role_id, u.last_login, u.created_at
        FROM users u LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
    """))
    return [dict(r) for r in rows.mappings().all()]


@router.post("/users")
async def create_user(body: UserCreate, admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(text("SELECT id FROM users WHERE username = :u OR email = :e"), {"u": body.username, "e": body.email})
    if existing.first():
        raise HTTPException(status_code=400, detail="Kullanıcı adı veya e-posta zaten kullanımda")
    hashed = hash_password(body.password)
    result = await db.execute(
        text("""
            INSERT INTO users (username, email, full_name, hashed_password, role_id)
            VALUES (:u, :e, :fn, :hp, :rid) RETURNING id
        """),
        {"u": body.username, "e": body.email, "fn": body.full_name, "hp": hashed, "rid": body.role_id},
    )
    await db.commit()
    return {"id": result.scalar_one(), "message": "Kullanıcı oluşturuldu"}


@router.put("/users/{user_id}")
async def update_user(user_id: int, body: UserUpdate, admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    sets, params = [], {"uid": user_id}
    if body.email is not None:
        sets.append("email = :email")
        params["email"] = body.email
    if body.full_name is not None:
        sets.append("full_name = :full_name")
        params["full_name"] = body.full_name
    if body.role_id is not None:
        sets.append("role_id = :role_id")
        params["role_id"] = body.role_id
    if body.is_active is not None:
        sets.append("is_active = :is_active")
        params["is_active"] = body.is_active
    if not sets:
        raise HTTPException(status_code=400, detail="Güncelleme verisi yok")
    sets.append("updated_at = NOW()")
    await db.execute(text(f"UPDATE users SET {', '.join(sets)} WHERE id = :uid"), params)
    await db.commit()
    return {"message": "Kullanıcı güncellendi"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz")
    await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
    await db.commit()
    return {"message": "Kullanıcı silindi"}


@router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: int, admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    hashed = hash_password("temsa2026")
    await db.execute(text("UPDATE users SET hashed_password = :hp, updated_at = NOW() WHERE id = :uid"), {"hp": hashed, "uid": user_id})
    await db.commit()
    return {"message": "Şifre 'temsa2026' olarak sıfırlandı"}


@router.get("/roles")
async def list_roles(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(text("SELECT id, name, description, permissions FROM roles ORDER BY id"))
    return [dict(r) for r in rows.mappings().all()]
