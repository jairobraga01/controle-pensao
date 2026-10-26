-- Lançamentos trazidos das planilhas antigas, sem comprovante anexado no app.
alter table despesas add column importado boolean not null default false;
alter table pagamentos add column importado boolean not null default false;
