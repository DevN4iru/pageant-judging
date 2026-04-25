DELETE FROM score_history;
DELETE FROM judge_submissions;
DELETE FROM scores;

DELETE FROM judges;
DELETE FROM contestants;

INSERT INTO judges (name, pin) VALUES
('Judge 1', '1111'),
('Judge 2', '2222'),
('Judge 3', '3333'),
('Judge 4', '4444'),
('Judge 5', '5555');

INSERT INTO contestants (number, name, category) VALUES
(1, 'Candidate 1', 'Main'),
(2, 'Candidate 2', 'Main'),
(3, 'Candidate 3', 'Main'),
(4, 'Candidate 4', 'Main'),
(5, 'Candidate 5', 'Main'),
(6, 'Candidate 6', 'Main'),
(7, 'Candidate 7', 'Main'),
(8, 'Candidate 8', 'Main');
