CREATE TABLE IF NOT EXISTS judges (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contestants (
  id SERIAL PRIMARY KEY,
  number INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Main',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS criteria (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  max_score NUMERIC(6,2) NOT NULL,
  weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  judge_id INT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  contestant_id INT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  criteria_id INT NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score NUMERIC(6,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(judge_id, contestant_id, criteria_id)
);

INSERT INTO judges (name, pin) VALUES
('Judge 1', '1111'),
('Judge 2', '2222'),
('Judge 3', '3333'),
('Judge 4', '4444'),
('Judge 5', '5555')
ON CONFLICT (pin) DO NOTHING;

INSERT INTO contestants (number, name, category) VALUES
(1, 'Candidate 1', 'Main'),
(2, 'Candidate 2', 'Main'),
(3, 'Candidate 3', 'Main'),
(4, 'Candidate 4', 'Main'),
(5, 'Candidate 5', 'Main')
ON CONFLICT (number) DO NOTHING;

INSERT INTO criteria (name, max_score, weight, sort_order) VALUES
('Beauty / Poise', 30, 1, 1),
('Talent / Performance', 30, 1, 2),
('Q&A', 25, 1, 3),
('Audience Impact', 15, 1, 4)
ON CONFLICT (name) DO NOTHING;
