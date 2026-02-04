-- GROW Project Management System Schema
-- For use with Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups (Categories) table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_name TEXT,
  progress_mode TEXT NOT NULL DEFAULT 'auto' CHECK (progress_mode IN ('auto', 'manual')),
  progress_manual INTEGER CHECK (progress_manual >= 0 AND progress_manual <= 100),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Milestones table
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  due_date TIMESTAMPTZ,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- People table (for email notifications)
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task watchers (people who want to be notified about task changes)
CREATE TABLE task_watchers (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, person_id)
);

-- Email outbox (for reliable email delivery)
CREATE TABLE email_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  recipients TEXT[] NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_groups_project_id ON groups(project_id);
CREATE INDEX idx_groups_order ON groups("order");
CREATE INDEX idx_tasks_group_id ON tasks(group_id);
CREATE INDEX idx_tasks_order ON tasks("order");
CREATE INDEX idx_milestones_task_id ON milestones(task_id);
CREATE INDEX idx_milestones_order ON milestones("order");
CREATE INDEX idx_task_watchers_task_id ON task_watchers(task_id);
CREATE INDEX idx_task_watchers_person_id ON task_watchers(person_id);
CREATE INDEX idx_email_outbox_status ON email_outbox(status);
CREATE INDEX idx_email_outbox_created_at ON email_outbox(created_at);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Since there's no authentication, we'll allow all operations for now
-- In production, you should add proper authentication

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anonymous users (adjust as needed)
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on milestones" ON milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on people" ON people FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_watchers" ON task_watchers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_outbox" ON email_outbox FOR ALL USING (true) WITH CHECK (true);

-- Trigger to create email notifications when milestone is completed
CREATE OR REPLACE FUNCTION notify_milestone_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_task_title TEXT;
  v_task_owner_name TEXT;
  v_owner_email TEXT;
  v_watcher_emails TEXT[];
  v_all_recipients TEXT[];
  v_payload JSONB;
BEGIN
  -- Only notify when milestone changes from not done to done
  IF OLD.done IS DISTINCT FROM NEW.done AND NEW.done = true THEN
    
    -- Get task details
    SELECT t.title, t.owner_name
    INTO v_task_title, v_task_owner_name
    FROM tasks t
    WHERE t.id = NEW.task_id;
    
    -- Get owner email if owner_name is set
    IF v_task_owner_name IS NOT NULL THEN
      SELECT p.email INTO v_owner_email
      FROM people p
      WHERE p.name = v_task_owner_name
      LIMIT 1;
    END IF;
    
    -- Get watchers' emails
    SELECT ARRAY_AGG(DISTINCT p.email)
    INTO v_watcher_emails
    FROM task_watchers tw
    JOIN people p ON p.id = tw.person_id
    WHERE tw.task_id = NEW.task_id;
    
    -- Combine owner and watchers (remove duplicates)
    v_all_recipients := ARRAY[]::TEXT[];
    
    IF v_owner_email IS NOT NULL THEN
      v_all_recipients := ARRAY[v_owner_email];
    END IF;
    
    IF v_watcher_emails IS NOT NULL THEN
      v_all_recipients := v_all_recipients || v_watcher_emails;
    END IF;
    
    -- Remove duplicate emails
    SELECT ARRAY_AGG(DISTINCT email)
    INTO v_all_recipients
    FROM UNNEST(v_all_recipients) AS email;
    
    -- Only create outbox entry if we have recipients
    IF array_length(v_all_recipients, 1) > 0 THEN
      -- Build payload with all notification details
      v_payload := jsonb_build_object(
        'milestone_title', NEW.title,
        'milestone_id', NEW.id,
        'task_title', v_task_title,
        'task_id', NEW.task_id,
        'completed_at', NOW()
      );
      
      -- Insert into email outbox
      INSERT INTO email_outbox (
        event_type,
        task_id,
        milestone_id,
        recipients,
        payload,
        status
      ) VALUES (
        'milestone_completed',
        NEW.task_id,
        NEW.id,
        v_all_recipients,
        v_payload,
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER milestone_completed_notification
AFTER UPDATE ON milestones
FOR EACH ROW
EXECUTE FUNCTION notify_milestone_completed();
