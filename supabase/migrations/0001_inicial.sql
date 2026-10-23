-- Esquema inicial do app de controle de pensão alimentícia.
-- Valores monetários em centavos (integer). Competência no formato AAAA-MM.
-- Nenhuma tabela tem política de DELETE: o histórico vale como prova.

create extension if not exists pgcrypto;

-- Processos e participantes ---------------------------------------------------

create table processos (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  vara text not null,
  cidade text not null, -- local que sai no recibo, ex.: "Cidade/UF"
  alimentando_nome text not null,
  inicio_competencia text not null check (inicio_competencia ~ '^\d{4}-\d{2}$'),
  criado_em timestamptz not null default now()
);

create type papel as enum ('pagador', 'recebedora', 'advogado');

create table membros (
  processo_id uuid not null references processos on delete restrict,
  user_id uuid not null references auth.users on delete restrict,
  papel papel not null,
  nome text not null,
  cpf text,
  rg text,
  qualificacao text, -- ex.: "brasileira, divorciada, engenheira civil"
  endereco text,
  criado_em timestamptz not null default now(),
  primary key (processo_id, user_id)
);

create table convites (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos,
  email text not null,
  papel papel not null,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  criado_por uuid not null references auth.users default auth.uid(),
  criado_em timestamptz not null default now(),
  aceito_em timestamptz
);

create or replace function eh_membro(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where processo_id = p and user_id = auth.uid());
$$;

create or replace function papel_em(p uuid) returns papel
language sql stable security definer set search_path = public as $$
  select papel from membros where processo_id = p and user_id = auth.uid();
$$;

-- Regras de cálculo -------------------------------------------------------------

create table salarios_minimos (
  vigencia_inicio text primary key check (vigencia_inicio ~ '^\d{4}-\d{2}$'),
  valor_centavos integer not null check (valor_centavos > 0)
);

insert into salarios_minimos values
  ('2024-01', 141200),
  ('2025-01', 151800),
  ('2026-01', 162100);

create table regras (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos,
  vigencia_inicio text not null check (vigencia_inicio ~ '^\d{4}-\d{2}$'),
  percentual_pensao numeric(6,2) not null check (percentual_pensao > 0),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 28),
  fundamento text, -- ex.: "Decisão de 25/09/2024"
  criado_em timestamptz not null default now(),
  unique (processo_id, vigencia_inicio)
);

-- Lançamentos ---------------------------------------------------------------------

create table despesas (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos,
  competencia text not null check (competencia ~ '^\d{4}-\d{2}$'),
  descricao text not null,
  tipo text not null check (tipo in ('medica', 'escolar', 'natacao_academia', 'van', 'roupas', 'outra')),
  valor_centavos integer not null check (valor_centavos > 0),
  data date not null,
  paga_por papel not null check (paga_por in ('pagador', 'recebedora')),
  categoria text not null check (categoria in ('decisao', 'combinada')),
  divisao_tipo text not null check (divisao_tipo in ('metade', 'integral', 'fixo')),
  divisao_responsavel papel check (divisao_responsavel in ('pagador', 'recebedora')),
  divisao_valor_pagador integer check (divisao_valor_pagador >= 0),
  lancado_por uuid not null references auth.users default auth.uid(),
  lancado_em timestamptz not null default now(),
  contestada_em timestamptz,
  motivo_contestacao text,
  check (divisao_tipo <> 'integral' or divisao_responsavel is not null),
  check (divisao_tipo <> 'fixo' or divisao_valor_pagador is not null)
);
create index on despesas (processo_id, competencia);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos,
  competencia text not null check (competencia ~ '^\d{4}-\d{2}$'),
  valor_centavos integer not null check (valor_centavos > 0),
  data date not null,
  forma text not null check (forma in ('pix', 'transferencia', 'dinheiro')),
  registrado_por uuid not null references auth.users default auth.uid(),
  registrado_em timestamptz not null default now()
);
create index on pagamentos (processo_id, competencia);

create table recibos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos,
  competencia text not null check (competencia ~ '^\d{4}-\d{2}$'),
  -- judicial: pensão + despesas médicas e escolares; extra: despesas combinadas
  tipo text not null check (tipo in ('judicial', 'extra')),
  valor_centavos integer not null,
  itens jsonb not null, -- [{descricao, valor_centavos}]
  gerado_por uuid not null references auth.users default auth.uid(),
  gerado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  confirmado_por uuid references auth.users,
  codigo text unique,
  unique (processo_id, competencia, tipo)
);

create table comprovantes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references processos,
  despesa_id uuid references despesas,
  pagamento_id uuid references pagamentos,
  recibo_id uuid references recibos, -- PDF assinado no gov.br
  caminho text not null unique, -- caminho no bucket "comprovantes"
  nome_arquivo text not null,
  enviado_por uuid not null references auth.users default auth.uid(),
  enviado_em timestamptz not null default now(),
  check (num_nonnulls(despesa_id, pagamento_id, recibo_id) = 1)
);

-- Segurança por linha -------------------------------------------------------------

alter table processos enable row level security;
alter table membros enable row level security;
alter table convites enable row level security;
alter table salarios_minimos enable row level security;
alter table regras enable row level security;
alter table despesas enable row level security;
alter table pagamentos enable row level security;
alter table recibos enable row level security;
alter table comprovantes enable row level security;

create policy "membros veem o processo" on processos for select using (eh_membro(id));
create policy "membros veem membros" on membros for select using (eh_membro(processo_id));
create policy "membro edita os próprios dados" on membros for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- O papel e o processo de um membro não mudam pelo app.
revoke update on membros from authenticated, anon;
grant update (nome, cpf, rg, qualificacao, endereco) on membros to authenticated;
create policy "partes veem convites" on convites for select
  using (papel_em(processo_id) in ('pagador', 'recebedora'));
create policy "partes convidam" on convites for insert
  with check (papel_em(processo_id) in ('pagador', 'recebedora'));

create policy "todos leem salário mínimo" on salarios_minimos for select
  using (auth.role() = 'authenticated');

create policy "membros veem regras" on regras for select using (eh_membro(processo_id));

create policy "membros veem despesas" on despesas for select using (eh_membro(processo_id));
create policy "partes lançam despesas" on despesas for insert
  with check (papel_em(processo_id) in ('pagador', 'recebedora') and lancado_por = auth.uid());

create policy "membros veem pagamentos" on pagamentos for select using (eh_membro(processo_id));
create policy "pagador registra pagamentos" on pagamentos for insert
  with check (papel_em(processo_id) = 'pagador' and registrado_por = auth.uid());

create policy "membros veem recibos" on recibos for select using (eh_membro(processo_id));
create policy "pagador gera recibos" on recibos for insert
  with check (papel_em(processo_id) = 'pagador' and gerado_por = auth.uid()
              and confirmado_em is null and confirmado_por is null and codigo is null);
create policy "pagador atualiza recibo ainda não confirmado" on recibos for update
  using (papel_em(processo_id) = 'pagador' and confirmado_em is null)
  with check (papel_em(processo_id) = 'pagador' and confirmado_em is null
              and confirmado_por is null and codigo is null);

create policy "membros veem comprovantes" on comprovantes for select using (eh_membro(processo_id));
create policy "partes anexam comprovantes" on comprovantes for insert
  with check (papel_em(processo_id) in ('pagador', 'recebedora') and enviado_por = auth.uid());

-- Funções que mudam estado com regras próprias ------------------------------------

-- Cria o processo e coloca quem chamou como pagador ou recebedora.
create or replace function criar_processo(
  p_numero text, p_vara text, p_cidade text, p_alimentando text, p_inicio text,
  p_papel papel, p_nome text,
  p_percentual numeric, p_dia smallint, p_fundamento text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if p_papel = 'advogado' then
    raise exception 'O processo é criado por uma das partes';
  end if;
  insert into processos (numero, vara, cidade, alimentando_nome, inicio_competencia)
    values (p_numero, p_vara, p_cidade, p_alimentando, p_inicio) returning id into novo;
  insert into membros (processo_id, user_id, papel, nome)
    values (novo, auth.uid(), p_papel, p_nome);
  insert into regras (processo_id, vigencia_inicio, percentual_pensao, dia_vencimento, fundamento)
    values (novo, p_inicio, p_percentual, p_dia, p_fundamento);
  return novo;
end $$;

create or replace function aceitar_convite(p_token text, p_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c convites;
begin
  select * into c from convites where token = p_token and aceito_em is null for update;
  if not found then raise exception 'Convite inválido ou já usado'; end if;
  if lower(c.email) <> lower(auth.jwt() ->> 'email') then
    raise exception 'Este convite foi enviado para outro e-mail';
  end if;
  insert into membros (processo_id, user_id, papel, nome)
    values (c.processo_id, auth.uid(), c.papel, p_nome);
  update convites set aceito_em = now() where id = c.id;
  return c.processo_id;
end $$;

-- A outra parte contesta uma despesa (não apaga; fica registrado).
create or replace function contestar_despesa(p_despesa uuid, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare d despesas;
begin
  select * into d from despesas where id = p_despesa;
  if not found then raise exception 'Despesa não encontrada'; end if;
  if papel_em(d.processo_id) not in ('pagador', 'recebedora') then
    raise exception 'Sem permissão';
  end if;
  if d.lancado_por = auth.uid() then
    raise exception 'Quem lançou não contesta a própria despesa';
  end if;
  update despesas set contestada_em = now(), motivo_contestacao = p_motivo where id = p_despesa;
end $$;

-- Aceite eletrônico do recibo pela recebedora.
create or replace function confirmar_recibo(p_recibo uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r recibos; cod text;
begin
  select * into r from recibos where id = p_recibo for update;
  if not found then raise exception 'Recibo não encontrado'; end if;
  if papel_em(r.processo_id) is distinct from 'recebedora' then
    raise exception 'Só a recebedora confirma o recibo';
  end if;
  if r.confirmado_em is not null then return r.codigo; end if;
  cod := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4) || '-' ||
               substr(encode(gen_random_bytes(6), 'hex'), 1, 4));
  update recibos set confirmado_em = now(), confirmado_por = auth.uid(), codigo = cod
    where id = p_recibo;
  return cod;
end $$;

-- Armazenamento dos comprovantes ----------------------------------------------------
-- Arquivos ficam em comprovantes/<processo_id>/<arquivo>.

insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false)
  on conflict (id) do nothing;

create policy "membros leem comprovantes" on storage.objects for select
  using (bucket_id = 'comprovantes' and eh_membro(((storage.foldername(name))[1])::uuid));
create policy "partes enviam comprovantes" on storage.objects for insert
  with check (bucket_id = 'comprovantes'
              and papel_em(((storage.foldername(name))[1])::uuid) in ('pagador', 'recebedora'));
