-- SindCopilot iOS staging readiness: READ-ONLY metadata audit.
-- Run ONLY on a newly verified isolated SindCopilot staging database.
-- Never run against av-os-data-hub, MindSteps, F-Insight or an unidentified project.
-- No table records, credentials, tenant IDs or customer financial values are retrieved.
BEGIN READ ONLY;

SELECT current_database() AS database_name, current_user AS connected_role;

WITH expected(name) AS (
  VALUES ('users'), ('condominiums'), ('financial_statements'), ('financial_transactions'),
         ('financial_category_rules'), ('financial_closings')
)
SELECT name AS table_name, to_regclass('public.' || name) IS NOT NULL AS exists_in_public
FROM expected ORDER BY name;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_can_select,
       has_table_privilege('anon', c.oid, 'INSERT') AS anon_can_insert,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS authenticated_can_insert
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname IN ('financial_statements','financial_transactions','financial_category_rules','financial_closings')
AND c.relkind IN ('r','p')
ORDER BY c.relname;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('financial_statements','financial_transactions','financial_closings')
ORDER BY tablename, indexname;

SELECT con.conname AS constraint_name, rel.relname AS table_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace
WHERE n.nspname = 'public'
AND rel.relname IN ('financial_statements','financial_transactions','financial_closings')
ORDER BY rel.relname, con.conname;

SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'finance-statements';

COMMIT;
