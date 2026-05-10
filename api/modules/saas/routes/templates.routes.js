const express = require('express');
const pool = require('../../../db');

const router = express.Router();

router.get('/templates', async (req, res) => {
  try {
    const templates = await pool.query(`
      SELECT
        t.id,
        t.template_key,
        t.name,
        t.description,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name,
              'round_type', r.round_type,
              'sort_order', r.sort_order,
              'candidate_pool_mode', r.candidate_pool_mode,
              'advancing_count', r.advancing_count,
              'score_carry_mode', r.score_carry_mode
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) AS rounds
      FROM event_templates t
      LEFT JOIN event_template_rounds r ON r.template_id = t.id
      GROUP BY t.id
      ORDER BY t.template_key ASC
    `);

    res.json(templates.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
