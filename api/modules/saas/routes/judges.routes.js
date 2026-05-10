const express = require('express');
const pool = require('../../../db');

const router = express.Router();

router.post('/events/:eventId/judges', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const { name, displayOrder, isEnabled } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Judge name is required.' });
    }

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.rows[0].scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot add judges after scoring starts.' });
    }

    const created = await client.query(`
      INSERT INTO event_judges (
        event_id,
        name,
        display_order,
        is_enabled
      )
      VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, TRUE))
      RETURNING *
    `, [
      eventId,
      String(name).trim(),
      displayOrder ?? null,
      isEnabled === undefined ? null : Boolean(isEnabled)
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
      VALUES ($1, $2, 'admin', 'judge_created', 'judge', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(created.rows[0].id),
      JSON.stringify(created.rows[0]),
      'Created judge through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, judge: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch('/events/:eventId/judges/:judgeId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, judgeId } = req.params;
    const { name, displayOrder, isEnabled } = req.body;

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const before = await client.query(
      'SELECT * FROM event_judges WHERE id = $1 AND event_id = $2',
      [judgeId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Judge not found' });
    }

    const updated = await client.query(`
      UPDATE event_judges
      SET
        name = COALESCE($3, name),
        display_order = COALESCE($4, display_order),
        is_enabled = COALESCE($5, is_enabled),
        updated_at = NOW()
      WHERE id = $1 AND event_id = $2
      RETURNING *
    `, [
      judgeId,
      eventId,
      name ? String(name).trim() : null,
      displayOrder ?? null,
      isEnabled === undefined ? null : Boolean(isEnabled)
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
      VALUES ($1, $2, 'admin', 'judge_updated', 'judge', $3, $4, $5, $6)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(judgeId),
      JSON.stringify(before.rows[0]),
      JSON.stringify(updated.rows[0]),
      'Updated judge through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, judge: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/events/:eventId/judges/:judgeId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, judgeId } = req.params;

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.rows[0].scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot remove judges after scoring starts.' });
    }

    const before = await client.query(
      'SELECT * FROM event_judges WHERE id = $1 AND event_id = $2',
      [judgeId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Judge not found' });
    }

    await client.query(
      'DELETE FROM event_judges WHERE id = $1 AND event_id = $2',
      [judgeId, eventId]
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
      VALUES ($1, $2, 'admin', 'judge_deleted', 'judge', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(judgeId),
      JSON.stringify(before.rows[0]),
      'Deleted judge through SaaS builder API.'
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
