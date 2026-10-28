-- Data do recibo = data informada no registro do pagamento (não a data em que foi gerado).
alter table recibos add column if not exists data_pagamento date;

-- Recibos já existentes: usa a data do último pagamento do mesmo bloco.
update recibos r
set data_pagamento = (
  select max(p.data) from pagamentos p
  where p.processo_id = r.processo_id and p.competencia = r.competencia
    and (p.destino = r.tipo or p.destino is null)
)
where r.data_pagamento is null;
