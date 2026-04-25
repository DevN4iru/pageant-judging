DELETE FROM score_history;
DELETE FROM judge_submissions;
DELETE FROM scores;
DELETE FROM criteria;

INSERT INTO criteria (name, max_score, weight, sort_order) VALUES
('Production Number', 100, 0.10, 1),
('Fun Wear', 100, 0.15, 2),
('Preliminary Interview', 100, 0.20, 3),
('Advocacy Interview', 100, 0.25, 4),
('Long Gown', 100, 0.30, 5);
