-- Default Legacy Event Adapter
-- Creates one SaaS event wrapper around the current working legacy pageant data.
-- Does not move scoring yet. This only maps existing contestants, judges, and criteria
-- into SaaS event-builder tables for future migration.

BEGIN;

WITH org AS (
  INSERT INTO organizations (name, slug, plan_key, contestant_limit)
  VALUES ('Kirjane Labs Local', 'kirjane-labs-local', 'pro', 20)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    plan_key = EXCLUDED.plan_key,
    contestant_limit = EXCLUDED.contestant_limit,
    updated_at = NOW()
  RETURNING id
),
admin_user AS (
  INSERT INTO app_users (organization_id, name, email, role, is_active)
  SELECT id, 'Local Admin', 'local-admin@pageant.local', 'owner', TRUE
  FROM org
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = TRUE,
    updated_at = NOW()
  RETURNING id, organization_id
),
event_row AS (
  INSERT INTO events (
    organization_id,
    title,
    slug,
    status,
    template_key,
    contestant_limit,
    advancing_count,
    score_carry_mode,
    organization_name,
    logo_url,
    theme_color,
    tv_display_title,
    pdf_footer,
    prepared_by_text,
    developer_credits,
    created_by_user_id
  )
  SELECT
    organization_id,
    'Miss Poblacion Occidental',
    'miss-poblacion-occidental-legacy',
    'active',
    'pageant_standard',
    20,
    3,
    'qualifier_only',
    'Miss Poblacion Occidental',
    '/pageant-logo.jpg',
    '#7c3aed',
    'Miss Poblacion Occidental',
    'Happy Fiesta from Kirjane Labs × Dev Siris',
    'Prepared by Kirjane Labs × Dev Siris',
    'Kirjane Labs × Dev Siris',
    id
  FROM admin_user
  ON CONFLICT (organization_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    template_key = EXCLUDED.template_key,
    contestant_limit = EXCLUDED.contestant_limit,
    advancing_count = EXCLUDED.advancing_count,
    score_carry_mode = EXCLUDED.score_carry_mode,
    organization_name = EXCLUDED.organization_name,
    logo_url = EXCLUDED.logo_url,
    theme_color = EXCLUDED.theme_color,
    tv_display_title = EXCLUDED.tv_display_title,
    pdf_footer = EXCLUDED.pdf_footer,
    prepared_by_text = EXCLUDED.prepared_by_text,
    developer_credits = EXCLUDED.developer_credits,
    updated_at = NOW()
  RETURNING id, organization_id
),
prelim_round AS (
  INSERT INTO event_rounds (
    event_id,
    name,
    round_type,
    sort_order,
    candidate_pool_mode,
    advancing_count,
    score_carry_mode
  )
  SELECT
    id,
    'Preliminary Round',
    'scored',
    1,
    'all_contestants',
    3,
    'qualifier_only'
  FROM event_row
  WHERE NOT EXISTS (
    SELECT 1 FROM event_rounds r
    JOIN event_row e ON e.id = r.event_id
    WHERE r.name = 'Preliminary Round'
  )
  RETURNING id, event_id
),
finals_round AS (
  INSERT INTO event_rounds (
    event_id,
    name,
    round_type,
    sort_order,
    candidate_pool_mode,
    advancing_count,
    score_carry_mode
  )
  SELECT
    id,
    'Finals Round',
    'scored',
    2,
    'previous_round_advancers',
    NULL,
    'round_only'
  FROM event_row
  WHERE NOT EXISTS (
    SELECT 1 FROM event_rounds r
    JOIN event_row e ON e.id = r.event_id
    WHERE r.name = 'Finals Round'
  )
  RETURNING id, event_id
)
INSERT INTO display_settings (
  event_id,
  tv_title,
  show_logos,
  show_developer_credits,
  theme_color,
  settings
)
SELECT
  id,
  'Miss Poblacion Occidental',
  TRUE,
  TRUE,
  '#7c3aed',
  '{}'::jsonb
FROM event_row
ON CONFLICT (event_id) DO UPDATE SET
  tv_title = EXCLUDED.tv_title,
  show_logos = EXCLUDED.show_logos,
  show_developer_credits = EXCLUDED.show_developer_credits,
  theme_color = EXCLUDED.theme_color,
  updated_at = NOW();

WITH event_row AS (
  SELECT e.id
  FROM events e
  JOIN organizations o ON o.id = e.organization_id
  WHERE o.slug = 'kirjane-labs-local'
    AND e.slug = 'miss-poblacion-occidental-legacy'
)
INSERT INTO event_contestants (
  event_id,
  contestant_number,
  name,
  photo_url,
  details,
  is_active,
  sort_order
)
SELECT
  event_row.id,
  c.number,
  c.name,
  NULL,
  '{}'::jsonb,
  TRUE,
  c.number
FROM contestants c
CROSS JOIN event_row
ON CONFLICT (event_id, contestant_number) DO UPDATE SET
  name = EXCLUDED.name,
  photo_url = EXCLUDED.photo_url,
  details = EXCLUDED.details,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH event_row AS (
  SELECT e.id
  FROM events e
  JOIN organizations o ON o.id = e.organization_id
  WHERE o.slug = 'kirjane-labs-local'
    AND e.slug = 'miss-poblacion-occidental-legacy'
)
INSERT INTO event_judges (
  event_id,
  name,
  display_order,
  is_enabled
)
SELECT
  event_row.id,
  j.name,
  j.id,
  TRUE
FROM judges j
CROSS JOIN event_row
WHERE NOT EXISTS (
  SELECT 1
  FROM event_judges ej
  WHERE ej.event_id = event_row.id
    AND ej.name = j.name
);

WITH event_row AS (
  SELECT e.id
  FROM events e
  JOIN organizations o ON o.id = e.organization_id
  WHERE o.slug = 'kirjane-labs-local'
    AND e.slug = 'miss-poblacion-occidental-legacy'
),
prelim_round AS (
  SELECT r.id, r.event_id
  FROM event_rounds r
  JOIN event_row e ON e.id = r.event_id
  WHERE r.name = 'Preliminary Round'
)
INSERT INTO event_criteria (
  event_id,
  round_id,
  name,
  max_score,
  weight,
  sort_order,
  is_active
)
SELECT
  prelim_round.event_id,
  prelim_round.id,
  c.name,
  c.max_score,
  c.weight,
  c.sort_order,
  TRUE
FROM criteria c
CROSS JOIN prelim_round
WHERE NOT EXISTS (
  SELECT 1
  FROM event_criteria ec
  WHERE ec.round_id = prelim_round.id
    AND ec.name = c.name
);

WITH event_row AS (
  SELECT e.id
  FROM events e
  JOIN organizations o ON o.id = e.organization_id
  WHERE o.slug = 'kirjane-labs-local'
    AND e.slug = 'miss-poblacion-occidental-legacy'
),
finals_round AS (
  SELECT r.id, r.event_id
  FROM event_rounds r
  JOIN event_row e ON e.id = r.event_id
  WHERE r.name = 'Finals Round'
)
INSERT INTO event_criteria (
  event_id,
  round_id,
  name,
  max_score,
  weight,
  sort_order,
  is_active
)
SELECT finals_round.event_id, finals_round.id, 'Beauty and Poise', 100, 0.600000, 1, TRUE
FROM finals_round
WHERE NOT EXISTS (
  SELECT 1 FROM event_criteria ec
  WHERE ec.round_id = finals_round.id
    AND ec.name = 'Beauty and Poise'
)
UNION ALL
SELECT finals_round.event_id, finals_round.id, 'Wit, Intelligence, and Quality of Answer', 100, 0.400000, 2, TRUE
FROM finals_round
WHERE NOT EXISTS (
  SELECT 1 FROM event_criteria ec
  WHERE ec.round_id = finals_round.id
    AND ec.name = 'Wit, Intelligence, and Quality of Answer'
);

INSERT INTO audit_logs (
  organization_id,
  event_id,
  actor_role,
  action_type,
  target_type,
  target_id,
  new_value,
  reason
)
SELECT
  e.organization_id,
  e.id,
  'system',
  'legacy_event_adapter_created',
  'event',
  e.id::text,
  jsonb_build_object(
    'title', e.title,
    'template_key', e.template_key,
    'advancing_count', e.advancing_count
  ),
  'Created compatibility event wrapper for existing legacy pageant data.'
FROM events e
JOIN organizations o ON o.id = e.organization_id
WHERE o.slug = 'kirjane-labs-local'
  AND e.slug = 'miss-poblacion-occidental-legacy'
  AND NOT EXISTS (
    SELECT 1 FROM audit_logs a
    WHERE a.event_id = e.id
      AND a.action_type = 'legacy_event_adapter_created'
  );

COMMIT;
