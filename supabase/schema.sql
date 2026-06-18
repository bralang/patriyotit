-- =============================================
-- Patriotic Dashboard — Supabase Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Lookup tables
CREATE TABLE workers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Auto-create a workers row when a new Supabase Auth user is invited
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workers (name, email, user_id, sort_order)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.id,
    (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM public.workers)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE statuses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE project_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Clients
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  school_name TEXT NOT NULL,
  city TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  institution_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  contact2 TEXT,
  drive_url TEXT,
  instructions_url TEXT,
  template_url TEXT,
  notes TEXT,
  event_date DATE,
  status_id INTEGER REFERENCES statuses(id) ON DELETE SET NULL,
  type_id INTEGER REFERENCES project_types(id) ON DELETE SET NULL,
  package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project ↔ Worker (many-to-many)
CREATE TABLE project_workers (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, worker_id)
);

-- Work stages per project (7 fixed stages per project)
CREATE TABLE project_stages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_index INTEGER NOT NULL CHECK (stage_index BETWEEN 0 AND 6),
  name TEXT NOT NULL,
  client_days NUMERIC,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  target_hours NUMERIC,
  UNIQUE (project_id, stage_index)
);

-- Per-stage per-worker time tracking
CREATE TABLE stage_worker_times (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  UNIQUE (stage_id, worker_id)
);

-- Activity log
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  project_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status_id ON projects(status_id);
CREATE INDEX idx_projects_archived ON projects(archived);
CREATE INDEX idx_projects_event_date ON projects(event_date);
CREATE INDEX idx_project_workers_project ON project_workers(project_id);
CREATE INDEX idx_project_stages_project ON project_stages(project_id);
CREATE INDEX idx_stage_worker_times_stage ON stage_worker_times(stage_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- =============================================
-- Auto-update updated_at on projects
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Row Level Security — authenticated users get full access
-- =============================================
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_worker_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full" ON workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON project_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON project_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON project_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON stage_worker_times FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- Default data
-- =============================================
INSERT INTO workers (name, sort_order) VALUES
  ('חיה רבקה', 0),
  ('נחמה', 1),
  ('שולמית', 2);

INSERT INTO statuses (name, sort_order) VALUES
  ('שלב 1: קבלת תשלום', 0),
  ('שלב 2: גיבוש תוכן', 1),
  ('שלב 3: עיצוב', 2),
  ('שלב 4: פרוטוטייפ', 3),
  ('שלב 5: מאסטרפיס', 4),
  ('פרויקט ננעל', 5);

INSERT INTO project_types (name, sort_order) VALUES
  ('מחנה', 0),
  ('ערב הורים', 1),
  ('עיתון', 2),
  ('נושא שנתי', 3),
  ('אחר', 4);

INSERT INTO packages (name, sort_order) VALUES
  ('חבילת בסיס', 0),
  ('חבילת חוויה', 1),
  ('חבילת מעטפת', 2),
  ('אחר', 3);
