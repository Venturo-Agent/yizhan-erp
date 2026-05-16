-- 修復 itineraries.created_by / updated_by 重複 FK 衝突
-- 原本同時有兩條 FK 指向 employees(id) 與 auth.users(id)，
-- INSERT 時 currentUser.id（來自 auth）符合 auth.users 但常不等於 employees.id
-- （舊制 supabase_user_id 映射），導致 409 FK violation。
-- 統一只保留 auth.users 那條，與 createdEntityHook 自動帶入的 user.id 相容。

ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS fk_itineraries_created_by;
ALTER TABLE public.itineraries DROP CONSTRAINT IF EXISTS fk_itineraries_updated_by;
