from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/estoque", tags=["estoque"])


class EstoqueCreate(BaseModel):
    descricao: str
    categoria: str | None = None
    peso_g: float | None = None
    preco_custo: float | None = None
    preco_venda: float | None = None
    status: str = "Disponível"


class EstoqueUpdate(BaseModel):
    descricao: str | None = None
    categoria: str | None = None
    peso_g: float | None = None
    preco_custo: float | None = None
    preco_venda: float | None = None
    status: str | None = None


class EstoqueBaixa(BaseModel):
    status: str = "Baixado"


def _com_margem(dados: dict) -> dict:
    preco_custo = dados.get("preco_custo")
    preco_venda = dados.get("preco_venda")
    if preco_custo is not None and preco_venda is not None and preco_custo != 0:
        dados["margem_r"] = round(preco_venda - preco_custo, 2)
        dados["margem_pct"] = round((preco_venda - preco_custo) / preco_custo * 100, 2)
    return dados


@router.get("")
def listar_estoque(status: str | None = None, categoria: str | None = None):
    supabase = get_supabase()
    query = supabase.table("estoque").select("*").order("data_entrada", desc=True)
    if status:
        query = query.eq("status", status)
    if categoria:
        query = query.eq("categoria", categoria)
    return query.execute().data


@router.get("/{peca_id}")
def obter_peca(peca_id: UUID):
    supabase = get_supabase()
    resp = supabase.table("estoque").select("*").eq("id", str(peca_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    return resp.data[0]


@router.post("", status_code=201)
def inserir_peca(peca: EstoqueCreate):
    supabase = get_supabase()
    dados = _com_margem(peca.model_dump())
    resp = supabase.table("estoque").insert(dados).execute()
    return resp.data[0]


@router.put("/{peca_id}")
def atualizar_peca(peca_id: UUID, peca: EstoqueUpdate):
    supabase = get_supabase()
    dados = peca.model_dump(exclude_unset=True)
    if not dados:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    if "preco_custo" in dados or "preco_venda" in dados:
        atual = supabase.table("estoque").select("preco_custo, preco_venda").eq("id", str(peca_id)).execute()
        if not atual.data:
            raise HTTPException(status_code=404, detail="Peça não encontrada")
        dados = _com_margem({**atual.data[0], **dados})

    resp = supabase.table("estoque").update(dados).eq("id", str(peca_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    return resp.data[0]


@router.delete("/{peca_id}", status_code=204)
def excluir_peca(peca_id: UUID):
    supabase = get_supabase()
    resp = supabase.table("estoque").delete().eq("id", str(peca_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Peça não encontrada")


@router.post("/{peca_id}/baixa")
def dar_baixa_manual(peca_id: UUID, baixa: EstoqueBaixa):
    supabase = get_supabase()
    dados = {"status": baixa.status, "data_saida": date.today().isoformat()}
    resp = supabase.table("estoque").update(dados).eq("id", str(peca_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    return resp.data[0]
