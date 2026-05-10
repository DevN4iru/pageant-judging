const express = require('express');
const pool = require('../../../db');

const router = express.Router();

router.post('/events/:eventId/judges/:judgeId/credentials', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, judgeId } = req.params;
    const { pin } = req.body;

    if (!pin || String(pin).trim().length < 4) {
      return res.status(400).json({ error: 'Judge PIN must be at least 4 characters.' });
    }

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const judge = await client.query(
      'SELECT * FROM event_judges WHERE id = $1 AND event_id = $2',
      [judgeId, eventId]
    );

    if (judge.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Judge not found' });
    }

    const pinHash = Buffer.from(String(pin).trim()).toString('base64');

    const credential = await client.query(`
      INSERT INTO judge_credentials (
        event_id,
        judge_id,
        pin_hash,
        reset_required,
        last_reset_at
      )
      VALUES ($1, $2, $3, FALSE, NOW())
      ON CONFLICT (event_id, judge_id)
      DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        reset_required = FALSE,
        last_reset_at = NOW()
      RETURNING id, event_id, judge_id, reset_required, last_reset_at, created_at
    `, [eventId, judgeId, pinHash]);

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
      VALUES ($1, $2, 'admin', 'judge_credential_reset', 'judge', $3, $4, $5)
    `, [
      event.rows[0].organization_id,
      eventId,
      String(judgeId),
      JSON.stringify({
        judge_id: judgeId,
        credential_id: credential.rows[0].id,
        reset_required: false
      }),
      'Set or reset judge credential through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({
      ok: true,
      credential: credential.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/events/:eventId/judge-login', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required.' });
    }

    const pinHash = Buffer.from(String(pin).trim()).toString('base64');

    const result = await pool.query(`
      SELECT
        j.id,
        j.event_id,
        j.name,
        j.display_order,
        j.is_enabled
      FROM event_judges j
      JOIN judge_credentials c
        ON c.judge_id = j.id
       AND c.event_id = j.event_id
      WHERE j.event_id = $1
        AND c.pin_hash = $2
        AND j.is_enabled = TRUE
      LIMIT 1
    `, [eventId, pinHash]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid judge PIN for this event.' });
    }

    res.json({ judge: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
