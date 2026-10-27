-- Despesas pendentes: ficam registradas e aparecem na tela inicial, mas não
-- entram no cálculo nem nos recibos até uma das partes incluí-las num mês.

alter table despesas add column if not exists pendente boolean not null default false;

create or replace function incluir_pendente(p_despesa uuid, p_competencia text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare d despesas;
begin
  select * into d from despesas where id = p_despesa;
  if not found then raise exception 'Despesa não encontrada'; end if;
  if papel_em(d.processo_id) not in ('pagador', 'recebedora') then
    raise exception 'Sem permissão';
  end if;
  if not d.pendente then raise exception 'A despesa já está no cálculo'; end if;
  if p_competencia !~ '^\d{4}-\d{2}$' then raise exception 'Mês inválido'; end if;
  update despesas set pendente = false, competencia = p_competencia where id = p_despesa;
end $$;

revoke execute on function incluir_pendente(uuid, text) from public, anon;
grant execute on function incluir_pendente(uuid, text) to authenticated;
