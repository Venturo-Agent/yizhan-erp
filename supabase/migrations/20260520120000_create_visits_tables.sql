-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 拜訪記錄主檔 (visits)
-- =============================================
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    employee_id UUID NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    purpose TEXT CHECK (purpose IN ('development', 'after_sales', 'complaint', 'other')),
    check_in_location JSONB,
    check_out_location JSONB,
    check_in_at TIMESTAMPTZ DEFAULT NOW(),
    check_out_at TIMESTAMPTZ,
    summary TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_transcription', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================
-- 錄音檔案記錄 (visit_recordings)
-- =============================================
CREATE TABLE IF NOT EXISTS visit_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'uploaded', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 逐字稿與摘要 (visit_transcripts)
-- =============================================
CREATE TABLE IF NOT EXISTS visit_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_recording_id UUID NOT NULL REFERENCES visit_recordings(id) ON DELETE CASCADE,
    transcript_text TEXT,
    summary_text TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 拜訪待辦事項 (visit_actions)
-- =============================================
CREATE TABLE IF NOT EXISTS visit_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    due_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS (Row Level Security) Policies
-- =============================================

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_actions ENABLE ROW LEVEL SECURITY;

-- visits: 業務員只能讀寫自己的記錄
CREATE POLICY "visits_select_own" ON visits
    FOR SELECT USING (
        employee_id = auth.uid() AND deleted_at IS NULL
    );

CREATE POLICY "visits_insert_own" ON visits
    FOR INSERT WITH CHECK (
        employee_id = auth.uid()
    );

CREATE POLICY "visits_update_own" ON visits
    FOR UPDATE USING (
        employee_id = auth.uid()
    );

-- visit_recordings: 只能讀寫自己拜訪的錄音
CREATE POLICY "visit_recordings_select" ON visit_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = visit_recordings.visit_id
            AND v.employee_id = auth.uid()
        )
    );

CREATE POLICY "visit_recordings_insert" ON visit_recordings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = visit_recordings.visit_id
            AND v.employee_id = auth.uid()
        )
    );

CREATE POLICY "visit_recordings_update" ON visit_recordings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = visit_recordings.visit_id
            AND v.employee_id = auth.uid()
        )
    );

-- visit_transcripts: 讀取自己的
CREATE POLICY "visit_transcripts_select" ON visit_transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM visit_recordings vr
            JOIN visits v ON v.id = vr.visit_id
            WHERE vr.id = visit_transcripts.visit_recording_id
            AND v.employee_id = auth.uid()
        )
    );

CREATE POLICY "visit_transcripts_insert" ON visit_transcripts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM visit_recordings vr
            JOIN visits v ON v.id = vr.visit_id
            WHERE vr.id = visit_transcripts.visit_recording_id
            AND v.employee_id = auth.uid()
        )
    );

-- visit_actions: 讀寫自己的
CREATE POLICY "visit_actions_select" ON visit_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = visit_actions.visit_id
            AND v.employee_id = auth.uid()
        )
    );

CREATE POLICY "visit_actions_insert" ON visit_actions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = visit_actions.visit_id
            AND v.employee_id = auth.uid()
        )
    );

CREATE POLICY "visit_actions_update" ON visit_actions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM visits v
            WHERE v.id = visit_actions.visit_id
            AND v.employee_id = auth.uid()
        )
    );

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_visits_employee_id ON visits(employee_id);
CREATE INDEX IF NOT EXISTS idx_visits_order_id ON visits(order_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_workspace_id ON visits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_visit_recordings_visit_id ON visit_recordings(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_transcripts_recording_id ON visit_transcripts(visit_recording_id);
CREATE INDEX IF NOT EXISTS idx_visit_actions_visit_id ON visit_actions(visit_id);

-- =============================================
-- Auto-update updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visit_recordings_updated_at
    BEFORE UPDATE ON visit_recordings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visit_actions_updated_at
    BEFORE UPDATE ON visit_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
