const express = require('express');
const pool = require('../../../db');

const router = express.Router();

function idEquals(a, b) {
  return String(a) === String(b);
}

function toNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function rankRows(rows) {
  const sorted = [...rows].sort((a, b) => b.total - a.total || Number(a.contestant_number) - Number(b.contestant_number));
  let lastScore = null;
  let lastRank = 0;

  return sorted.map((row, index) => {
    const rank = lastScore === row.total ? lastRank : index + 1;
    lastScore = row.total;
    lastRank = rank;
    return { ...row, rank };
  });
}

function calculateRoundResults({ contestants, criteria, scores, roundId }) {
  const roundCriteria = criteria.filter((criterion) => idEquals(criterion.round_id, roundId));

  const rows = contestants.map((contestant) => {
    const criterionBreakdown = roundCriteria.map((criterion) => {
      const criterionScores = scores.filter((score) =>
        idEquals(score.round_id, roundId) &&
        idEquals(score.criterion_id, criterion.id) &&
        idEquals(score.contestant_id, contestant.id)
      );

      const average = criterionScores.length
        ? criterionScores.reduce((sum, score) => sum + toNumber(score.score), 0) / criterionScores.length
        : 0;

      const weighted = average * toNumber(criterion.weight);

      return {
        criterion_id: criterion.id,
        name: criterion.name,
        weight: toNumber(criterion.weight),
        average: Number(average.toFixed(2)),
        weighted: Number(weighted.toFixed(2)),
        score_count: criterionScores.length
      };
    });

    const total = criterionBreakdown.reduce((sum, item) => sum + item.weighted, 0);

    return {
      contestant_id: contestant.id,
      contestant_number: contestant.contestant_number,
      name: contestant.name,
      photo_url: contestant.photo_url,
      total: Number(total.toFixed(2)),
      criteria: criterionBreakdown
    };
  });

  return rankRows(rows);
}

function buildContestantPool({ round, roundIndex, rounds, contestants, criteria, scores }) {
  if (round.candidate_pool_mode !== 'previous_round_advancers' || roundIndex === 0) {
    return contestants;
  }

  const previousRound = rounds[roundIndex - 1];
  const advancingCount = Number(previousRound.advancing_count || round.advancing_count || 3);
  const previousResults = calculateRoundResults({
    contestants,
    criteria,
    scores,
    roundId: previousRound.id
  });

  const allowedIds = new Set(previousResults.slice(0, advancingCount).map((row) => String(row.contestant_id)));
  return contestants.filter((contestant) => allowedIds.has(String(contestant.id)));
}

async function loadEventContext(eventId) {
  const [event, contestants, judges, rounds, criteria, scores, submissions] = await Promise.all([
    pool.query('SELECT * FROM events WHERE id = $1', [eventId]),
    pool.query(`
      SELECT *
      FROM event_contestants
      WHERE event_id = $1 AND is_active = TRUE
      ORDER BY sort_order ASC, contestant_number ASC, id ASC
    `, [eventId]),
    pool.query(`
      SELECT id, event_id, name, display_order, is_enabled, removed_at
      FROM event_judges
      WHERE event_id = $1
      ORDER BY display_order ASC, id ASC
    `, [eventId]),
    pool.query(`
      SELECT *
      FROM event_rounds
      WHERE event_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [eventId]),
    pool.query(`
      SELECT *
      FROM event_criteria
      WHERE event_id = $1 AND is_active = TRUE
      ORDER BY round_id ASC, sort_order ASC, id ASC
    `, [eventId]),
    pool.query(`
      SELECT *
      FROM event_scores
      WHERE event_id = $1
    `, [eventId]),
    pool.query(`
      SELECT *
      FROM event_submissions
      WHERE event_id = $1
    `, [eventId])
  ]);

  if (event.rows.length === 0) {
    return null;
  }

  return {
    event: event.rows[0],
    contestants: contestants.rows,
    judges: judges.rows,
    rounds: rounds.rows,
    criteria: criteria.rows,
    scores: scores.rows,
    submissions: submissions.rows
  };
}

router.get('/events/:eventId/scoring/:judgeId/desk', async (req, res) => {
  try {
    const { eventId, judgeId } = req.params;
    const context = await loadEventContext(eventId);

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
        scores: context.scores
      });

      const submission = context.submissions.find((item) =>
        idEquals(item.round_id, round.id) &&
        idEquals(item.judge_id, judgeId)
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
        is_submitted: Boolean(submission)
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
      WHERE event_id = $1 AND round_id = $2 AND judge_id = $3
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
      INSERT INTO audit_logs (
        organization_id,
        event_id,
        actor_judge_id,
        actor_role,
        action_type,
        target_type,
        target_id,
        old_value,
        new_value,
        reason
      )
      VALUES ($1, $2, $3, 'judge', 'judge_score_edit', 'score', $4, $5, $6, $7)
    `, [
      event.rows[0].organization_id,
      eventId,
      judgeId,
      String(updated.rows[0].id),
      before.rows[0] ? JSON.stringify(before.rows[0]) : null,
      JSON.stringify(updated.rows[0]),
      'Judge score saved through SaaS scoring engine.'
    ]);

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

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (event.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
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

    const created = await client.query(`
      INSERT INTO event_submissions (
        event_id,
        round_id,
        judge_id,
        submitted_at
      )
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (round_id, judge_id)
      DO UPDATE SET submitted_at = event_submissions.submitted_at
      RETURNING *
    `, [eventId, roundId, judgeId]);

    await client.query(`
      INSERT INTO audit_logs (
        organization_id,
        event_id,
        actor_judge_id,
        actor_role,
        action_type,
        target_type,
        target_id,
        new_value,
        reason
      )
      VALUES ($1, $2, $3, 'judge', 'judge_round_submitted', 'submission', $4, $5, $6)
    `, [
      event.rows[0].organization_id,
      eventId,
      judgeId,
      String(created.rows[0].id),
      JSON.stringify(created.rows[0]),
      'Judge submitted round through SaaS scoring engine.'
    ]);

    await client.query('COMMIT');

    res.json({ ok: true, submission: created.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/events/:eventId/scoring-results', async (req, res) => {
  try {
    const { eventId } = req.params;
    const context = await loadEventContext(eventId);

    if (!context) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const roundResults = context.rounds.map((round, index) => {
      const pool = buildContestantPool({
        round,
        roundIndex: index,
        rounds: context.rounds,
        contestants: context.contestants,
        criteria: context.criteria,
        scores: context.scores
      });

      return {
        round,
        results: calculateRoundResults({
          contestants: pool,
          criteria: context.criteria,
          scores: context.scores,
          roundId: round.id
        })
      };
    });

    const carryRounds = roundResults.filter(({ round }) => round.score_carry_mode === 'carry_over');

    const overallSource = carryRounds.length ? carryRounds : roundResults;
    const totals = new Map();

    overallSource.forEach(({ results }) => {
      results.forEach((row) => {
        const key = String(row.contestant_id);
        const current = totals.get(key) || {
          contestant_id: row.contestant_id,
          contestant_number: row.contestant_number,
          name: row.name,
          photo_url: row.photo_url,
          total: 0
        };

        current.total = Number((current.total + row.total).toFixed(2));
        totals.set(key, current);
      });
    });

    res.json({
      event: context.event,
      rounds: roundResults,
      overall: rankRows([...totals.values()])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
