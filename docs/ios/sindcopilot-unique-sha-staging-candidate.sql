-- PROPOSTA PARA HOMOLOGACAO ISOLADA DO SINDCOPILOT. NAO EXECUTAR EM PRODUCAO.
-- Este script NAO foi aplicado. Antes de usá-lo, identificar projeto/branch exclusivo
-- do SindCopilot, validar migrations 0001-0009 e obter revisao de engenharia.
--
-- Proposito: impedir corrida de importacoes idênticas pelo mesmo proprietário
-- e condomínio. Postgres executa a verificação de unicidade atomicamente.
-- O endpoint deve tratar SQLSTATE 23505 como HTTP 409.
--
-- Preflight: se já existirem duplicatas, INTERROMPER. Não apagar dados automaticamente.
DO $$
BEGIN
  IF to_regclass('public.financial_statements') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.financial_statements ausente: ambiente de staging incorreto';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.financial_statements
    WHERE sha256 IS NOT NULL
    GROUP BY user_id, condominium_id, sha256
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Há hashes duplicados neste ambiente: auditar antes de criar o índice';
  END IF;
END $$;

-- Mesmos bytes, mesmo dono e mesmo condomínio: apenas uma importação.
-- SHA-256 nulo continua permitido para extratos manuais/históricos.
CREATE UNIQUE INDEX IF NOT EXISTS financial_statements_owner_condo_sha256_uniq
ON public.financial_statements(user_id, condominium_id, sha256)
WHERE sha256 IS NOT NULL;

-- A confirmação de índice somente em staging deve ser verificada no catalogo.
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'financial_statements_owner_condo_sha256_uniq';

-- Observação: índice de unicidade previne duplicação em concorrência, mas
-- NÃO fornece atomicidade para Storage + inserts de várias tabelas.
-- O cleanup compensatório do backend ainda pode falhar; a solução final para
-- persistência exige uma transação Postgres/RPC e rotina de reconciliação de Storage.
