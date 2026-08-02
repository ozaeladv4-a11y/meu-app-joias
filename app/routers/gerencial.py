from datetime import date, datetime, time

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/gerencial", tags=["gerencial"])


class ResumoFiltro(BaseModel):
    data_inicio: date
    data_fim: date


@router.post("/resumo")
def resumo_gerencial(filtro: ResumoFiltro):
    supabase = get_supabase()
    inicio = datetime.combine(filtro.data_inicio, time.min).isoformat()
    fim = datetime.combine(filtro.data_fim, time.max).isoformat()

    resp = (
        supabase.table("vendas")
        .select("data_venda, valor_venda, estoque(preco_custo)")
        .gte("data_venda", inicio)
        .lte("data_venda", fim)
        .execute()
    )

    faturamento_total = 0.0
    cmv = 0.0
    por_dia: dict[str, dict] = {}
    for venda in resp.data:
        valor_venda = venda["valor_venda"] or 0
        preco_custo = (venda.get("estoque") or {}).get("preco_custo") or 0
        faturamento_total += valor_venda
        cmv += preco_custo

        dia = venda["data_venda"][:10]
        item = por_dia.setdefault(dia, {"data": dia, "faturamento": 0.0, "lucro": 0.0})
        item["faturamento"] += valor_venda
        item["lucro"] += valor_venda - preco_custo

    lucro_bruto_real = faturamento_total - cmv
    margem_media_pct = (lucro_bruto_real / faturamento_total * 100) if faturamento_total else 0

    serie_diaria = sorted(por_dia.values(), key=lambda i: i["data"])
    for item in serie_diaria:
        item["faturamento"] = round(item["faturamento"], 2)
        item["lucro"] = round(item["lucro"], 2)

    return {
        "periodo": {"data_inicio": filtro.data_inicio, "data_fim": filtro.data_fim},
        "faturamento_total": round(faturamento_total, 2),
        "cmv": round(cmv, 2),
        "lucro_bruto_real": round(lucro_bruto_real, 2),
        "margem_media_pct": round(margem_media_pct, 2),
        "serie_diaria": serie_diaria,
    }


@router.get("/estoque-parado")
def estoque_parado():
    supabase = get_supabase()
    resp = supabase.table("estoque").select("*").eq("status", "Disponível").execute()
    hoje = date.today()

    pecas = []
    valor_total_imobilizado = 0.0
    for peca in resp.data:
        dias_parado = (hoje - date.fromisoformat(peca["data_entrada"])).days
        if dias_parado < 30:
            continue
        if dias_parado < 60:
            faixa = "30-60 dias"
        elif dias_parado < 90:
            faixa = "60-90 dias"
        else:
            faixa = "> 90 dias"

        preco_custo = peca.get("preco_custo") or 0
        valor_total_imobilizado += preco_custo
        pecas.append({**peca, "dias_parado": dias_parado, "faixa_tempo_parado": faixa})

    pecas.sort(key=lambda p: p["dias_parado"], reverse=True)
    return {"pecas": pecas, "valor_total_imobilizado": round(valor_total_imobilizado, 2)}


@router.get("/vendas-categoria")
def vendas_por_categoria(data_inicio: date | None = None, data_fim: date | None = None):
    supabase = get_supabase()
    query = supabase.table("vendas").select("valor_venda, estoque(categoria)")
    if data_inicio:
        query = query.gte("data_venda", datetime.combine(data_inicio, time.min).isoformat())
    if data_fim:
        query = query.lte("data_venda", datetime.combine(data_fim, time.max).isoformat())
    resp = query.execute()

    resumo: dict[str, dict] = {}
    for venda in resp.data:
        categoria = (venda.get("estoque") or {}).get("categoria") or "Sem categoria"
        item = resumo.setdefault(categoria, {"categoria": categoria, "quantidade": 0, "faturamento": 0.0})
        item["quantidade"] += 1
        item["faturamento"] += venda["valor_venda"] or 0

    resultado = sorted(resumo.values(), key=lambda i: i["faturamento"], reverse=True)
    for item in resultado:
        item["faturamento"] = round(item["faturamento"], 2)
    return resultado


@router.get("/inadimplencia")
def inadimplencia():
    supabase = get_supabase()
    resp = (
        supabase.table("parcelas")
        .select("status, data_vencimento, valor_parcela")
        .neq("status", "Paga")
        .execute()
    )
    hoje = date.today().isoformat()

    valor_pendente = 0.0
    valor_atrasado = 0.0
    qtd_pendente = 0
    qtd_atrasada = 0
    for parcela in resp.data:
        valor = parcela["valor_parcela"] or 0
        if parcela["data_vencimento"] < hoje:
            valor_atrasado += valor
            qtd_atrasada += 1
        else:
            valor_pendente += valor
            qtd_pendente += 1

    total_em_aberto = valor_pendente + valor_atrasado
    indice_atraso_pct = (valor_atrasado / total_em_aberto * 100) if total_em_aberto else 0

    return {
        "qtd_parcelas_pendentes": qtd_pendente,
        "qtd_parcelas_atrasadas": qtd_atrasada,
        "valor_total_pendente": round(valor_pendente, 2),
        "valor_total_atrasado": round(valor_atrasado, 2),
        "indice_atraso_pct": round(indice_atraso_pct, 2),
    }
