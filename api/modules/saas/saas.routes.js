const express = require('express');
const pool = require('../../db');

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

router.get('/events', async (req, res) => {
  try {
    const events = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.slug,
        e.status,
        e.template_key,
        e.advancing_count,
        e.score_carry_mode,
        e.theme_color,
        e.tv_display_title,
        o.name AS organization_name,
        COUNT(DISTINCT c.id)::int AS contestant_count,
        COUNT(DISTINCT j.id)::int AS judge_count,
        COUNT(DISTINCT r.id)::int AS round_count
      FROM events e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN event_contestants c ON c.event_id = e.id
      LEFT JOIN event_judges j ON j.event_id = e.id
      LEFT JOIN event_rounds r ON r.event_id = e.id
      GROUP BY e.id, o.name
      ORDER BY e.created_at DESC, e.id DESC
    `);

    res.json(events.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/events/:eventId/builder', async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await pool.query(`
      SELECT
        e.*,
        o.name AS organization_record_name,
        ds.tv_title,
        ds.show_logos,
        ds.show_developer_credits,
        ds.settings AS display_settings
      FROM events e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN display_settings ds ON ds.event_id = e.id
      WHERE e.id = $1
    `, [eventId]);

    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const contestants = await pool.query(`
      SELECT *
      FROM event_contestants
      WHERE event_id = $1
      ORDER BY sort_order ASC, contestant_number ASC, id ASC
    `, [eventId]);

    const judges = await pool.query(`
      SELECT id, event_id, name, display_order, is_enabled, removed_at, created_at, updated_at
      FROM event_judges
      WHERE event_id = $1
      ORDER BY display_order ASC, id ASC
    `, [eventId]);

    const rounds = await pool.query(`
      SELECT *
      FROM event_rounds
      WHERE event_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [eventId]);

    const criteria = await pool.query(`
      SELECT *
      FROM event_criteria
      WHERE event_id = $1
      ORDER BY round_id ASC, sort_order ASC, id ASC
    `, [eventId]);

    res.json({
      event: event.rows[0],
      contestants: contestants.rows,
      judges: judges.rows,
      rounds: rounds.rows.map((round) => ({
        ...round,
        criteria: criteria.rows.filter((criterion) => criterion.round_id === round.id)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
