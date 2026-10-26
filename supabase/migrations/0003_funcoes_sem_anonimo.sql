-- As funções só servem para quem está logado.
revoke execute on function eh_membro(uuid), papel_em(uuid),
  criar_processo(text, text, text, text, text, papel, text, numeric, smallint, text),
  aceitar_convite(text, text), contestar_despesa(uuid, text), confirmar_recibo(uuid)
  from public, anon;
grant execute on function eh_membro(uuid), papel_em(uuid),
  criar_processo(text, text, text, text, text, papel, text, numeric, smallint, text),
  aceitar_convite(text, text), contestar_despesa(uuid, text), confirmar_recibo(uuid)
  to authenticated;
