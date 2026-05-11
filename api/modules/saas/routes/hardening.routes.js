const express = require('express');
const pool = require('../../../db');
const { writeAudit } = require('../lib/audit');
const { buildOverallResults, buildRoundResults, loadEventContext } = require('../lib/scoring-engine');

const router = express.Router();

function slugify(value) {
  return String(value || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'event';
}

function requireReason(req) {
  const reason = req.body?.reason || req.query?.reason;
  if (!reason || !String(reason).trim()) {
    const err = new Error('Reason is required.');
    err.statusCode = 400;
    throw err;
  }
  return String(reason).trim();
}

async function fetchBuilder(client, eventId) {
  const [event, contestants, judges, rounds, criteria] = await Promise.all([
    client.query(`
      SELECT e.*, o.name AS organization_record_name
      FROM events e
      LEFT JOIN organizations o ON o.id = e.organization_id
      WHERE e.id = $1
    `, [eventId]),
    client.query('SELECT * FROM event_contestants WHERE event_id = $1 ORDER BY sort_order ASC, contestant_number ASC, id ASC', [eventId]),
    client.query('SELECT id, event_id, name, display_order, is_enabled, removed_at, created_at, updated_at FROM event_judges WHERE event_id = $1 ORDER BY display_order ASC, id ASC', [eventId]),
    client.query('SELECT * FROM event_rounds WHERE event_id = $1 ORDER BY sort_order ASC, id ASC', [eventId]),
    client.query('SELECT * FROM event_criteria WHERE event_id = $1 ORDER BY round_id ASC, sort_order ASC, id ASC', [eventId])
  ]);

  if (!event.rows.length) return null;

  return {
    event: event.rows[0],
    contestants: contestants.rows,
    judges: judges.rows,
    rounds: rounds.rows.map((round) => ({
      ...round,
      criteria: criteria.rows.filter((criterion) => String(criterion.round_id) === String(round.id))
    }))
  };
}

router.post('/events/from-template', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      organizationId,
      templateKey = 'custom_blank',
      title = 'New SaaS Event',
      organizationName = 'Organization',
      themeColor = '#ec4899'
    } = req.body;

    await client.query('BEGIN');

    let orgId = organizationId;

    if (!orgId) {
      const existingOrg = await client.query('SELECT * FROM organizations ORDER BY id ASC LIMIT 1');

      if (existingOrg.rows.length) {
        orgId = existingOrg.rows[0].id;
      } else {
        const createdOrg = await client.query(`
          INSERT INTO organizations (name, slug, plan_key, contestant_limit)
          VALUES ($1, $2, 'pro', 20)
          RETURNING *
        `, [organizationName, slugify(organizationName)]);

        orgId = createdOrg.rows[0].id;
      }
    }

    const org = await client.query('SELECT * FROM organizations WHERE id = $1', [orgId]);

    if (!org.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const template = await client.query('SELECT * FROM event_templates WHERE template_key = $1', [templateKey]);

    if (!template.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Template not found.' });
    }

    const slug = `${slugify(title)}-${Date.now()}`;

    const event = await client.query(`
      INSERT INTO events (
        organization_id,
        title,
        slug,
        status,
        template_key,
        contestant_limit,
        advancing_count,
        score_carry_mode,
        organization_name,
        theme_color,
        tv_display_title,
        pdf_footer,
        prepared_by_text
      )
      VALUES ($1, $2, $3, 'draft', $4, $5, 3, 'qualifier_only', $6, $7, $2, '', '')
      RETURNING *
    `, [
      orgId,
      title,
      slug,
      templateKey,
      org.rows[0].contestant_limit || 20,
      organizationName,
      themeColor
    ]);

    const eventId = event.rows[0].id;

    const templateRounds = await client.query(`
      SELECT *
      FROM event_template_rounds
      WHERE template_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [template.rows[0].id]);

    if (templateRounds.rows.length === 0 || templateKey === 'custom_blank') {
      await client.query(`
        INSERT INTO event_contestants (event_id, contestant_number, name, sort_order)
        VALUES ($1, 1, 'Contestant 1', 1)
      `, [eventId]);

      await client.query(`
        INSERT INTO event_judges (event_id, name, display_order, is_enabled)
        VALUES ($1, 'Judge 1', 1, TRUE)
      `, [eventId]);

      const round = await client.query(`
        INSERT INTO event_rounds (event_id, name, sort_order, candidate_pool_mode, advancing_count, score_carry_mode)
        VALUES ($1, 'Round 1', 1, 'all_contestants', NULL, 'round_only')
        RETURNING *
      `, [eventId]);

      await client.query(`
        INSERT INTO event_criteria (event_id, round_id, name, weight, sort_order)
        VALUES ($1, $2, 'Criterion 1', 1.0, 1)
      `, [eventId, round.rows[0].id]);
    } else {
      for (const templateRound of templateRounds.rows) {
        const round = await client.query(`
          INSERT INTO event_rounds (
            event_id,
            name,
            round_type,
            sort_order,
            candidate_pool_mode,
            advancing_count,
            score_carry_mode
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          eventId,
          templateRound.name,
          templateRound.round_type,
          templateRound.sort_order,
          templateRound.candidate_pool_mode,
          templateRound.advancing_count,
          templateRound.score_carry_mode
        ]);

        const templateCriteria = await client.query(`
          SELECT *
          FROM event_template_criteria
          WHERE template_round_id = $1
          ORDER BY sort_order ASC, id ASC
        `, [templateRound.id]);

        for (const criterion of templateCriteria.rows) {
          await client.query(`
            INSERT INTO event_criteria (event_id, round_id, name, max_score, weight, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            eventId,
            round.rows[0].id,
            criterion.name,
            criterion.max_score,
            criterion.weight,
            criterion.sort_order
          ]);
        }
      }

      await client.query(`
        INSERT INTO event_contestants (event_id, contestant_number, name, sort_order)
        VALUES ($1, 1, 'Contestant 1', 1)
      `, [eventId]);

      await client.query(`
        INSERT INTO event_judges (event_id, name, display_order, is_enabled)
        VALUES ($1, 'Judge 1', 1, TRUE)
      `, [eventId]);
    }

    await writeAudit(client, {
      organizationId: orgId,
      eventId,
      actorRole: 'admin',
      actionType: 'event_created_from_template',
      targetType: 'event',
      targetId: eventId,
      newValue: event.rows[0],
      reason: `Created event from template ${templateKey}.`,
      req
    });

    const builder = await fetchBuilder(client, eventId);

    await client.query('COMMIT');

    res.json({ ok: true, builder });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/events/:eventId/rounds/:roundId/candidate-pool', async (req, res) => {
  try {
    const { eventId, roundId } = req.params;

    const result = await pool.query(`
      SELECT p.*, c.contestant_number, c.name
      FROM round_candidate_pool p
      JOIN event_contestants c ON c.id = p.contestant_id
      WHERE p.event_id = $1 AND p.round_id = $2
      ORDER BY c.sort_order ASC, c.contestant_number ASC, c.id ASC
    `, [eventId, roundId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/events/:eventId/rounds/:roundId/candidate-pool', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId } = req.params;
    const { contestantIds, reason = 'Updated custom candidate pool.' } = req.body;

    if (!Array.isArray(contestantIds)) {
      return res.status(400).json({ error: 'contestantIds must be an array.' });
    }

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (!event.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found.' });
    }

    const before = await client.query('SELECT * FROM round_candidate_pool WHERE event_id = $1 AND round_id = $2', [eventId, roundId]);

    await client.query('DELETE FROM round_candidate_pool WHERE event_id = $1 AND round_id = $2', [eventId, roundId]);

    for (const contestantId of contestantIds) {
      await client.query(`
        INSERT INTO round_candidate_pool (event_id, round_id, contestant_id)
        VALUES ($1, $2, $3)
      `, [eventId, roundId, contestantId]);
    }

    await client.query(`
      UPDATE event_rounds
      SET candidate_pool_mode = 'custom_pool', updated_at = NOW()
      WHERE event_id = $1 AND id = $2
    `, [eventId, roundId]);

    const after = await client.query('SELECT * FROM round_candidate_pool WHERE event_id = $1 AND round_id = $2', [eventId, roundId]);

    await writeAudit(client, {
      organizationId: event.rows[0].organization_id,
      eventId,
      actorRole: 'admin',
      actionType: 'round_candidate_pool_updated',
      targetType: 'round',
      targetId: roundId,
      oldValue: before.rows,
      newValue: after.rows,
      reason,
      req
    });

    await client.query('COMMIT');

    res.json({ ok: true, candidatePool: after.rows });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/events/:eventId/rounds/:roundId/candidate-pool', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId, roundId } = req.params;
    const reason = requireReason(req);

    await client.query('BEGIN');

    const event = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);

    if (!event.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found.' });
    }

    const before = await client.query('SELECT * FROM round_candidate_pool WHERE event_id = $1 AND round_id = $2', [eventId, roundId]);

    await client.query('DELETE FROM round_candidate_pool WHERE event_id = $1 AND round_id = $2', [eventId, roundId]);

    await client.query(`
      UPDATE event_rounds
      SET candidate_pool_mode = 'all_contestants', updated_at = NOW()
      WHERE event_id = $1 AND id = $2
    `, [eventId, roundId]);

    await writeAudit(client, {
      organizationId: event.rows[0].organization_id,
      eventId,
      actorRole: 'admin',
      actionType: 'round_candidate_pool_cleared',
      targetType: 'round',
      targetId: roundId,
      oldValue: before.rows,
      reason,
      req
    });

    await client.query('COMMIT');

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.statusCode || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/events/:eventId/export/printable-results', async (req, res) => {
  const client = await pool.connect();

  try {
    const { eventId } = req.params;
    const context = await loadEventContext({ query: client.query.bind(client) }, eventId);

    if (!context) {
      return res.status(404).send('Event not found.');
    }

    const rounds = buildRoundResults(context);
    const overall = buildOverallResults(rounds);
    const generatedAt = new Date().toISOString();

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${context.event.title} Results</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
    h1, h2 { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0 28px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    footer { margin-top: 40px; color: #6b7280; font-size: 12px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Print / Save PDF</button>
  <h1>${context.event.title}</h1>
  <p>${context.event.organization_name || ''}</p>
  <p>Generated: ${generatedAt}</p>

  <h2>Overall Results</h2>
  <table>
    <thead><tr><th>Rank</th><th>#</th><th>Contestant</th><th>Total</th></tr></thead>
    <tbody>
      ${overall.map((row) => `<tr><td>${row.rank}</td><td>${row.contestant_number}</td><td>${row.name}</td><td>${Number(row.total).toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>

  ${rounds.map(({ round, results }) => `
    <h2>${round.name}</h2>
    <table>
      <thead><tr><th>Rank</th><th>#</th><th>Contestant</th><th>Total</th></tr></thead>
      <tbody>
        ${results.map((row) => `<tr><td>${row.rank}</td><td>${row.contestant_number}</td><td>${row.name}</td><td>${Number(row.total).toFixed(2)}</td></tr>`).join('')}
      </tbody>
    </table>
  `).join('')}

  <footer>
    ${context.event.prepared_by_text || ''}<br>
    ${context.event.pdf_footer || ''}
  </footer>
</body>
</html>`;

    await client.query(`
      INSERT INTO pdf_exports (event_id, export_type, title, footer_text, prepared_by_text, metadata)
      VALUES ($1, 'printable_html_results', $2, $3, $4, $5)
    `, [
      eventId,
      `${context.event.title} Printable Results`,
      context.event.pdf_footer || '',
      context.event.prepared_by_text || '',
      JSON.stringify({ generatedAt, mode: 'html_printable' })
    ]);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    client.release();
  }
});

module.exports = router;
