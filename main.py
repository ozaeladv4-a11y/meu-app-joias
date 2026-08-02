import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from postgrest import APIError

from app.routers import clientes, estoque, gerencial, parcelas, vendas

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Gestão de Joias")

app.mount("/static", StaticFiles(directory=BASE_DIR / "app" / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "app" / "templates")

app.include_router(clientes.router)
app.include_router(estoque.router)
app.include_router(vendas.router)
app.include_router(parcelas.router)
app.include_router(gerencial.router)


@app.exception_handler(APIError)
async def supabase_error_handler(request: Request, exc: APIError):
    return JSONResponse(status_code=400, content={"detail": exc.message or "Erro na API do Supabase"})


@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse(request, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
