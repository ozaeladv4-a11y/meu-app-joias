-- =====================================================================
-- Gestão de Joias — Script de criação das tabelas e views
-- Executar no SQL Editor do Supabase
-- =====================================================================

-- Extensão necessária para gen_random_uuid()
create extension if not exists pgcrypto;

-- =====================================================================
-- 1. CLIENTES
-- =====================================================================
create table if not exists clientes (
    id             uuid primary key default gen_random_uuid(),
    nome           text not null,
    cpf            text,
    telefone       text,
    endereco       text,
    data_cadastro  timestamp not null default now()
);

-- =====================================================================
-- 2. ESTOQUE
-- =====================================================================
create table if not exists estoque (
    id            uuid primary key default gen_random_uuid(),
    descricao     text not null,
    categoria     text,
    peso_g        numeric,
    preco_custo   numeric,
    preco_venda   numeric,
    margem_r      numeric,
    margem_pct    numeric,
    status        text not null default 'Disponível',
    data_entrada  date not null default current_date,
    data_saida    date
);

-- =====================================================================
-- 3. VENDAS
-- =====================================================================
create table if not exists vendas (
    id                uuid primary key default gen_random_uuid(),
    data_venda        timestamp not null default now(),
    cliente_id        uuid references clientes(id) on delete restrict,
    peca_id           uuid references estoque(id) on delete restrict,
    valor_venda       numeric not null,
    entrada           numeric,
    valor_financiado  numeric,
    qtd_parcelas      int,
    status_venda      text
);

create index if not exists idx_vendas_cliente_id on vendas(cliente_id);
create index if not exists idx_vendas_peca_id on vendas(peca_id);

-- =====================================================================
-- 4. PARCELAS
-- =====================================================================
create table if not exists parcelas (
    id                uuid primary key default gen_random_uuid(),
    venda_id          uuid references vendas(id) on delete cascade,
    numero_parcela    int not null,
    data_vencimento   date not null,
    valor_parcela     numeric not null,
    data_pagamento    date,
    valor_pago        numeric,
    status            text not null default 'Pendente',
    forma_pagamento   text,
    observacoes       text
);

create index if not exists idx_parcelas_venda_id on parcelas(venda_id);

-- =====================================================================
-- VIEW: vw_relatorio_gerencial
-- Faturamento, CMV e Lucro Bruto agrupados por mês (período)
-- =====================================================================
create or replace view vw_relatorio_gerencial as
select
    date_trunc('month', v.data_venda)::date as periodo,
    sum(v.valor_venda)                      as faturamento,
    sum(e.preco_custo)                      as cmv,
    sum(v.valor_venda) - sum(e.preco_custo) as lucro_bruto
from vendas v
join estoque e on e.id = v.peca_id
group by date_trunc('month', v.data_venda)
order by periodo;

-- =====================================================================
-- VIEW: vw_estoque_parado
-- Peças com status 'Disponível' agrupadas por faixa de tempo parada
-- =====================================================================
create or replace view vw_estoque_parado as
select
    case
        when (current_date - data_entrada) < 30 then '< 30 dias'
        when (current_date - data_entrada) between 30 and 59 then '30-60 dias'
        when (current_date - data_entrada) between 60 and 89 then '60-90 dias'
        else '> 90 dias'
    end as faixa_tempo_parado,
    count(*)                as qtd_pecas,
    sum(preco_custo)        as valor_custo_total,
    sum(preco_venda)        as valor_venda_total
from estoque
where status = 'Disponível'
group by
    case
        when (current_date - data_entrada) < 30 then '< 30 dias'
        when (current_date - data_entrada) between 30 and 59 then '30-60 dias'
        when (current_date - data_entrada) between 60 and 89 then '60-90 dias'
        else '> 90 dias'
    end
order by min(current_date - data_entrada);
