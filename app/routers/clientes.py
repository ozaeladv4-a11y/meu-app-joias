from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


class ClienteCreate(BaseModel):
    nome: str
    cpf: str | None = None
    telefone: str | None = None
    endereco: str | None = None


class ClienteUpdate(BaseModel):
    nome: str | None = None
    cpf: str | None = None
    telefone: str | None = None
    endereco: str | None = None


@router.get("")
def listar_clientes():
    supabase = get_supabase()
    resp = supabase.table("clientes").select("*").order("nome").execute()
    return resp.data


@router.get("/{cliente_id}")
def obter_cliente(cliente_id: UUID):
    supabase = get_supabase()
    resp = supabase.table("clientes").select("*").eq("id", str(cliente_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return resp.data[0]


@router.post("", status_code=201)
def criar_cliente(cliente: ClienteCreate):
    supabase = get_supabase()
    resp = supabase.table("clientes").insert(cliente.model_dump()).execute()
    return resp.data[0]


@router.put("/{cliente_id}")
def atualizar_cliente(cliente_id: UUID, cliente: ClienteUpdate):
    supabase = get_supabase()
    dados = cliente.model_dump(exclude_unset=True)
    if not dados:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    resp = supabase.table("clientes").update(dados).eq("id", str(cliente_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return resp.data[0]


@router.delete("/{cliente_id}", status_code=204)
def excluir_cliente(cliente_id: UUID):
    supabase = get_supabase()
    resp = supabase.table("clientes").delete().eq("id", str(cliente_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
