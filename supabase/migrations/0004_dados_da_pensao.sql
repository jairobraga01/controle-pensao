-- Aba "Dados da Pensão": editar ou excluir o processo e cadastrar os tipos de despesa.

-- Tipos de despesa de cada processo. Excluir um tipo só o desativa: as despesas já
-- lançadas guardam a própria divisão e o próprio recibo, e continuam como estão.
create table tipos_despesa (
  processo_id uuid not null references processos on delete cascade,
  codigo text not null check (codigo ~ '^[a-z0-9_]{1,40}$'),
  rotulo text not null check (length(trim(rotulo)) > 0),
  detalhe text not null default '',
  categoria text not null check (categoria in ('decisao', 'combinada')),
  -- null: a divisão é escolhida em cada lançamento
  divisao_tipo text check (divisao_tipo in ('metade', 'integral', 'fixo')),
  divisao_responsavel papel check (divisao_responsavel in ('pagador', 'recebedora')),
  divisao_valor_pagador integer check (divisao_valor_pagador >= 0),
  ativo boolean not null default true,
  ordem integer not null default 100,
  primary key (processo_id, codigo),
  check (divisao_tipo is distinct from 'integral' or divisao_responsavel is not null),
  check (divisao_tipo is distinct from 'fixo' or divisao_valor_pagador is not null)
);

alter table tipos_despesa enable row level security;
create policy "membros veem tipos" on tipos_despesa for select using (eh_membro(processo_id));
create policy "partes criam tipos" on tipos_despesa for insert
  with check (papel_em(processo_id) in ('pagador', 'recebedora'));
create policy "partes alteram tipos" on tipos_despesa for update
  using (papel_em(processo_id) in ('pagador', 'recebedora'))
  with check (papel_em(processo_id) in ('pagador', 'recebedora'));

-- O tipo da despesa passa a ser um código do cadastro acima.
alter table despesas drop constraint if exists despesas_tipo_check;

create or replace function semear_tipos(p uuid) returns void
language sql security definer set search_path = public, extensions as $$
  insert into tipos_despesa (processo_id, codigo, rotulo, detalhe, categoria,
                             divisao_tipo, divisao_responsavel, divisao_valor_pagador, ordem)
  values
    (p, 'medica', 'Despesas médicas', 'Plano de saúde, medicamentos e gastos hospitalares', 'decisao', 'metade', null, null, 10),
    (p, 'escolar', 'Despesas escolares', 'Mensalidade, material, uniforme e passeios escolares', 'decisao', 'metade', null, null, 20),
    (p, 'natacao_academia', 'Natação/Academia', '50% cada', 'combinada', 'metade', null, null, 30),
    (p, 'van', 'Van escolar', 'R$ 200,00 para o pai', 'decisao', 'fixo', null, 20000, 40),
    (p, 'roupas', 'Roupas', '100% pai', 'combinada', 'integral', 'pagador', null, 50),
    (p, 'outra', 'Outra despesa combinada', 'Você escolhe a divisão', 'combinada', null, null, null, 90)
  on conflict do nothing;
$$;
revoke execute on function semear_tipos(uuid) from public, anon, authenticated;

select semear_tipos(id) from processos;

-- Novo processo já nasce com os tipos padrão.
create or replace function criar_processo(
  p_numero text, p_vara text, p_cidade text, p_alimentando text, p_inicio text,
  p_papel papel, p_nome text,
  p_percentual numeric, p_dia smallint, p_fundamento text
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
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
  perform semear_tipos(novo);
  return novo;
end $$;

-- Altera os dados do processo e a regra da pensão (a primeira, que vale desde o início).
create or replace function atualizar_processo(
  p uuid, p_numero text, p_vara text, p_cidade text, p_alimentando text, p_inicio text,
  p_percentual numeric, p_dia smallint, p_fundamento text
) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare antigo text;
begin
  if papel_em(p) is null or papel_em(p) not in ('pagador', 'recebedora') then
    raise exception 'Só as partes alteram os dados da pensão';
  end if;
  select inicio_competencia into antigo from processos where id = p for update;
  update processos set numero = p_numero, vara = p_vara, cidade = p_cidade,
    alimentando_nome = p_alimentando, inicio_competencia = p_inicio
    where id = p;
  update regras set vigencia_inicio = p_inicio, percentual_pensao = p_percentual,
    dia_vencimento = p_dia, fundamento = p_fundamento
    where processo_id = p and vigencia_inicio = antigo;
end $$;

-- Exclui o processo só enquanto não houver lançamentos: depois disso o histórico vale como prova.
create or replace function excluir_processo(p uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if papel_em(p) is null or papel_em(p) not in ('pagador', 'recebedora') then
    raise exception 'Só as partes excluem a pensão';
  end if;
  if exists (select 1 from despesas where processo_id = p)
     or exists (select 1 from pagamentos where processo_id = p)
     or exists (select 1 from recibos where processo_id = p) then
    raise exception 'A pensão já tem lançamentos e não pode ser excluída';
  end if;
  delete from tipos_despesa where processo_id = p;
  delete from convites where processo_id = p;
  delete from regras where processo_id = p;
  delete from membros where processo_id = p;
  delete from processos where id = p;
end $$;

revoke execute on function
  criar_processo(text, text, text, text, text, papel, text, numeric, smallint, text),
  atualizar_processo(uuid, text, text, text, text, text, numeric, smallint, text),
  excluir_processo(uuid)
  from public, anon;
grant execute on function
  criar_processo(text, text, text, text, text, papel, text, numeric, smallint, text),
  atualizar_processo(uuid, text, text, text, text, text, numeric, smallint, text),
  excluir_processo(uuid)
  to authenticated;
