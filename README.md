# Controle de Pensão

App para lançar despesas, registrar pagamentos e gerar recibos de pensão alimentícia,
usado pelas duas partes e, se quiserem, pelo advogado. Funciona no navegador e pode ser
instalado no celular ("Adicionar à tela inicial").

## O que ele faz

- **Painel do mês:** pensão (percentual do salário mínimo vigente), saldo das despesas da
  decisão, despesas combinadas, quanto já foi pago e o que falta, com status
  aberto / em atraso / quitado.
- **Lançar despesa** com comprovante obrigatório (foto ou PDF). O tipo escolhido define
  a divisão e o recibo. Todo processo começa com os tipos abaixo, que podem ser alterados,
  excluídos ou complementados na aba **Pensão**:

  | Tipo | Divisão | Recibo |
  | --- | --- | --- |
  | Despesas médicas | 50% cada | Judicial |
  | Despesas escolares (mensalidade, material, uniforme, passeios escolares) | 50% cada | Judicial |
  | Natação/Academia | 50% cada | Extra |
  | Van escolar | R$ 200,00 para o pai | Judicial |
  | Roupas | 100% pai | Extra |
  | Outra despesa combinada | escolhida no lançamento | Extra |

- **Dados da Pensão:** editar processo, vara, local do recibo, percentual, vencimento e
  primeiro mês; cadastrar os tipos de despesa; excluir a pensão enquanto nada foi lançado.
- **Contestar despesa:** a outra parte contesta com motivo; a despesa sai do cálculo e
  nada é apagado.
- **Registrar pagamento** com comprovante; gera o recibo judicial (pensão + despesas
  médicas, escolares e van) e, se houver despesas combinadas, o recibo extra do mês.
- **Recibos:** aceite eletrônico da mãe no app (data, hora e código de verificação), PDF
  para assinar no gov.br e anexo do PDF assinado, para cada um dos dois recibos.
- **Extrato** desde o início do processo, com saldo devedor vencido.
- **Convites** para a outra parte e para o advogado (só leitura), com envio do link por
  WhatsApp ou e-mail.
- **Importar planilha:** lançamentos antigos em CSV (modelo em **Extrato > Importar
  planilha**). Se alguma linha tiver erro, nada é importado. Lançamentos importados ficam
  marcados como "importado", sem comprovante.
- **Relatório para a justiça:** PDF por período com o resumo mensal (pensão, recibo
  judicial, recibo extra, pago, saldo e situação dos recibos), as despesas do recibo
  judicial e os pagamentos.

Nenhum lançamento pode ser apagado pelo app: o histórico vale como prova.

## Regras de cálculo

Ficam em [`lib/calculo.ts`](lib/calculo.ts), com testes em
[`lib/calculo.test.ts`](lib/calculo.test.ts). Valores em centavos.

- Pensão = percentual × salário mínimo vigente na competência
  ([`lib/tabelas.ts`](lib/tabelas.ts) e tabela `salarios_minimos`).
- Despesa paga pela mãe soma a parte do pai; despesa paga pelo pai abate a parte da mãe.
- Meio centavo arredonda para cima, como na planilha usada antes do app.
- O vencimento é o dia configurado (padrão 10) do próprio mês de competência.

## Como colocar no ar

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No Supabase, abra **SQL Editor**, cole o conteúdo de
   [`supabase/migrations/0001_inicial.sql`](supabase/migrations/0001_inicial.sql) e execute;
   depois faça o mesmo com os demais arquivos da pasta, em ordem.
3. Em **Authentication > URL Configuration**, coloque o endereço do app em *Site URL* e
   adicione `https://SEU-ENDERECO/auth/callback` em *Redirect URLs*. O login é por e-mail e
   senha; se quiser que a conta entre direto, sem e-mail de confirmação, desligue
   *Confirm email* em **Authentication > Sign In / Providers > Email**.
4. Publique o repositório na [Vercel](https://vercel.com) (plano gratuito) com as variáveis
   de [`.env.example`](.env.example), usando os valores de **Project Settings > API** do
   Supabase.
5. Abra o app, crie sua conta com e-mail e senha, cadastre o processo e convide a outra parte em
   **Extrato > Convidar**.

## Desenvolvimento

```bash
cp .env.example .env.local   # preencha com os dados do Supabase
npm install
npm run dev                  # http://localhost:3000
npm test                     # regras de cálculo
npm run typecheck
```

## Privacidade

Dados pessoais (CPF, endereço, comprovantes) ficam só no banco do Supabase, protegidos por
regras de acesso por processo. Não coloque documentos ou dados reais neste repositório.
