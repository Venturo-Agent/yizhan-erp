-- Drop SyncFields residue (FastIn offline-sync legacy)
--
-- Background: The FastIn offline-sync architecture left three columns on 11
-- tables: `_needs_sync`, `_synced_at`, `_deleted`. After G1 audit
-- (docs/_session/_sync_fields_audit.md):
--   - `_needs_sync` / `_synced_at` are pure dead columns (zero runtime usage
--     across the entire src tree). Safe to drop everywhere.
--   - `_deleted` is only used as real soft-delete on `messages` (chat). For
--     `tours` / `itineraries` / 8 other tables, `_deleted=true` row count is 0
--     and src filters are dead. Safe to drop except on `messages`.
--
-- This migration drops:
--   - `_needs_sync` + `_synced_at` from all 11 tables
--   - `_deleted` from 10 tables (everything except `messages`)
--
-- Indexes on these columns are dropped automatically by PostgreSQL.

BEGIN;

-- ============================================================================
-- 1. Tables where ALL THREE columns drop (10 tables)
-- ============================================================================

ALTER TABLE public.advance_items
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.advance_lists
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.bulletins
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.channel_groups
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.channels
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.itineraries
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.shared_order_lists
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.suppliers
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.tours
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at,
  DROP COLUMN IF EXISTS _deleted;

-- ============================================================================
-- 2. messages: drop sync flags ONLY, keep `_deleted` (real chat soft-delete)
-- ============================================================================

ALTER TABLE public.messages
  DROP COLUMN IF EXISTS _needs_sync,
  DROP COLUMN IF EXISTS _synced_at;

COMMIT;
