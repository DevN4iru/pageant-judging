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

router.get('/events/:eventId/audit-logs', async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(`
      SELECT
        id,
        actor_role,
        action_type,
        target_type,
        target_id,
        reason,
        created_at
      FROM audit_logs
      WHERE event_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [eventId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/events/:eventId/monitor', async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await pool.query(`
      SELECT id, title, status, scoring_started_at, finalized_at, advancing_count, score_carry_mode
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM event_contestants WHERE event_id = $1 AND is_active = TRUE) AS active_contestants,
        (SELECT COUNT(*)::int FROM event_judges WHERE event_id = $1 AND is_enabled = TRUE AND removed_at IS NULL) AS enabled_judges,
        (SELECT COUNT(*)::int FROM event_rounds WHERE event_id = $1) AS rounds,
        (SELECT COUNT(*)::int FROM event_criteria WHERE event_id = $1 AND is_active = TRUE) AS active_criteria,
        (SELECT COUNT(*)::int FROM event_scores WHERE event_id = $1) AS score_rows,
        (SELECT COUNT(*)::int FROM event_submissions WHERE event_id = $1) AS submissions
    `, [eventId]);

    const rounds = await pool.query(`
      SELECT
        r.id,
        r.name,
        r.sort_order,
        r.is_locked,
        r.locked_at,
        r.unlocked_at,
        COUNT(DISTINCT c.id)::int AS criteria_count,
        COUNT(DISTINCT s.id)::int AS submission_count,
        COUNT(DISTINCT sc.id)::int AS score_count
      FROM event_rounds r
      LEFT JOIN event_criteria c ON c.round_id = r.id AND c.is_active = TRUE
      LEFT JOIN event_submissions s ON s.round_id = r.id
      LEFT JOIN event_scores sc ON sc.round_id = r.id
      WHERE r.event_id = $1
      GROUP BY r.id
      ORDER BY r.sort_order ASC, r.id ASC
    `, [eventId]);

    res.json({
      event: event.rows[0],
      counts: counts.rows[0],
      rounds: rounds.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/events/:eventId/result-snapshots', async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(`
      SELECT id, event_id, round_id, snapshot_type, title, data, created_at
      FROM result_snapshots
      WHERE event_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    `, [eventId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/:eventId/result-snapshots', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const { title, snapshotType, data } = req.body;

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const created = await client.query(`
      INSERT INTO result_snapshots (event_id, snapshot_type, title, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      eventId,
      snapshotType || 'admin_snapshot',
      title || 'Admin Result Snapshot',
      JSON.stringify(data || {})
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
      VALUES ($1, $2, 'admin', 'result_snapshot_created', 'result_snapshot', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(created.rows[0].id),
      JSON.stringify(created.rows[0]),
      'Created result snapshot through SaaS builder.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, snapshot: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/events/:eventId/display-settings', async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(`
      SELECT *
      FROM display_settings
      WHERE event_id = $1
    `, [eventId]);

    if (result.rows.length === 0) {
      return res.json({
        event_id: eventId,
        tv_title: '',
        show_logos: true,
        show_developer_credits: true,
        theme_color: '',
        settings: {}
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/events/:eventId/display-settings', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const { tvTitle, showLogos, showDeveloperCredits, themeColor, settings } = req.body;

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const updated = await client.query(`
      INSERT INTO display_settings (
        event_id,
        tv_title,
        show_logos,
        show_developer_credits,
        theme_color,
        settings,
        updated_at
      )
      VALUES ($1, $2, COALESCE($3, TRUE), COALESCE($4, TRUE), $5, COALESCE($6, '{}'::jsonb), NOW())
      ON CONFLICT (event_id)
      DO UPDATE SET
        tv_title = COALESCE(EXCLUDED.tv_title, display_settings.tv_title),
        show_logos = EXCLUDED.show_logos,
        show_developer_credits = EXCLUDED.show_developer_credits,
        theme_color = COALESCE(EXCLUDED.theme_color, display_settings.theme_color),
        settings = COALESCE(EXCLUDED.settings, display_settings.settings),
        updated_at = NOW()
      RETURNING *
    `, [
      eventId,
      tvTitle ?? null,
      showLogos,
      showDeveloperCredits,
      themeColor ?? null,
      settings ? JSON.stringify(settings) : null
    ]);

    await client.query(`
      UPDATE events
      SET
        tv_display_title = COALESCE($2, tv_display_title),
        theme_color = COALESCE($3, theme_color),
        updated_at = NOW()
      WHERE id = $1
    `, [eventId, tvTitle ?? null, themeColor ?? null]);

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
      VALUES ($1, $2, 'admin', 'display_settings_updated', 'display_settings', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(updated.rows[0].id),
      JSON.stringify(updated.rows[0]),
      'Updated TV display settings through SaaS builder.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, displaySettings: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/events/:eventId/pdf-exports', async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(`
      SELECT *
      FROM pdf_exports
      WHERE event_id = $1
      ORDER BY generated_at DESC, id DESC
      LIMIT 50
    `, [eventId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/:eventId/pdf-exports', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const { exportType, title, footerText, preparedByText, metadata } = req.body;

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const created = await client.query(`
      INSERT INTO pdf_exports (
        event_id,
        export_type,
        title,
        footer_text,
        prepared_by_text,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      eventId,
      exportType || 'builder_export',
      title || `${event.rows[0].title} Export`,
      footerText || event.rows[0].pdf_footer || '',
      preparedByText || event.rows[0].prepared_by_text || '',
      JSON.stringify(metadata || {})
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
      VALUES ($1, $2, 'admin', 'pdf_export_logged', 'pdf_export', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(created.rows[0].id),
      JSON.stringify(created.rows[0]),
      'PDF/export generation was logged through SaaS builder.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, export: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


module.exports = router;
