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



router.post('/events/:eventId/contestants', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const {
      contestantNumber,
      name,
      photoUrl,
      details
    } = req.body;

    if (!contestantNumber || !name || !String(name).trim()) {
      return res.status(400).json({ error: 'Contestant number and name are required.' });
    }

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const scoringStarted = Boolean(event.rows[0].scoring_started_at);

    if (scoringStarted) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot add contestants after scoring starts.' });
    }

    const currentCount = await client.query(
      'SELECT COUNT(*)::int AS count FROM event_contestants WHERE event_id = $1 AND is_active = TRUE',
      [eventId]
    );

    if (currentCount.rows[0].count >= event.rows[0].contestant_limit) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Contestant limit reached: ${event.rows[0].contestant_limit}` });
    }

    const created = await client.query(`
      INSERT INTO event_contestants (
        event_id,
        contestant_number,
        name,
        photo_url,
        details,
        is_active,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, $2)
      RETURNING *
    `, [
      eventId,
      contestantNumber,
      String(name).trim(),
      photoUrl ?? null,
      JSON.stringify(details ?? {})
    ]);

    await client.query(`
      INSERT INTO audit_logs (
        organization_id,
        event_id,
        actor_role,
        action_type,
        target_type,
        target_id,
        new_value,
        reason
      )
      VALUES ($1, $2, 'admin', 'contestant_created', 'contestant', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(created.rows[0].id),
      JSON.stringify(created.rows[0]),
      'Created contestant through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, contestant: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});

    if (err.code === '23505') {
      return res.status(409).json({ error: 'Contestant number already exists for this event.' });
    }

    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch('/events/:eventId/contestants/:contestantId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, contestantId } = req.params;
    const {
      contestantNumber,
      name,
      photoUrl,
      details,
      isActive
    } = req.body;

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.rows[0].scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot edit contestants after scoring starts.' });
    }

    const before = await client.query(
      'SELECT * FROM event_contestants WHERE id = $1 AND event_id = $2',
      [contestantId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contestant not found' });
    }

    const updated = await client.query(`
      UPDATE event_contestants
      SET
        contestant_number = COALESCE($3, contestant_number),
        name = COALESCE($4, name),
        photo_url = COALESCE($5, photo_url),
        details = COALESCE($6, details),
        is_active = COALESCE($7, is_active),
        sort_order = COALESCE($3, sort_order),
        updated_at = NOW()
      WHERE id = $1 AND event_id = $2
      RETURNING *
    `, [
      contestantId,
      eventId,
      contestantNumber ?? null,
      name ? String(name).trim() : null,
      photoUrl ?? null,
      details === undefined ? null : JSON.stringify(details),
      isActive === undefined ? null : Boolean(isActive)
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
      VALUES ($1, $2, 'admin', 'contestant_updated', 'contestant', $3, $4, $5, $6)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(contestantId),
      JSON.stringify(before.rows[0]),
      JSON.stringify(updated.rows[0]),
      'Updated contestant through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, contestant: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});

    if (err.code === '23505') {
      return res.status(409).json({ error: 'Contestant number already exists for this event.' });
    }

    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/events/:eventId/contestants/:contestantId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, contestantId } = req.params;

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.rows[0].scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot delete contestants after scoring starts.' });
    }

    const before = await client.query(
      'SELECT * FROM event_contestants WHERE id = $1 AND event_id = $2',
      [contestantId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contestant not found' });
    }

    await client.query(
      'DELETE FROM event_contestants WHERE id = $1 AND event_id = $2',
      [contestantId, eventId]
    );

    await client.query(`
      INSERT INTO audit_logs (
        organization_id,
        event_id,
        actor_role,
        action_type,
        target_type,
        target_id,
        old_value,
        reason
      )
      VALUES ($1, $2, 'admin', 'contestant_deleted', 'contestant', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(contestantId),
      JSON.stringify(before.rows[0]),
      'Deleted contestant through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


module.exports = router;
