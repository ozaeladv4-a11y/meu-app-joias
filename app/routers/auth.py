from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.services.auth import (
    COOKIE_NAME,
    SESSION_MAX_AGE,
    create_session_token,
    verify_password,
    verify_session_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    senha: str


@router.post("/login")
def login(dados: LoginRequest, response: Response, request: Request):
    if not verify_password(dados.senha):
        raise HTTPException(status_code=401, detail="Senha incorreta")

    token = create_session_token()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
        path="/",
    )
    return {"ok": True}


@router.get("/status")
def status(request: Request):
    return {"authenticated": verify_session_token(request.cookies.get(COOKIE_NAME))}
