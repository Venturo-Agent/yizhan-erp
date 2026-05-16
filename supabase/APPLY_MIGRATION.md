# 如何應用 User Data Migration

由於 Supabase REST API 不支援直接執行 DDL 語句，需要手動在 Dashboard 執行。

## 方法：使用 Supabase Dashboard（最簡單）

1. **登入 Supabase Dashboard**
   - 前往：https://app.supabase.com
   - 選擇專案：`<YOUR_SUPABASE_PROJECT_REF>`

2. **打開 SQL Editor**
   - 左側選單點選 "SQL Editor"
   - 點擊 "New Query"

3. **貼上並執行 SQL**
   - 複製下方的完整 SQL
   - 貼到 SQL Editor
   - 點擊 "Run" 執行

4. **確認結果**
   - 執行後應該看到 "Success. No rows returned"
   - 前往 "Table Editor" 確認新表格已建立：
     - user_preferences
     - notes
     - manifestation_records

---

## 完整 SQL（直接複製貼上到 Supabase Dashboard）

\`\`\`sql
-- 建立使用者偏好設定表
CREATE TABLE IF NOT EXISTS user_preferences (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
preference_key TEXT NOT NULL,
preference_value JSONB NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(user_id, preference_key)
);

-- 建立便條紙表
CREATE TABLE IF NOT EXISTS notes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
tab_id TEXT NOT NULL,
tab_name TEXT NOT NULL DEFAULT '筆記',
content TEXT NOT NULL DEFAULT '',
tab_order INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(user_id, tab_id)
);

-- 建立顯化魔法記錄表
CREATE TABLE IF NOT EXISTS manifestation_records (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
record_date DATE NOT NULL,
content TEXT,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(user_id, record_date)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_records_user_id ON manifestation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_records_date ON manifestation_records(record_date);

-- 啟用 RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifestation_records ENABLE ROW LEVEL SECURITY;

-- RLS 政策：使用者只能存取自己的資料
CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can delete own preferences"
ON user_preferences FOR DELETE
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

-- Notes 政策
CREATE POLICY "Users can view own notes"
ON notes FOR SELECT
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can insert own notes"
ON notes FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can update own notes"
ON notes FOR UPDATE
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can delete own notes"
ON notes FOR DELETE
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

-- Manifestation 政策
CREATE POLICY "Users can view own manifestation records"
ON manifestation_records FOR SELECT
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can insert own manifestation records"
ON manifestation_records FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can update own manifestation records"
ON manifestation_records FOR UPDATE
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));

CREATE POLICY "Users can delete own manifestation records"
ON manifestation_records FOR DELETE
USING (user_id = auth.uid() OR user_id IN (SELECT id FROM employees WHERE id = auth.uid()));
\`\`\`

---

## 執行完成後

Migration 執行完成後，以下功能將自動啟用跨裝置同步：

✅ **小工具順序** - 首頁小工具的啟用狀態和順序
✅ **便條紙** - 所有分頁和內容
✅ **顯化魔法** - 練習記錄、連續天數、每週曲線

---

## 驗證 Migration

執行以下查詢確認表格已建立：

\`\`\`sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_preferences', 'notes', 'manifestation_records');
\`\`\`

應該看到三筆結果。

---

## 問題排查

**Q: 執行時出現 "relation employees does not exist"**
A: 確保之前的 migration 已執行，employees 表格已存在。

**Q: RLS 政策無法正常工作**
A: 確認用戶的 `auth.uid()` 與 `employees.id` 一致。

**Q: 資料沒有同步**
A:

1. 檢查瀏覽器 Console 是否有錯誤
2. 到 Table Editor 確認資料是否已儲存
3. 確認用戶已登入（useAuthStore 的 user.id 存在）
