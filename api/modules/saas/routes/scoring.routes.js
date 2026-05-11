const express = require('express');
const pool = require('../../../db');
const { writeAudit } = require('../lib/audit');
const {
  buildContestantPool,
  buildOverallResults,
  buildRoundResults,
  idEquals,
  loadEventContext,
  missingScoresForRound
} = require('../lib/scoring-engine');

const router = express.Router();

function requireReason(req) {
  const reason = req.body?.reason || req.query?.reason;
  if (!reason || !String(reason).trim()) {
    const err = new Error('Reason is required.');
    err.statusCode = 400;
    throw err;
  }
  return String(reason).trim();
}

router.get('/events/:eventId/scoring/:judgeId/desk', async (req, res) => {
  try {
    const { eventId, judgeId } = req.params;
    const context = await loadEventContext(pool, eventId);

    if (!context) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const judge = context.judges.find((item) => idEquals(item.id, judgeId) && item.is_enabled && !item.removed_at);

    if (!judge) {
      return res.status(404).json({ error: 'Judge not found or disabled for this event.' });
    }

    const rounds = context.rounds.map((round, index) => {
      const roundContestants = buildContestantPool({
        round,
        roundIndex: index,
        rounds: context.rounds,
        contestants: context.contestants,
        criteria: context.criteria,
        scores: context.scores,
        candidatePools: context.candidatePools
      });

      const submission = context.submissions.find((item) =>
        idEquals(item.round_id, round.id) &&
        idEquals(item.judge_id, judgeId) &&
        !item.reopened_at
      );

      return {
        ...round,
        criteria: context.criteria.filter((criterion) => idEquals(criterion.round_id, round.id)),
        contestants: roundContestants,
        scores: context.scores.filter((score) =>
          idEquals(score.round_id, round.id) &&
          idEquals(score.judge_id, judgeId)
        ),
        submission: submission || null,
        is_submitted: Boolean(submission),
        event_finalized: Boolean(context.event.finalized_at)
      };
    });

    res.json({
      event: context.event,
      judge,
      rounds
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/:eventId/scoring/:judgeId/scores', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, judgeId } = req.params;
    const { roundId, criterionId, contestantId, score } = req.body;
    const numericScore = Number(score);

    if (![roundId, criterionId, contestantId].every(Boolean)) {
      return res.status(400).json({ error: 'roundId, criterionId, and contestantId are required.' });
    }

    if (!Number.isFinite(numericScore)) {
      return res.status(400).json({ error: 'Score must be a valid number.' });
    }

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.rows[0].finalized_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Event is finalized. Scoring is frozen.' });
    }

    const judge = await client.query(`
      SELECT *
      FROM event_judges
      WHERE id = $1 AND event_id = $2 AND is_enabled = TRUE AND removed_at IS NULL
    `, [judgeId, eventId]);

    if (judge.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Judge not found or disabled.' });
    }

    const round = await client.query(`
      SELECT *
      FROM event_rounds
      WHERE id = $1 AND event_id = $2
    `, [roundId, eventId]);

    if (round.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Round not found.' });
    }

    if (round.rows[0].is_locked) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Round is locked.' });
    }

    const submission = await client.query(`
      SELECT id
      FROM event_submissions
      WHERE event_id = $1 AND round_id = $2 AND judge_id = $3 AND reopened_at IS NULL
    `, [eventId, roundId, judgeId]);

    if (submission.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Judge already submitted this round. Scores are locked.' });
    }

    const criterion = await client.query(`
      SELECT *
      FROM event_criteria
      WHERE id = $1 AND event_id = $2 AND round_id = $3 AND is_active = TRUE
    `, [criterionId, eventId, roundId]);

    if (criterion.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Criterion not found.' });
    }

    const maxScore = Number(criterion.rows[0].max_score || 100);

    if (numericScore < 0 || numericScore > maxScore) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Score must be between 0 and ${maxScore}.` });
    }

    const contestant = await client.query(`
      SELECT *
      FROM event_contestants
      WHERE id = $1 AND event_id = $2 AND is_active = TRUE
    `, [contestantId, eventId]);

    if (contestant.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contestant not found.' });
    }

    const before = await client.query(`
      SELECT *
      FROM event_scores
      WHERE round_id = $1 AND criterion_id = $2 AND contestant_id = $3 AND judge_id = $4
    `, [roundId, criterionId, contestantId, judgeId]);

    const updated = await client.query(`
      INSERT INTO event_scores (
        event_id,
        round_id,
        criterion_id,
        contestant_id,
        judge_id,
        score,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (round_id, criterion_id, contestant_id, judge_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        updated_at = NOW()
      RETURNING *
    `, [eventId, roundId, criterionId, contestantId, judgeId, numericScore]);

    await client.query(`
      UPDATE events
      SET scoring_started_at = COALESCE(scoring_started_at, NOW()), updated_at = NOW()
      WHERE id = $1
    `, [eventId]);

    await writeAudit(client, {
      organizationId: event.rows[0].organization_id,
      eventId,
      actorJudgeId: judgeId,
      actorRole: 'judge',
      actionType: 'judge_score_edit',
      targetType: 'score',
      targetId: updated.rows[0].id,
      oldValue: before.rows[0] || null,
      newValue: updated.rows[0],
      reason: 'Judge score saved through SaaS scoring engine.',
      req
    });

    await client.query('COMMIT');

    res.json({ ok: true, score: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/events/:eventId/scoring/:judgeId/rounds/:roundId/submit', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, judgeId, roundId } = req.params;

    await client.query('BEGIN');

    const context = await loadEventContext({ query: client.query.bind(client) }, eventId);

    if (!context) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (context.event.finalized_at) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Event is finalized. Submissions are frozen.' });
    }

    const judge = context.judges.find((item) => idEquals(item.id, judgeId) && item.is_enabled && !item.removed_at);

    if (!judge) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Judge not found or disabled.' });
    }

    const roundIndex = context.rounds.findIndex((item) => idEquals(item.id, roundId));
    const round = context.rounds[roundIndex];

    if (!round) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Round not found.' });
    }

    const contestants = buildContestantPool({
      round,
      roundIndex,
      rounds: context.rounds,
      contestants: context.contestants,
      criteria: context.criteria,
      scores: context.scores,
      candidatePools: context.candidatePools
    });

    const missing = missingScoresForRound({
      round,
      contestants,
      criteria: context.criteria,
      scores: context.scores,
      judgeId
    });

    if (missing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot submit incomplete round. Missing ${missing.length} score(s).`,
        missing_count: missing.length,
        missing
      });
    }

    const created = await client.query(`
      INSERT INTO event_submissions (
        event_id,
        round_id,
        judge_id,
        submitted_at,
        reopened_at,
        reopen_reason
      )
      VALUES ($1, $2, $3, NOW(), NULL, NULL)
      ON CONFLICT (round_id, judge_id)
      DO UPDATE SET
        submitted_at = NOW(),
        reopened_at = NULL,
        reopen_reason = NULL
      RETURNING *
    `, [eventId, roundId, judgeId]);

    await writeAudit(client, {
      organizationId: context.event.organization_id,
      eventId,
      actorJudgeId: judgeId,
      actorRole: 'judge',
      actionType: 'judge_round_submitted',
      targetType: 'submission',
      targetId: created.rows[0].id,
      newValue: created.rows[0],
      reason: 'Judge submitted complete round through SaaS scoring engine.',
      req
    });

    await client.query('COMMIT');

    res.json({ ok: true, submission: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/events/:eventId/rounds/:roundId/judges/:judgeId/reopen', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId, judgeId } = req.params;
    const reason = requireReason(req);

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const before = await client.query(`
      SELECT *
      FROM event_submissions
      WHERE event_id = $1 AND round_id = $2 AND judge_id = $3
    `, [eventId, roundId, judgeId]);

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const updated = await client.query(`
      UPDATE event_submissions
      SET reopened_at = NOW(), reopen_reason = $4
      WHERE event_id = $1 AND round_id = $2 AND judge_id = $3
      RETURNING *
    `, [eventId, roundId, judgeId, reason]);

    await writeAudit(client, {
      organizationId: event.rows[0].organization_id,
      eventId,
      actorRole: 'admin',
      actionType: 'judge_submission_reopened',
      targetType: 'submission',
      targetId: updated.rows[0].id,
      oldValue: before.rows[0],
      newValue: updated.rows[0],
      reason,
      req
    });

    await client.query('COMMIT');

    res.json({ ok: true, submission: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.statusCode || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/events/:eventId/scoring-results', async (req, res) => {
  try {
    const { eventId } = req.params;
    const context = await loadEventContext(pool, eventId);

    if (!context) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const rounds = buildRoundResults(context);
    const overall = buildOverallResults(rounds);

    res.json({
      event: context.event,
      rounds,
      overall
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events/:eventId/finalize', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const reason = requireReason(req);

    await client.query('BEGIN');

    const context = await loadEventContext({ query: client.query.bind(client) }, eventId);

    if (!context) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const rounds = buildRoundResults(context);
    const overall = buildOverallResults(rounds);

    const snapshot = await client.query(`
      INSERT INTO result_snapshots (
        event_id,
        snapshot_type,
        title,
        data,
        created_at
      )
      VALUES ($1, 'final_declaration', $2, $3, NOW())
      RETURNING *
    `, [
      eventId,
      `${context.event.title} Final Declaration`,
      JSON.stringify({ event: context.event, rounds, overall })
    ]);

    const updatedEvent = await client.query(`
      UPDATE events
      SET finalized_at = COALESCE(finalized_at, NOW()), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [eventId]);

    await writeAudit(client, {
      organizationId: context.event.organization_id,
      eventId,
      actorRole: 'admin',
      actionType: 'final_declaration_created',
      targetType: 'event',
      targetId: eventId,
      oldValue: context.event,
      newValue: updatedEvent.rows[0],
      reason,
      req
    });

    await client.query('COMMIT');

    res.json({ ok: true, event: updatedEvent.rows[0], snapshot: snapshot.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.statusCode || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/events/:eventId/reopen-finalized', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const reason = requireReason(req);

    await client.query('BEGIN');

    const before = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const updated = await client.query(`
      UPDATE events
      SET finalized_at = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [eventId]);

    await writeAudit(client, {
      organizationId: before.rows[0].organization_id,
      eventId,
      actorRole: 'admin',
      actionType: 'final_declaration_reopened',
      targetType: 'event',
      targetId: eventId,
      oldValue: before.rows[0],
      newValue: updated.rows[0],
      reason,
      req
    });

    await client.query('COMMIT');

    res.json({ ok: true, event: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.statusCode || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
