-- Quem lançou a despesa pode alterá-la ou excluí-la, e trocar os comprovantes,
-- enquanto o recibo daquele mês não foi confirmado pela recebedora.

create or replace function mes_confirmado(p uuid, c text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from recibos where processo_id = p and competencia = c and confirmado_em is not null)
$$;
revoke execute on function mes_confirmado(uuid, text) from public, anon;
grant execute on function mes_confirmado(uuid, text) to authenticated;

create policy "quem lançou altera a despesa" on despesas for update
  using (papel_em(processo_id) in ('pagador', 'recebedora') and lancado_por = auth.uid()
         and not mes_confirmado(processo_id, competencia))
  with check (papel_em(processo_id) in ('pagador', 'recebedora') and lancado_por = auth.uid()
              and not mes_confirmado(processo_id, competencia));

create policy "quem lançou exclui a despesa" on despesas for delete
  using (papel_em(processo_id) in ('pagador', 'recebedora') and lancado_por = auth.uid()
         and not mes_confirmado(processo_id, competencia));

-- Comprovantes de despesa: quem lançou a despesa pode removê-los.
create policy "quem lançou remove comprovante da despesa" on comprovantes for delete
  using (despesa_id is not null and exists (
    select 1 from despesas d
    where d.id = comprovantes.despesa_id and d.lancado_por = auth.uid()
      and papel_em(d.processo_id) in ('pagador', 'recebedora')
      and not mes_confirmado(d.processo_id, d.competencia)));

create policy "partes removem arquivos" on storage.objects for delete
  using (bucket_id = 'comprovantes'
         and papel_em(((storage.foldername(name))[1])::uuid) in ('pagador', 'recebedora'));
