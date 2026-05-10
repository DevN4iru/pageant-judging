-- SaaS Event Builder Foundation
-- Compatibility-safe: creates new SaaS tables only.
-- Does not delete or rename legacy tables.

BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan_key TEXT NOT NULL DEFAULT 'basic',
  contestant_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  template_key TEXT,
  contestant_limit INTEGER NOT NULL DEFAULT 20,
  advancing_count INTEGER NOT NULL DEFAULT 3,
  score_carry_mode TEXT NOT NULL DEFAULT 'qualifier_only',
  organization_name TEXT,
  logo_url TEXT,
  theme_color TEXT DEFAULT '#7c3aed',
  tv_display_title TEXT,
  pdf_footer TEXT,
  prepared_by_text TEXT,
  developer_credits TEXT,
  created_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  scoring_started_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS event_templates (
  id BIGSERIAL PRIMARY KEY,
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system_template BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_contestants (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contestant_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, contestant_number)
);

CREATE TABLE IF NOT EXISTS event_judges (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS judge_credentials (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  judge_id BIGINT NOT NULL REFERENCES event_judges(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  reset_required BOOLEAN NOT NULL DEFAULT FALSE,
  last_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, judge_id)
);

CREATE TABLE IF NOT EXISTS event_rounds (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  round_type TEXT NOT NULL DEFAULT 'scored',
  sort_order INTEGER NOT NULL DEFAULT 0,
  candidate_pool_mode TEXT NOT NULL DEFAULT 'all_contestants',
  advancing_count INTEGER,
  score_carry_mode TEXT NOT NULL DEFAULT 'qualifier_only',
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_criteria (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL REFERENCES event_rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score NUMERIC(10,2) NOT NULL DEFAULT 100,
  weight NUMERIC(8,6) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS round_candidate_pool (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL REFERENCES event_rounds(id) ON DELETE CASCADE,
  contestant_id BIGINT NOT NULL REFERENCES event_contestants(id) ON DELETE CASCADE,
  source_round_id BIGINT REFERENCES event_rounds(id) ON DELETE SET NULL,
  source_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, contestant_id)
);

CREATE TABLE IF NOT EXISTS event_scores (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL REFERENCES event_rounds(id) ON DELETE CASCADE,
  criterion_id BIGINT NOT NULL REFERENCES event_criteria(id) ON DELETE CASCADE,
  contestant_id BIGINT NOT NULL REFERENCES event_contestants(id) ON DELETE CASCADE,
  judge_id BIGINT NOT NULL REFERENCES event_judges(id) ON DELETE CASCADE,
  score NUMERIC(10,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, criterion_id, contestant_id, judge_id)
);

CREATE TABLE IF NOT EXISTS event_submissions (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL REFERENCES event_rounds(id) ON DELETE CASCADE,
  judge_id BIGINT NOT NULL REFERENCES event_judges(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reopened_at TIMESTAMPTZ,
  reopened_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  reopen_reason TEXT,
  UNIQUE (round_id, judge_id)
);

CREATE TABLE IF NOT EXISTS result_snapshots (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_id BIGINT REFERENCES event_rounds(id) ON DELETE SET NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'round_result',
  title TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  actor_judge_id BIGINT REFERENCES event_judges(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'system',
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS display_settings (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tv_title TEXT,
  show_logos BOOLEAN NOT NULL DEFAULT TRUE,
  show_developer_credits BOOLEAN NOT NULL DEFAULT TRUE,
  theme_color TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id)
);

CREATE TABLE IF NOT EXISTS pdf_exports (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  title TEXT,
  footer_text TEXT,
  prepared_by_text TEXT,
  generated_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_contestants_event_id ON event_contestants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_judges_event_id ON event_judges(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rounds_event_id ON event_rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_event_criteria_round_id ON event_criteria(round_id);
CREATE INDEX IF NOT EXISTS idx_event_scores_event_round ON event_scores(event_id, round_id);
CREATE INDEX IF NOT EXISTS idx_event_submissions_round_id ON event_submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

COMMIT;
