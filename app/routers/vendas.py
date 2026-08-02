from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/vendas", tags=["vendas"])


class VendaCreate(BaseModel):
    cliente_id: UUID
    peca_id: UUID
    valor_venda: float
    entrada: float = 0
    qtd_parcelas: int = 0
    data_primeira_parcela: date | None = None
    intervalo_dias: int = 30


def _gerar_parcelas(
    venda_id: str,
    valor_financiado: float,
    qtd_parcelas: int,
    data_primeira: date,
    intervalo_dias: int,
) -> list[dict]:
    valor_centavos = round(valor_financiado * 100)
    base = valor_centavos // qtd_parcelas
    resto = valor_centavos - base * qtd_parcelas

    parcelas = []
    for numero in range(1, qtd_parcelas + 1):
        valor_parcela_centavos = base + (resto if numero == qtd_parcelas else 0)
        vencimento = data_primeira + timedelta(days=intervalo_dias * (numero - 1))
        parcelas.append(
            {
                "venda_id": venda_id,
                "numero_parcela": numero,
                "data_vencimento": vencimento.isoformat(),
                "valor_parcela": valor_parcela_centavos / 100,
                "status": "Pendente",
            }
        )
    return parcelas


@router.get("")
def listar_vendas(cliente_id: UUID | None = None, status_venda: str | None = None):
    supabase = get_supabase()
    query = (
        supabase.table("vendas")
        .select("*, clientes(nome), estoque(descricao, categoria)")
        .order("data_venda", desc=True)
    )
    if cliente_id:
        query = query.eq("cliente_id", str(cliente_id))
    if status_venda:
        query = query.eq("status_venda", status_venda)
    return query.execute().data


@router.get("/{venda_id}")
def obter_venda(venda_id: UUID):
    supabase = get_supabase()
    resp = (
        supabase.table("vendas")
        .select("*, clientes(nome), estoque(descricao, categoria)")
        .eq("id", str(venda_id))
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    venda = resp.data[0]
    parcelas = (
        supabase.table("parcelas")
        .select("*")
        .eq("venda_id", str(venda_id))
        .order("numero_parcela")
        .execute()
        .data
    )
    venda["parcelas"] = parcelas
    return venda


@router.post("", status_code=201)
def registrar_venda(venda: VendaCreate):
    supabase = get_supabase()

    peca_resp = supabase.table("estoque").select("*").eq("id", str(venda.peca_id)).execute()
    if not peca_resp.data:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    if peca_resp.data[0]["status"] != "Disponível":
        raise HTTPException(status_code=409, detail="Peça não está disponível para venda")

    cliente_resp = supabase.table("clientes").select("id").eq("id", str(venda.cliente_id)).execute()
    if not cliente_resp.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    valor_financiado = round(venda.valor_venda - venda.entrada, 2)
    if valor_financiado < 0:
        raise HTTPException(status_code=400, detail="Entrada não pode ser maior que o valor da venda")

    tem_parcelamento = valor_financiado > 0 and venda.qtd_parcelas > 0
    status_venda = "Em Andamento" if tem_parcelamento else "Quitada"

    venda_insert = {
        "cliente_id": str(venda.cliente_id),
        "peca_id": str(venda.peca_id),
        "data_venda": datetime.utcnow().isoformat(),
        "valor_venda": venda.valor_venda,
        "entrada": venda.entrada,
        "valor_financiado": valor_financiado if tem_parcelamento else 0,
        "qtd_parcelas": venda.qtd_parcelas if tem_parcelamento else 0,
        "status_venda": status_venda,
    }
    venda_criada = supabase.table("vendas").insert(venda_insert).execute().data[0]
    venda_id = venda_criada["id"]

    parcelas_criadas: list[dict] = []
    try:
        if tem_parcelamento:
            parcelas_criadas = _gerar_parcelas(
                venda_id,
                valor_financiado,
                venda.qtd_parcelas,
                venda.data_primeira_parcela or date.today(),
                venda.intervalo_dias,
            )
            parcelas_criadas = supabase.table("parcelas").insert(parcelas_criadas).execute().data

        estoque_resp = (
            supabase.table("estoque")
            .update({"status": "Vendido", "data_saida": date.today().isoformat()})
            .eq("id", str(venda.peca_id))
            .execute()
        )
        if not estoque_resp.data:
            raise RuntimeError("Falha ao atualizar status da peça")
    except Exception:
        # A API REST do Supabase não oferece transação entre tabelas por aqui,
        # então desfazemos manualmente o que já foi gravado para não deixar
        # venda/parcela órfã em caso de falha parcial.
        supabase.table("parcelas").delete().eq("venda_id", venda_id).execute()
        supabase.table("vendas").delete().eq("id", venda_id).execute()
        raise HTTPException(status_code=500, detail="Falha ao registrar venda, operação revertida")

    return {**venda_criada, "parcelas": parcelas_criadas}
