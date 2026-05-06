DO
$$
DECLARE
  active_rows INT;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM scores) +
    (SELECT COUNT(*) FROM score_history) +
    (SELECT COUNT(*) FROM judge_submissions) +
    (SELECT COUNT(*) FROM final_scores) +
    (SELECT COUNT(*) FROM final_score_history) +
    (SELECT COUNT(*) FROM final_judge_submissions)
  INTO active_rows;

  IF active_rows > 0 THEN
    RAISE EXCEPTION 'Refusing to change contestants because scoring/submissions already exist. Reset the event first or back up the DB.';
  END IF;
END
$$;

INSERT INTO contestants (number, name, category) VALUES
(1, 'Candidate 1', 'Main'),
(2, 'Candidate 2', 'Main'),
(3, 'Candidate 3', 'Main'),
(4, 'Candidate 4', 'Main'),
(5, 'Candidate 5', 'Main'),
(6, 'Candidate 6', 'Main'),
(7, 'Candidate 7', 'Main'),
(8, 'Candidate 8', 'Main')
ON CONFLICT (number)
DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category;

DELETE FROM contestants
WHERE number NOT BETWEEN 1 AND 8;

SELECT number, name, category
FROM contestants
ORDER BY number;
