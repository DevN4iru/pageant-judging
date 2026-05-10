-- SaaS Event Template Blueprints
-- Adds template rounds/criteria so templates are not hardcoded in app code.

BEGIN;

CREATE TABLE IF NOT EXISTS event_template_rounds (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  round_type TEXT NOT NULL DEFAULT 'scored',
  sort_order INTEGER NOT NULL DEFAULT 0,
  candidate_pool_mode TEXT NOT NULL DEFAULT 'all_contestants',
  advancing_count INTEGER,
  score_carry_mode TEXT NOT NULL DEFAULT 'qualifier_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_template_criteria (
  id BIGSERIAL PRIMARY KEY,
  template_round_id BIGINT NOT NULL REFERENCES event_template_rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score NUMERIC(10,2) NOT NULL DEFAULT 100,
  weight NUMERIC(8,6) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_template_rounds_template_id
ON event_template_rounds(template_id);

CREATE INDEX IF NOT EXISTS idx_event_template_criteria_round_id
ON event_template_criteria(template_round_id);

INSERT INTO event_templates (template_key, name, description, is_system_template)
VALUES
  ('blank', 'Custom Blank Event', 'Starts with 1 contestant, 1 judge, 1 round, and 1 criterion at 100%.', TRUE),
  ('pageant_standard', 'Pageant Standard Template', 'Standard pageant setup with preliminary and finals rounds.', TRUE),
  ('school_pageant', 'School Pageant Template', 'School-friendly pageant setup with simplified criteria.', TRUE),
  ('talent_competition', 'Talent Competition Template', 'Talent-first competition setup with performance-focused criteria.', TRUE)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system_template = EXCLUDED.is_system_template;

WITH blank_template AS (
  SELECT id FROM event_templates WHERE template_key = 'blank'
),
blank_round AS (
  INSERT INTO event_template_rounds
    (template_id, name, sort_order, candidate_pool_mode, advancing_count, score_carry_mode)
  SELECT id, 'Round 1', 1, 'all_contestants', NULL, 'qualifier_only'
  FROM blank_template
  WHERE NOT EXISTS (
    SELECT 1 FROM event_template_rounds r
    JOIN blank_template t ON t.id = r.template_id
  )
  RETURNING id
)
INSERT INTO event_template_criteria (template_round_id, name, max_score, weight, sort_order)
SELECT id, 'Overall Score', 100, 1.000000, 1
FROM blank_round;

WITH pageant_template AS (
  SELECT id FROM event_templates WHERE template_key = 'pageant_standard'
),
prelim AS (
  INSERT INTO event_template_rounds
    (template_id, name, sort_order, candidate_pool_mode, advancing_count, score_carry_mode)
  SELECT id, 'Preliminary Round', 1, 'all_contestants', 3, 'qualifier_only'
  FROM pageant_template
  WHERE NOT EXISTS (
    SELECT 1 FROM event_template_rounds r
    JOIN pageant_template t ON t.id = r.template_id
  )
  RETURNING id
),
finals AS (
  INSERT INTO event_template_rounds
    (template_id, name, sort_order, candidate_pool_mode, advancing_count, score_carry_mode)
  SELECT id, 'Finals Round', 2, 'previous_round_advancers', NULL, 'round_only'
  FROM pageant_template
  WHERE NOT EXISTS (
    SELECT 1 FROM event_template_rounds r
    JOIN pageant_template t ON t.id = r.template_id
  )
  RETURNING id
)
INSERT INTO event_template_criteria (template_round_id, name, max_score, weight, sort_order)
SELECT id, 'Production Number', 100, 0.100000, 1 FROM prelim
UNION ALL SELECT id, 'Fun Wear', 100, 0.150000, 2 FROM prelim
UNION ALL SELECT id, 'Preliminary Interview', 100, 0.200000, 3 FROM prelim
UNION ALL SELECT id, 'Advocacy Interview', 100, 0.250000, 4 FROM prelim
UNION ALL SELECT id, 'Long Gown', 100, 0.300000, 5 FROM prelim
UNION ALL SELECT id, 'Beauty and Poise', 100, 0.600000, 1 FROM finals
UNION ALL SELECT id, 'Wit, Intelligence, and Quality of Answer', 100, 0.400000, 2 FROM finals;

WITH school_template AS (
  SELECT id FROM event_templates WHERE template_key = 'school_pageant'
),
school_round AS (
  INSERT INTO event_template_rounds
    (template_id, name, sort_order, candidate_pool_mode, advancing_count, score_carry_mode)
  SELECT id, 'Main Round', 1, 'all_contestants', 5, 'qualifier_only'
  FROM school_template
  WHERE NOT EXISTS (
    SELECT 1 FROM event_template_rounds r
    JOIN school_template t ON t.id = r.template_id
  )
  RETURNING id
)
INSERT INTO event_template_criteria (template_round_id, name, max_score, weight, sort_order)
SELECT id, 'Beauty and Presence', 100, 0.300000, 1 FROM school_round
UNION ALL SELECT id, 'Talent', 100, 0.300000, 2 FROM school_round
UNION ALL SELECT id, 'Question and Answer', 100, 0.300000, 3 FROM school_round
UNION ALL SELECT id, 'Audience Impact', 100, 0.100000, 4 FROM school_round;

WITH talent_template AS (
  SELECT id FROM event_templates WHERE template_key = 'talent_competition'
),
talent_round AS (
  INSERT INTO event_template_rounds
    (template_id, name, sort_order, candidate_pool_mode, advancing_count, score_carry_mode)
  SELECT id, 'Talent Round', 1, 'all_contestants', NULL, 'round_only'
  FROM talent_template
  WHERE NOT EXISTS (
    SELECT 1 FROM event_template_rounds r
    JOIN talent_template t ON t.id = r.template_id
  )
  RETURNING id
)
INSERT INTO event_template_criteria (template_round_id, name, max_score, weight, sort_order)
SELECT id, 'Performance Quality', 100, 0.400000, 1 FROM talent_round
UNION ALL SELECT id, 'Creativity', 100, 0.250000, 2 FROM talent_round
UNION ALL SELECT id, 'Stage Presence', 100, 0.200000, 3 FROM talent_round
UNION ALL SELECT id, 'Audience Impact', 100, 0.150000, 4 FROM talent_round;

COMMIT;
