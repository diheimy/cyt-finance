"""Dependency injection: validação de JWT do Supabase + secret do cron."""

from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel

from src.config import settings


class CurrentUser(BaseModel):
    id: UUID
    email: str | None = None


def current_user(authorization: str = Header(..., alias="Authorization")) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing_bearer")
    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=500, detail="jwt_secret_not_configured")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"invalid_jwt: {e}") from e

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="sub_missing")
    return CurrentUser(id=UUID(sub), email=payload.get("email"))


def require_cron_secret(x_cron_secret: str = Header(..., alias="X-Cron-Secret")) -> None:
    if not settings.cron_secret or x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=403, detail="invalid_cron_secret")
