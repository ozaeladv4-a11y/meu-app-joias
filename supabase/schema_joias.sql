-- =====================================================================
-- Gestão de Joias — Schema dedicado 'joias' dentro do Supabase Pro
-- =====================================================================

-- 1. Criação do Schema dedicado
create schema if not exists joias;

-- 2. Habilita a extensão pgcrypto
create extension if not exists pgcrypto;

-- 3. Tabela: Clientes
create table if not exists joias.clientes (
    id             uuid primary key default gen_random_uuid(),
    nome           text not null,
    cpf            text,
    telefone       text,
    endereco       text,
    data_cadastro  timestamp not null default now()
);

-- 4. Tabela: Estoque
create table if not exists joias.estoque (
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

-- 5. Tabela: Vendas
create table if not exists joias.vendas (
    id                uuid primary key default gen_random_uuid(),
    data_venda        timestamp not null default now(),
    cliente_id        uuid references joias.clientes(id) on delete restrict,
    peca_id           uuid references joias.estoque(id) on delete restrict,
    valor_venda       numeric not null,
    entrada           numeric,
    valor_financiado  numeric,
    qtd_parcelas      int,
    status_venda      text
);

create index if not exists idx_joias_vendas_cliente_id on joias.vendas(cliente_id);
create index if not exists idx_joias_vendas_peca_id on joias.vendas(peca_id);

-- 6. Tabela: Parcelas
create table if not exists joias.parcelas (
    id                uuid primary key default gen_random_uuid(),
    venda_id          uuid references joias.vendas(id) on delete cascade,
    numero_parcela    int not null,
    data_vencimento   date not null,
    valor_parcela     numeric not null,
    data_pagamento    date,
    valor_pago        numeric,
    status            text not null default 'Pendente',
    forma_pagamento   text,
    observacoes       text
);

create index if not exists idx_joias_parcelas_venda_id on joias.parcelas(venda_id);

-- 7. View: Relatório Gerencial
create or replace view joias.vw_relatorio_gerencial as
select
    date_trunc('month', v.data_venda)::date as periodo,
    sum(v.valor_venda)                      as faturamento,
    sum(e.preco_custo)                      as cmv,
    sum(v.valor_venda) - sum(e.preco_custo) as lucro_bruto
from joias.vendas v
join joias.estoque e on e.id = v.peca_id
group by date_trunc('month', v.data_venda)
order by periodo;

-- 8. View: Estoque Parado
create or replace view joias.vw_estoque_parado as
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
from joias.estoque
where status = 'Disponível'
group by
    case
        when (current_date - data_entrada) < 30 then '< 30 dias'
        when (current_date - data_entrada) between 30 and 59 then '30-60 dias'
        when (current_date - data_entrada) between 60 and 89 then '60-90 dias'
        else '> 90 dias'
    end
order by min(current_date - data_entrada);

-- 9. Permissões de acesso ao schema joias para as roles da API do Supabase
grant usage on schema joias to anon, authenticated, service_role;
grant all on all tables in schema joias to anon, authenticated, service_role;
grant all on all routines in schema joias to anon, authenticated, service_role;
grant all on all sequences in schema joias to anon, authenticated, service_role;

alter default privileges in schema joias grant all on tables to anon, authenticated, service_role;
alter default privileges in schema joias grant all on routines to anon, authenticated, service_role;
alter default privileges in schema joias grant all on sequences to anon, authenticated, service_role;
