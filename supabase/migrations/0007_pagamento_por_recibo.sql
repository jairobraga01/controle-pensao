-- Cada pagamento vai para um recibo: judicial (pensão + despesas da decisão)
-- ou extra (despesas combinadas). Vazio = pagamento antigo/importado, que
-- cobre primeiro o judicial e o resto o extra.
alter table pagamentos add column if not exists destino text check (destino in ('judicial', 'extra'));
