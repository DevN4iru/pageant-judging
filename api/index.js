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


module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}
