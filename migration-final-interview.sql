CREATE TABLE IF NOT EXISTS final_scores (
  id SERIAL PRIMARY KEY,
  judge_id INT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  contestant_id INT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  criteria_key TEXT NOT NULL,
  score NUMERIC(6,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(judge_id, contestant_id, criteria_key)
);

CREATE TABLE IF NOT EXISTS final_score_history (
  id SERIAL PRIMARY KEY,
  judge_id INT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  contestant_id INT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  criteria_key TEXT NOT NULL,
  old_score NUMERIC(6,2),
  new_score NUMERIC(6,2) NOT NULL,
  action TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS final_judge_submissions (
  id SERIAL PRIMARY KEY,
  judge_id INT NOT NULL UNIQUE REFERENCES judges(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP DEFAULT NOW()
);
