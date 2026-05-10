const express = require('express');
const pool = require('../../../db');

const router = express.Router();

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
