const express = require('express');
const pool = require('../../../db');

const router = express.Router();

async function getEventOr404(client, eventId) {
  const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);
  return event.rows[0] || null;
}

router.post('/events/:eventId/rounds', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const {
      name,
      roundType,
      sortOrder,
      candidatePoolMode,
      advancingCount,
      scoreCarryMode
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Round name is required.' });
    }

    await client.query('BEGIN');

    const event = await getEventOr404(client, eventId);

    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot add rounds after scoring starts.' });
    }

    const created = await client.query(`
      INSERT INTO event_rounds (
        event_id,
        name,
        round_type,
        sort_order,
        candidate_pool_mode,
        advancing_count,
        score_carry_mode
      )
      VALUES ($1, $2, COALESCE($3, 'scored'), COALESCE($4, 0), COALESCE($5, 'all_contestants'), $6, COALESCE($7, 'qualifier_only'))
      RETURNING *
    `, [
      eventId,
      String(name).trim(),
      roundType ?? null,
      sortOrder ?? null,
      candidatePoolMode ?? null,
      advancingCount ?? null,
      scoreCarryMode ?? null
    ]);

    await client.query(`
      INSERT INTO audit_logs (
        organization_id, event_id, actor_role, action_type,
        target_type, target_id, new_value, reason
      )
      VALUES ($1, $2, 'admin', 'round_created', 'round', $3, $4, $5)
    `, [
      event.organization_id,
      eventId,
      String(created.rows[0].id),
      JSON.stringify(created.rows[0]),
      'Created round through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, round: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch('/events/:eventId/rounds/:roundId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId } = req.params;
    const {
      name,
      roundType,
      sortOrder,
      candidatePoolMode,
      advancingCount,
      scoreCarryMode,
      isLocked
    } = req.body;

    await client.query('BEGIN');

    const event = await getEventOr404(client, eventId);

    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const before = await client.query(
      'SELECT * FROM event_rounds WHERE id = $1 AND event_id = $2',
      [roundId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Round not found' });
    }

    const updated = await client.query(`
      UPDATE event_rounds
      SET
        name = COALESCE($3, name),
        round_type = COALESCE($4, round_type),
        sort_order = COALESCE($5, sort_order),
        candidate_pool_mode = COALESCE($6, candidate_pool_mode),
        advancing_count = COALESCE($7, advancing_count),
        score_carry_mode = COALESCE($8, score_carry_mode),
        is_locked = COALESCE($9, is_locked),
        locked_at = CASE WHEN $9 = TRUE THEN NOW() ELSE locked_at END,
        unlocked_at = CASE WHEN $9 = FALSE THEN NOW() ELSE unlocked_at END,
        updated_at = NOW()
      WHERE id = $1 AND event_id = $2
      RETURNING *
    `, [
      roundId,
      eventId,
      name ? String(name).trim() : null,
      roundType ?? null,
      sortOrder ?? null,
      candidatePoolMode ?? null,
      advancingCount ?? null,
      scoreCarryMode ?? null,
      isLocked === undefined ? null : Boolean(isLocked)
    ]);

    await client.query(`
      INSERT INTO audit_logs (
        organization_id, event_id, actor_role, action_type,
        target_type, target_id, old_value, new_value, reason
      )
      VALUES ($1, $2, 'admin', 'round_updated', 'round', $3, $4, $5, $6)
    `, [
      event.organization_id,
      eventId,
      String(roundId),
      JSON.stringify(before.rows[0]),
      JSON.stringify(updated.rows[0]),
      'Updated round through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, round: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/events/:eventId/rounds/:roundId/criteria', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId } = req.params;
    const { name, maxScore, weight, sortOrder } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Criterion name is required.' });
    }

    if (weight === undefined || Number(weight) <= 0) {
      return res.status(400).json({ error: 'Criterion weight is required.' });
    }

    await client.query('BEGIN');

    const event = await getEventOr404(client, eventId);

    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot add criteria after scoring starts.' });
    }

    const round = await client.query(
      'SELECT * FROM event_rounds WHERE id = $1 AND event_id = $2',
      [roundId, eventId]
    );

    if (round.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Round not found' });
    }

    const created = await client.query(`
      INSERT INTO event_criteria (
        event_id,
        round_id,
        name,
        max_score,
        weight,
        sort_order,
        is_active
      )
      VALUES ($1, $2, $3, COALESCE($4, 100), $5, COALESCE($6, 0), TRUE)
      RETURNING *
    `, [
      eventId,
      roundId,
      String(name).trim(),
      maxScore ?? null,
      Number(weight),
      sortOrder ?? null
    ]);

    await client.query(`
      INSERT INTO audit_logs (
        organization_id, event_id, actor_role, action_type,
        target_type, target_id, new_value, reason
      )
      VALUES ($1, $2, 'admin', 'criterion_created', 'criterion', $3, $4, $5)
    `, [
      event.organization_id,
      eventId,
      String(created.rows[0].id),
      JSON.stringify(created.rows[0]),
      'Created criterion through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, criterion: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch('/events/:eventId/rounds/:roundId/criteria/:criterionId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId, criterionId } = req.params;
    const { name, maxScore, weight, sortOrder, isActive } = req.body;

    await client.query('BEGIN');

    const event = await getEventOr404(client, eventId);

    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot edit criteria after scoring starts.' });
    }

    const before = await client.query(
      'SELECT * FROM event_criteria WHERE id = $1 AND round_id = $2 AND event_id = $3',
      [criterionId, roundId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Criterion not found' });
    }

    const updated = await client.query(`
      UPDATE event_criteria
      SET
        name = COALESCE($4, name),
        max_score = COALESCE($5, max_score),
        weight = COALESCE($6, weight),
        sort_order = COALESCE($7, sort_order),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $1 AND round_id = $2 AND event_id = $3
      RETURNING *
    `, [
      criterionId,
      roundId,
      eventId,
      name ? String(name).trim() : null,
      maxScore ?? null,
      weight === undefined ? null : Number(weight),
      sortOrder ?? null,
      isActive === undefined ? null : Boolean(isActive)
    ]);

    await client.query(`
      INSERT INTO audit_logs (
        organization_id, event_id, actor_role, action_type,
        target_type, target_id, old_value, new_value, reason
      )
      VALUES ($1, $2, 'admin', 'criterion_updated', 'criterion', $3, $4, $5, $6)
    `, [
      event.organization_id,
      eventId,
      String(criterionId),
      JSON.stringify(before.rows[0]),
      JSON.stringify(updated.rows[0]),
      'Updated criterion through SaaS builder API.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, criterion: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/events/:eventId/rounds/:roundId/criteria/weight-check', async (req, res) => {
  try {
    const { eventId, roundId } = req.params;

    const result = await pool.query(`
      SELECT
        COALESCE(SUM(weight), 0)::numeric(10,6) AS total_weight,
        ABS(COALESCE(SUM(weight), 0) - 1.0) < 0.000001 AS is_valid
      FROM event_criteria
      WHERE event_id = $1
        AND round_id = $2
        AND is_active = TRUE
    `, [eventId, roundId]);

    res.json({
      eventId,
      roundId,
      totalWeight: result.rows[0].total_weight,
      isValid: result.rows[0].is_valid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/events/:eventId/rounds/:roundId/criteria/:criterionId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId, criterionId } = req.params;

    await client.query('BEGIN');

    const event = await getEventOr404(client, eventId);

    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot delete criteria after scoring starts.' });
    }

    const before = await client.query(
      'SELECT * FROM event_criteria WHERE id = $1 AND round_id = $2 AND event_id = $3',
      [criterionId, roundId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Criterion not found' });
    }

    await client.query(
      'DELETE FROM event_criteria WHERE id = $1 AND round_id = $2 AND event_id = $3',
      [criterionId, roundId, eventId]
    );

    await client.query(`
      INSERT INTO audit_logs (
        organization_id, event_id, actor_role, action_type,
        target_type, target_id, old_value, reason
      )
      VALUES ($1, $2, 'admin', 'criterion_deleted', 'criterion', $3, $4, $5)
    `, [
      event.organization_id,
      eventId,
      String(criterionId),
      JSON.stringify(before.rows[0]),
      'Deleted criterion through SaaS builder API.'
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

router.delete('/events/:eventId/rounds/:roundId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId } = req.params;

    await client.query('BEGIN');

    const event = await getEventOr404(client, eventId);

    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.scoring_started_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Cannot delete rounds after scoring starts.' });
    }

    const before = await client.query(
      'SELECT * FROM event_rounds WHERE id = $1 AND event_id = $2',
      [roundId, eventId]
    );

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Round not found' });
    }

    await client.query(
      'DELETE FROM event_rounds WHERE id = $1 AND event_id = $2',
      [roundId, eventId]
    );

    await client.query(`
      INSERT INTO audit_logs (
        organization_id, event_id, actor_role, action_type,
        target_type, target_id, old_value, reason
      )
      VALUES ($1, $2, 'admin', 'round_deleted', 'round', $3, $4, $5)
    `, [
      event.organization_id,
      eventId,
      String(roundId),
      JSON.stringify(before.rows[0]),
      'Deleted round through SaaS builder API.'
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
