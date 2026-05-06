require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  res.json({
    ok: true,
    app: 'Miss Poblacion Occidental Judging API'
  });
});

app.post('/api/judge/login', async (req, res) => {
  try {
    const { pin } = req.body;

    const result = await pool.query(
      'SELECT id, name FROM judges WHERE pin = $1',
      [pin]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid judge PIN' });
    }

    res.json({ judge: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;

  if (pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'Invalid admin PIN' });
  }

  res.json({ ok: true });
});

app.get('/api/setup', async (req, res) => {
  try {
    const contestants = await pool.query(
      'SELECT * FROM contestants ORDER BY number ASC'
    );

    const criteria = await pool.query(
      'SELECT * FROM criteria ORDER BY sort_order ASC, id ASC'
    );

    res.json({
      contestants: contestants.rows,
      criteria: criteria.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/judge/:judgeId/status', async (req, res) => {
  try {
    const { judgeId } = req.params;

    const submission = await pool.query(
      'SELECT submitted_at FROM judge_submissions WHERE judge_id = $1',
      [judgeId]
    );

    const requiredResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM contestants)::int *
        (SELECT COUNT(*) FROM criteria)::int AS required_count
    `);

    const scoreCount = await pool.query(
      'SELECT COUNT(*)::int AS score_count FROM scores WHERE judge_id = $1',
      [judgeId]
    );

    res.json({
      submitted: submission.rows.length > 0,
      submitted_at: submission.rows[0]?.submitted_at || null,
      required_count: requiredResult.rows[0].required_count,
      score_count: scoreCount.rows[0].score_count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/judge/:judgeId/scores', async (req, res) => {
  try {
    const { judgeId } = req.params;

    const result = await pool.query(
      'SELECT contestant_id, criteria_id, score FROM scores WHERE judge_id = $1',
      [judgeId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', async (req, res) => {
  const client = await pool.connect();

  try {
    const { judgeId, contestantId, criteriaId, score } = req.body;
    const numericScore = Number(score);

    if (
      !judgeId ||
      !contestantId ||
      !criteriaId ||
      Number.isNaN(numericScore)
    ) {
      return res.status(400).json({ error: 'Invalid score data' });
    }

    await client.query('BEGIN');

    const submitted = await client.query(
      'SELECT id FROM judge_submissions WHERE judge_id = $1',
      [judgeId]
    );

    if (submitted.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(423).json({
        error: 'Scores are already final submitted and locked.'
      });
    }

    const criteria = await client.query(
      'SELECT max_score FROM criteria WHERE id = $1',
      [criteriaId]
    );

    if (criteria.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Criteria not found' });
    }

    const maxScore = Number(criteria.rows[0].max_score);

    if (numericScore < 0 || numericScore > maxScore) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Score must be from 0 to ${maxScore}`
      });
    }

    const existing = await client.query(
      `
      SELECT score
      FROM scores
      WHERE judge_id = $1 AND contestant_id = $2 AND criteria_id = $3
      `,
      [judgeId, contestantId, criteriaId]
    );

    const oldScore = existing.rows[0]?.score ?? null;

    await client.query(
      `
      INSERT INTO scores (judge_id, contestant_id, criteria_id, score, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (judge_id, contestant_id, criteria_id)
      DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
      `,
      [judgeId, contestantId, criteriaId, numericScore]
    );

    await client.query(
      `
      INSERT INTO score_history
      (judge_id, contestant_id, criteria_id, old_score, new_score, action, changed_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        judgeId,
        contestantId,
        criteriaId,
        oldScore,
        numericScore,
        oldScore === null ? 'initial_save' : 'edited_score'
      ]
    );

    await client.query('COMMIT');

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/judge/:judgeId/submit', async (req, res) => {
  try {
    const { judgeId } = req.params;

    const status = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM contestants)::int *
        (SELECT COUNT(*) FROM criteria)::int AS required_count,
        (SELECT COUNT(*) FROM scores WHERE judge_id = $1)::int AS score_count
    `, [judgeId]);

    const { required_count, score_count } = status.rows[0];

    if (score_count < required_count) {
      return res.status(400).json({
        error: `Incomplete scores. ${score_count}/${required_count} fields filled.`
      });
    }

    const result = await pool.query(
      `
      INSERT INTO judge_submissions (judge_id, submitted_at)
      VALUES ($1, NOW())
      ON CONFLICT (judge_id)
      DO UPDATE SET submitted_at = judge_submissions.submitted_at
      RETURNING submitted_at
      `,
      [judgeId]
    );

    res.json({
      ok: true,
      submitted_at: result.rows[0].submitted_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/judges/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        j.id,
        j.name,
        js.submitted_at,
        COUNT(s.id)::int AS score_count
      FROM judges j
      LEFT JOIN judge_submissions js ON js.judge_id = j.id
      LEFT JOIN scores s ON s.judge_id = j.id
      GROUP BY j.id, j.name, js.submitted_at
      ORDER BY j.id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH criterion_scores AS (
        SELECT
          c.id AS contestant_id,
          c.number,
          c.name,
          cr.id AS criteria_id,
          cr.name AS criteria_name,
          cr.sort_order,
          cr.weight,
          COALESCE(AVG(s.score), 0)::float AS average_raw_score,
          (COALESCE(AVG(s.score), 0) * cr.weight)::float AS weighted_score
        FROM contestants c
        CROSS JOIN criteria cr
        LEFT JOIN scores s
          ON s.contestant_id = c.id
         AND s.criteria_id = cr.id
        GROUP BY c.id, c.number, c.name, cr.id, cr.name, cr.sort_order, cr.weight
      ),
      totals AS (
        SELECT
          contestant_id AS id,
          number,
          name,
          SUM(weighted_score)::float AS total_score
        FROM criterion_scores
        GROUP BY contestant_id, number, name
      ),
      judge_counts AS (
        SELECT
          c.id AS contestant_id,
          COUNT(DISTINCT s.judge_id)::int AS judges_submitted
        FROM contestants c
        LEFT JOIN scores s ON s.contestant_id = c.id
        GROUP BY c.id
      )
      SELECT
        t.id,
        t.number,
        t.name,
        t.total_score,
        jc.judges_submitted
      FROM totals t
      JOIN judge_counts jc ON jc.contestant_id = t.id
      ORDER BY t.total_score DESC, t.number ASC
    `);

    const breakdown = await pool.query(`
      SELECT
        c.id AS contestant_id,
        cr.name AS criteria_name,
        COALESCE(AVG(s.score), 0)::float AS average_raw_score,
        (COALESCE(AVG(s.score), 0) * cr.weight)::float AS criteria_total
      FROM contestants c
      CROSS JOIN criteria cr
      LEFT JOIN scores s
        ON s.contestant_id = c.id
       AND s.criteria_id = cr.id
      GROUP BY c.id, c.number, cr.id, cr.name, cr.weight, cr.sort_order
      ORDER BY c.number ASC, cr.sort_order ASC, cr.id ASC
    `);

    const breakdownMap = {};

    breakdown.rows.forEach((row) => {
      if (!breakdownMap[row.contestant_id]) {
        breakdownMap[row.contestant_id] = {};
      }

      breakdownMap[row.contestant_id][row.criteria_name] = Number(row.criteria_total);
    });

    const rows = result.rows.map((row) => ({
      ...row,
      criteria_breakdown: breakdownMap[row.id] || {}
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/details', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        j.name AS judge,
        c.number AS contestant_number,
        c.name AS contestant,
        cr.name AS criteria,
        s.score,
        s.updated_at
      FROM scores s
      JOIN judges j ON j.id = s.judge_id
      JOIN contestants c ON c.id = s.contestant_id
      JOIN criteria cr ON cr.id = s.criteria_id
      ORDER BY c.number ASC, j.id ASC, cr.sort_order ASC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        h.id,
        j.name AS judge,
        c.number AS contestant_number,
        c.name AS contestant,
        cr.name AS criteria,
        h.old_score,
        h.new_score,
        h.action,
        h.changed_at
      FROM score_history h
      JOIN judges j ON j.id = h.judge_id
      JOIN contestants c ON c.id = h.contestant_id
      JOIN criteria cr ON cr.id = h.criteria_id
      ORDER BY h.changed_at DESC, h.id DESC
      LIMIT 300
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/winner', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value, updated_at FROM app_settings WHERE key = 'declared_winner'"
    );

    res.json({
      winner_name: result.rows[0]?.value || '',
      declared_at: result.rows[0]?.updated_at || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/winner', async (req, res) => {
  try {
    const { name } = req.body;
    const cleanName = String(name || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Winner name is required.' });
    }

    const result = await pool.query(
      `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('declared_winner', $1, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING value, updated_at
      `,
      [cleanName]
    );

    res.json({
      ok: true,
      winner_name: result.rows[0].value,
      declared_at: result.rows[0].updated_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/winner', async (req, res) => {
  try {
    await pool.query("DELETE FROM app_settings WHERE key = 'declared_winner'");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ===== KIRCH FINAL INTERVIEW API START ===== */

const FINAL_CRITERIA = [
  {
    key: 'beauty_poise',
    name: 'Beauty and Poise',
    max_score: 100,
    weight: 0.60,
    sort_order: 1
  },
  {
    key: 'wit_intelligence_answer',
    name: 'Wit, Intelligence, and Quality of Answer',
    max_score: 100,
    weight: 0.40,
    sort_order: 2
  }
];

const FINAL_CRITERIA_VALUES_SQL = `
  VALUES
    ('beauty_poise', 'Beauty and Poise', 0.60::numeric, 1),
    ('wit_intelligence_answer', 'Wit, Intelligence, and Quality of Answer', 0.40::numeric, 2)
`;

function getTopThreeSql(limitClause = '') {
  return `
    WITH criterion_scores AS (
      SELECT
        c.id AS contestant_id,
        c.number,
        c.name,
        cr.id AS criteria_id,
        cr.name AS criteria_name,
        cr.sort_order,
        cr.weight,
        COALESCE(AVG(s.score), 0)::float AS average_raw_score,
        (COALESCE(AVG(s.score), 0) * cr.weight)::float AS weighted_score
      FROM contestants c
      CROSS JOIN criteria cr
      LEFT JOIN scores s
        ON s.contestant_id = c.id
       AND s.criteria_id = cr.id
      GROUP BY c.id, c.number, c.name, cr.id, cr.name, cr.sort_order, cr.weight
    ),
    totals AS (
      SELECT
        contestant_id AS id,
        number,
        name,
        SUM(weighted_score)::float AS pre_final_score
      FROM criterion_scores
      GROUP BY contestant_id, number, name
    )
    SELECT id, number, name, pre_final_score
    FROM totals
    ORDER BY pre_final_score DESC, number ASC
    ${limitClause}
  `;
}

function getTopThreeContestantFilterSql() {
  return `
    SELECT id
    FROM (${getTopThreeSql('LIMIT 3')}) top_three_filter
  `;
}

async function getFinalReadiness() {
  const status = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM judges)::int AS total_judges,
      (SELECT COUNT(*) FROM judge_submissions)::int AS submitted_judges
  `);

  const topThree = await pool.query(getTopThreeSql('LIMIT 3'));
  const totalJudges = status.rows[0].total_judges;
  const submittedJudges = status.rows[0].submitted_judges;

  return {
    ready: totalJudges > 0 && submittedJudges === totalJudges && topThree.rows.length === 3,
    total_judges: totalJudges,
    submitted_judges: submittedJudges,
    top_three_count: topThree.rows.length,
    top_three: topThree.rows
  };
}

app.get('/api/final/readiness', async (req, res) => {
  try {
    res.json(await getFinalReadiness());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/final/setup', async (req, res) => {
  try {
    const readiness = await getFinalReadiness();

    res.json({
      ready: readiness.ready,
      total_judges: readiness.total_judges,
      submitted_judges: readiness.submitted_judges,
      contestants: readiness.ready ? readiness.top_three : [],
      criteria: FINAL_CRITERIA
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/final/judge/:judgeId/scores', async (req, res) => {
  try {
    const { judgeId } = req.params;

    const result = await pool.query(
      `
      SELECT contestant_id, criteria_key, score
      FROM final_scores
      WHERE judge_id = $1
        AND contestant_id IN (${getTopThreeContestantFilterSql()})
      `,
      [judgeId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/final/judge/:judgeId/status', async (req, res) => {
  try {
    const { judgeId } = req.params;

    const topThree = await pool.query(getTopThreeSql('LIMIT 3'));
    const requiredCount = topThree.rows.length * FINAL_CRITERIA.length;

    const submission = await pool.query(
      'SELECT submitted_at FROM final_judge_submissions WHERE judge_id = $1',
      [judgeId]
    );

    const scoreCount = await pool.query(
      `
      SELECT COUNT(*)::int AS score_count
      FROM final_scores
      WHERE judge_id = $1
        AND contestant_id IN (${getTopThreeContestantFilterSql()})
      `,
      [judgeId]
    );

    res.json({
      submitted: submission.rows.length > 0,
      submitted_at: submission.rows[0]?.submitted_at || null,
      required_count: requiredCount,
      score_count: scoreCount.rows[0].score_count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/final/scores', async (req, res) => {
  const client = await pool.connect();

  try {
    const { judgeId, contestantId, criteriaKey, score } = req.body;
    const numericScore = Number(score);
    const finalCriterion = FINAL_CRITERIA.find((item) => item.key === criteriaKey);

    if (
      !judgeId ||
      !contestantId ||
      !criteriaKey ||
      !finalCriterion ||
      Number.isNaN(numericScore)
    ) {
      return res.status(400).json({ error: 'Invalid final interview score data' });
    }

    if (numericScore < 0 || numericScore > finalCriterion.max_score) {
      return res.status(400).json({
        error: `Final Interview score must be from 0 to ${finalCriterion.max_score}`
      });
    }

    const readiness = await getFinalReadiness();

    if (!readiness.ready) {
      return res.status(423).json({
        error: `Final Interview is locked until all pre-final judges submit. ${readiness.submitted_judges}/${readiness.total_judges} judges submitted.`
      });
    }

    await client.query('BEGIN');

    const submitted = await client.query(
      'SELECT id FROM final_judge_submissions WHERE judge_id = $1',
      [judgeId]
    );

    if (submitted.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(423).json({
        error: 'Final Interview scores are already submitted and locked.'
      });
    }

    const isTopThree = await client.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM (${getTopThreeSql('LIMIT 3')}) top_three
        WHERE top_three.id = $1
      ) AS allowed
      `,
      [contestantId]
    );

    if (!isTopThree.rows[0].allowed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Final Interview scoring is only allowed for Top 3 candidates.'
      });
    }

    const existing = await client.query(
      `
      SELECT score
      FROM final_scores
      WHERE judge_id = $1 AND contestant_id = $2 AND criteria_key = $3
      `,
      [judgeId, contestantId, criteriaKey]
    );

    const oldScore = existing.rows[0]?.score ?? null;

    await client.query(
      `
      INSERT INTO final_scores (judge_id, contestant_id, criteria_key, score, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (judge_id, contestant_id, criteria_key)
      DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
      `,
      [judgeId, contestantId, criteriaKey, numericScore]
    );

    await client.query(
      `
      INSERT INTO final_score_history
      (judge_id, contestant_id, criteria_key, old_score, new_score, action, changed_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        judgeId,
        contestantId,
        criteriaKey,
        oldScore,
        numericScore,
        oldScore === null ? 'initial_final_save' : 'edited_final_score'
      ]
    );

    await client.query('COMMIT');

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/final/judge/:judgeId/submit', async (req, res) => {
  try {
    const { judgeId } = req.params;

    const readiness = await getFinalReadiness();

    if (!readiness.ready) {
      return res.status(423).json({
        error: `Final Interview is locked until all pre-final judges submit. ${readiness.submitted_judges}/${readiness.total_judges} judges submitted.`
      });
    }

    const topThree = await pool.query(getTopThreeSql('LIMIT 3'));
    const requiredCount = topThree.rows.length * FINAL_CRITERIA.length;

    const scoreCount = await pool.query(
      `
      SELECT COUNT(*)::int AS score_count
      FROM final_scores
      WHERE judge_id = $1
        AND contestant_id IN (${getTopThreeContestantFilterSql()})
      `,
      [judgeId]
    );

    if (scoreCount.rows[0].score_count < requiredCount) {
      return res.status(400).json({
        error: `Incomplete Final Interview scores. ${scoreCount.rows[0].score_count}/${requiredCount} fields filled.`
      });
    }

    const result = await pool.query(
      `
      INSERT INTO final_judge_submissions (judge_id, submitted_at)
      VALUES ($1, NOW())
      ON CONFLICT (judge_id)
      DO UPDATE SET submitted_at = final_judge_submissions.submitted_at
      RETURNING submitted_at
      `,
      [judgeId]
    );

    res.json({
      ok: true,
      submitted_at: result.rows[0].submitted_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/final/judges/status', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        j.id,
        j.name,
        fjs.submitted_at,
        COUNT(fs.id)::int AS score_count
      FROM judges j
      LEFT JOIN final_judge_submissions fjs ON fjs.judge_id = j.id
      LEFT JOIN final_scores fs
        ON fs.judge_id = j.id
       AND fs.contestant_id IN (${getTopThreeContestantFilterSql()})
      GROUP BY j.id, j.name, fjs.submitted_at
      ORDER BY j.id ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/final/results', async (req, res) => {
  try {
    const result = await pool.query(
      `
      WITH top_three AS (
        ${getTopThreeSql('LIMIT 3')}
      ),
      final_criterion_scores AS (
        SELECT
          t.id AS contestant_id,
          t.number,
          t.name,
          t.pre_final_score,
          fc.criteria_key,
          fc.criteria_name,
          fc.weight,
          fc.sort_order,
          COALESCE(AVG(fs.score), 0)::float AS average_raw_score,
          (COALESCE(AVG(fs.score), 0) * fc.weight)::float AS weighted_score
        FROM top_three t
        CROSS JOIN (${FINAL_CRITERIA_VALUES_SQL}) AS fc(criteria_key, criteria_name, weight, sort_order)
        LEFT JOIN final_scores fs
          ON fs.contestant_id = t.id
         AND fs.criteria_key = fc.criteria_key
        GROUP BY t.id, t.number, t.name, t.pre_final_score, fc.criteria_key, fc.criteria_name, fc.weight, fc.sort_order
      ),
      totals AS (
        SELECT
          contestant_id AS id,
          number,
          name,
          pre_final_score,
          SUM(weighted_score)::float AS final_score
        FROM final_criterion_scores
        GROUP BY contestant_id, number, name, pre_final_score
      ),
      judge_counts AS (
        SELECT
          t.id AS contestant_id,
          COUNT(DISTINCT fs.judge_id)::int AS judges_submitted
        FROM top_three t
        LEFT JOIN final_scores fs ON fs.contestant_id = t.id
        GROUP BY t.id
      )
      SELECT
        t.id,
        t.number,
        t.name,
        t.pre_final_score,
        t.final_score,
        jc.judges_submitted
      FROM totals t
      JOIN judge_counts jc ON jc.contestant_id = t.id
      ORDER BY t.final_score DESC, t.pre_final_score DESC, t.number ASC
      `
    );

    const breakdown = await pool.query(
      `
      WITH top_three AS (
        ${getTopThreeSql('LIMIT 3')}
      )
      SELECT
        t.id AS contestant_id,
        fc.criteria_key,
        fc.criteria_name,
        COALESCE(AVG(fs.score), 0)::float AS average_raw_score,
        (COALESCE(AVG(fs.score), 0) * fc.weight)::float AS criteria_total
      FROM top_three t
      CROSS JOIN (${FINAL_CRITERIA_VALUES_SQL}) AS fc(criteria_key, criteria_name, weight, sort_order)
      LEFT JOIN final_scores fs
        ON fs.contestant_id = t.id
       AND fs.criteria_key = fc.criteria_key
      GROUP BY t.id, fc.criteria_key, fc.criteria_name, fc.weight, fc.sort_order
      ORDER BY t.id ASC, fc.sort_order ASC
      `
    );

    const breakdownMap = {};

    breakdown.rows.forEach((row) => {
      if (!breakdownMap[row.contestant_id]) {
        breakdownMap[row.contestant_id] = {};
      }

      breakdownMap[row.contestant_id][row.criteria_name] = Number(row.criteria_total);
    });

    res.json(result.rows.map((row) => ({
      ...row,
      criteria_breakdown: breakdownMap[row.id] || {}
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/final/details', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        j.name AS judge,
        c.number AS contestant_number,
        c.name AS contestant,
        fs.criteria_key,
        CASE
          WHEN fs.criteria_key = 'beauty_poise' THEN 'Beauty and Poise'
          WHEN fs.criteria_key = 'wit_intelligence_answer' THEN 'Wit, Intelligence, and Quality of Answer'
          ELSE fs.criteria_key
        END AS criteria,
        fs.score,
        fs.updated_at
      FROM final_scores fs
      JOIN judges j ON j.id = fs.judge_id
      JOIN contestants c ON c.id = fs.contestant_id
      WHERE fs.contestant_id IN (${getTopThreeContestantFilterSql()})
      ORDER BY c.number ASC, j.id ASC, fs.criteria_key ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===== KIRCH FINAL INTERVIEW API END ===== */


module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}