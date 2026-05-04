-- =============================================================================
-- Piattaforma Turistica — Shop entity, parte 1: enum value.
--
-- DEVE essere eseguita in una transazione separata dalla parte 2 perché
-- `alter type ... add value` non può essere usato nella stessa transazione
-- in cui viene aggiunto. La parte 2 (tabelle + RLS) è in
-- 20260425000007_shop_entity_tables.sql.
--
-- Con `supabase db push` / migrazioni file-per-file questo è automatico.
-- Nel SQL Editor: esegui questo file, poi esegui il file 0007.
-- =============================================================================

alter type public.app_role add value if not exists 'gestore_shop';
