from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/parcelas", tags=["parcelas"])


class ParcelaBaixa(BaseModel):
    valor_pago: float
    forma_pagamento: str | None = None
    data_pagamento: date | None = None
    observacoes: str | None = None


@router.get("")
def listar_parcelas(status: str | None = None, venda_id: UUID | None = None):
    supabase = get_supabase()
    query = (
        supabase.table("parcelas")
        .select("*, vendas(cliente_id, peca_id, clientes(nome), estoque(descricao))")
        .order("data_vencimento")
    )
    hoje = date.today().isoformat()

    # "Atrasada" não é um valor gravado na coluna: é derivado de
    # status = Pendente + vencimento no passado.
    if status == "Paga":
        query = query.eq("status", "Paga")
    elif status == "Atrasada":
        query = query.eq("status", "Pendente").lt("data_vencimento", hoje)
    elif status == "Pendente":
        query = query.eq("status", "Pendente").gte("data_vencimento", hoje)

    if venda_id:
        query = query.eq("venda_id", str(venda_id))

    return query.execute().data


@router.post("/{parcela_id}/baixa")
def dar_baixa_parcela(parcela_id: UUID, baixa: ParcelaBaixa):
    supabase = get_supabase()
    dados = {
        "status": "Paga",
        "valor_pago": baixa.valor_pago,
        "data_pagamento": (baixa.data_pagamento or date.today()).isoformat(),
        "forma_pagamento": baixa.forma_pagamento,
        "observacoes": baixa.observacoes,
    }
    resp = supabase.table("parcelas").update(dados).eq("id", str(parcela_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Parcela não encontrada")

    parcela = resp.data[0]
    venda_id = parcela["venda_id"]
    parcelas_da_venda = supabase.table("parcelas").select("status").eq("venda_id", venda_id).execute().data
    if all(p["status"] == "Paga" for p in parcelas_da_venda):
        supabase.table("vendas").update({"status_venda": "Quitada"}).eq("id", venda_id).execute()

    return parcela
