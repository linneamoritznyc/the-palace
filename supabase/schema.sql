-- =====================================================
-- THE PALACE - SUPABASE SCHEMA
-- Project Ref: nfiahyxnhqvvvgseoxri
-- Generated: 2024-12-30
-- =====================================================

-- =====================================================
-- TABLE: projects
-- Core table for Palace rooms and projects
-- =====================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  room TEXT, -- 'art' | 'minerva' | 'startup' | 'jobhunt' | 'vault'
  description TEXT,
  status TEXT DEFAULT 'active',
  github_url TEXT,
  google_drive_folder_id TEXT,
  shopify_collection_id TEXT,
  local_path TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  mist_opacity NUMERIC DEFAULT 0,
  priority_score INTEGER DEFAULT 0
);

-- =====================================================
-- TABLE: tasks
-- Individual tasks linked to projects
-- =====================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  description TEXT NOT NULL,
  estimated_minutes INTEGER,
  source TEXT, -- 'manual' | 'github' | 'google' | 'shopify'
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE: activity_log
-- Tracks all activity for I.C.E. mist calculations
-- =====================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  event_type TEXT, -- 'commit' | 'task_complete' | 'file_edit' | 'view'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE: integration_tokens
-- S.N.O.W. integration credentials (encrypted)
-- =====================================================
CREATE TABLE integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL, -- 'github' | 'google' | 'shopify'
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE: process_archive
-- Knowledge base for project processes and snippets
-- =====================================================
CREATE TABLE process_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  content TEXT,
  commands TEXT[], -- Array of CLI commands
  code_snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE: skills
-- Skill/technology tags for projects
-- =====================================================
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT, -- 'language' | 'framework' | 'tool' | 'platform'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE: project_skills (Junction)
-- Many-to-many relationship between projects and skills
-- =====================================================
CREATE TABLE project_skills (
  project_id UUID REFERENCES projects(id),
  skill_id UUID REFERENCES skills(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (project_id, skill_id)
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_projects_room ON projects(room);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- Note: Enable RLS on tables via Supabase Dashboard
-- Current setup uses anon key with public access
-- =====================================================

-- Example RLS policy structure (to be configured in dashboard):
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
-- CREATE POLICY "Authenticated write access" ON projects FOR ALL USING (auth.role() = 'authenticated');
