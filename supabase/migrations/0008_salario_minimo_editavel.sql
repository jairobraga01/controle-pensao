-- Tabela do salário mínimo editável no app: quem é parte de uma pensão pode
-- incluir valores futuros e corrigir os passados.

create or replace function eh_parte() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from membros where user_id = auth.uid() and papel in ('pagador', 'recebedora'))
$$;
revoke execute on function eh_parte() from public, anon;
grant execute on function eh_parte() to authenticated;

create policy "partes incluem salário mínimo" on salarios_minimos for insert with check (eh_parte());
create policy "partes alteram salário mínimo" on salarios_minimos for update using (eh_parte()) with check (eh_parte());
create policy "partes excluem salário mínimo" on salarios_minimos for delete using (eh_parte());
