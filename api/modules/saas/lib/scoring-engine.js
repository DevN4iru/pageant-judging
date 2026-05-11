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

function buildContestantPool({ round, roundIndex, rounds, contestants, criteria, scores, candidatePools }) {
  if (round.candidate_pool_mode === 'custom_pool') {
    const allowedIds = new Set(
      candidatePools
        .filter((item) => String(item.round_id) === String(round.id))
        .map((item) => String(item.contestant_id))
    );

    return contestants.filter((contestant) => allowedIds.has(String(contestant.id)));
  }

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

async function loadEventContext(pool, eventId) {
  const [event, contestants, judges, rounds, criteria, scores, submissions, candidatePools] = await Promise.all([
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
    pool.query('SELECT * FROM event_scores WHERE event_id = $1', [eventId]),
    pool.query('SELECT * FROM event_submissions WHERE event_id = $1', [eventId]),
    pool.query('SELECT * FROM round_candidate_pool WHERE event_id = $1', [eventId])
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
    submissions: submissions.rows,
    candidatePools: candidatePools.rows
  };
}

function buildRoundResults(context) {
  return context.rounds.map((round, index) => {
    const pool = buildContestantPool({
      round,
      roundIndex: index,
      rounds: context.rounds,
      contestants: context.contestants,
      criteria: context.criteria,
      scores: context.scores,
      candidatePools: context.candidatePools
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
}

function buildOverallResults(roundResults) {
  const carryRounds = roundResults.filter(({ round }) => round.score_carry_mode === 'carry_over');
  const source = carryRounds.length ? carryRounds : roundResults;
  const totals = new Map();

  source.forEach(({ results }) => {
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

  return rankRows([...totals.values()]);
}

function missingScoresForRound({ round, contestants, criteria, scores, judgeId }) {
  const roundCriteria = criteria.filter((criterion) => String(criterion.round_id) === String(round.id));
  const missing = [];

  contestants.forEach((contestant) => {
    roundCriteria.forEach((criterion) => {
      const exists = scores.some((score) =>
        String(score.round_id) === String(round.id) &&
        String(score.criterion_id) === String(criterion.id) &&
        String(score.contestant_id) === String(contestant.id) &&
        String(score.judge_id) === String(judgeId)
      );

      if (!exists) {
        missing.push({
          contestant_id: contestant.id,
          contestant_number: contestant.contestant_number,
          contestant_name: contestant.name,
          criterion_id: criterion.id,
          criterion_name: criterion.name
        });
      }
    });
  });

  return missing;
}

module.exports = {
  idEquals,
  toNumber,
  rankRows,
  calculateRoundResults,
  buildContestantPool,
  buildRoundResults,
  buildOverallResults,
  loadEventContext,
  missingScoresForRound
};
