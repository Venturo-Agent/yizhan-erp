-- ============================================================================
-- 修復：traveler_conversations 表已於 4/22 那波拔功能時刪除（同 folders pattern）、
-- 但 tours 的 trigger trigger_create_tour_conversations 仍在嘗試寫入該表
-- 導致開團時報錯：relation "public.traveler_conversations" does not exist (42P01)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_tour_conversations ON public.tours;
DROP FUNCTION IF EXISTS public.create_tour_conversations();
