const express = require('express');
const pool = require('../../../db');

const router = express.Router();

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

router.patch('/events/:eventId/settings', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const {
      title,
      organizationName,
      logoUrl,
      themeColor,
      tvDisplayTitle,
      pdfFooter,
      preparedByText,
      developerCredits,
      advancingCount,
      scoreCarryMode
    } = req.body;

    await client.query('BEGIN');

    const before = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const current = before.rows[0];

    const updated = await client.query(`
      UPDATE events
      SET
        title = COALESCE($2, title),
        organization_name = COALESCE($3, organization_name),
        logo_url = COALESCE($4, logo_url),
        theme_color = COALESCE($5, theme_color),
        tv_display_title = COALESCE($6, tv_display_title),
        pdf_footer = COALESCE($7, pdf_footer),
        prepared_by_text = COALESCE($8, prepared_by_text),
        developer_credits = COALESCE($9, developer_credits),
        advancing_count = COALESCE($10, advancing_count),
        score_carry_mode = COALESCE($11, score_carry_mode),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      eventId,
      title ?? null,
      organizationName ?? null,
      logoUrl ?? null,
      themeColor ?? null,
      tvDisplayTitle ?? null,
      pdfFooter ?? null,
      preparedByText ?? null,
      developerCredits ?? null,
      advancingCount ?? null,
      scoreCarryMode ?? null
    ]);

    await client.query(`
      INSERT INTO audit_logs (
        organization_id,
        event_id,
        actor_role,
        action_type,
        target_type,
        target_id,
        old_value,
        new_value,
        reason
      )
      VALUES ($1, $2, 'admin', 'event_settings_updated', 'event', $3, $4, $5, $6)
    `, [
      current.organization_id,
      eventId,
      String(eventId),
      JSON.stringify(current),
      JSON.stringify(updated.rows[0]),
      'Updated event settings through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({
      ok: true,
      event: updated.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
module.exports = router;
