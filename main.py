import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from postgrest import APIError

from app.routers import auth, clientes, estoque, gerencial, parcelas, vendas
from app.services.auth import COOKIE_NAME, extrair_token, verify_session_token

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Gestão de Joias")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "app" / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "app" / "templates")

app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(estoque.router)
app.include_router(vendas.router)
app.include_router(parcelas.router)
app.include_router(gerencial.router)


@app.middleware("http")
async def exigir_autenticacao(request: Request, call_next):
    path = request.url.path
    if request.method != "OPTIONS" and path.startswith("/api") and not path.startswith("/api/auth"):
        token = extrair_token(request.cookies.get(COOKIE_NAME), request.headers.get("authorization"))
        try:
            autenticado = verify_session_token(token)
        except RuntimeError as exc:
            return JSONResponse(status_code=503, content={"detail": str(exc)})
        if not autenticado:
            return JSONResponse(status_code=401, content={"detail": "Não autenticado"})
    return await call_next(request)


@app.exception_handler(APIError)
async def supabase_error_handler(request: Request, exc: APIError):
    detail = exc.message or "Erro na API do Supabase"
    if exc.details:
        detail = f"{detail} | details: {exc.details}"
    if exc.hint:
        detail = f"{detail} | hint: {exc.hint}"
    return JSONResponse(status_code=400, content={"detail": detail, "code": exc.code})


@app.exception_handler(RuntimeError)
async def supabase_config_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse(request, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
