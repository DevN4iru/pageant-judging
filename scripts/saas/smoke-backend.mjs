const API = process.env.API || 'http://localhost:3001';

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(`${path}: ${data?.error || response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

function log(step) {
  console.log(`✓ ${step}`);
}

const events = await request('/api/saas/events');
if (!events.length) throw new Error('No SaaS events found.');

const eventId = events[0].id;
log(`using event ${eventId}`);

const builder = await request(`/api/saas/events/${eventId}/builder`);
if (!builder.judges.length) throw new Error('No judges found.');
if (!builder.contestants.length) throw new Error('No contestants found.');
if (!builder.rounds.length) throw new Error('No rounds found.');

const judge = builder.judges[0];
const round = builder.rounds[0];
const criterion = round.criteria[0];
const contestant = builder.contestants[0];

await request(`/api/saas/events/${eventId}/judges/${judge.id}/credentials`, {
  method: 'POST',
  body: JSON.stringify({ pin: '99999' })
});
log('judge credential reset');

const login = await request(`/api/saas/events/${eventId}/judge-login`, {
  method: 'POST',
  body: JSON.stringify({ pin: '99999' })
});
log(`judge login ${login.judge.name}`);

await request(`/api/saas/events/${eventId}/scoring/${judge.id}/scores`, {
  method: 'POST',
  body: JSON.stringify({
    roundId: round.id,
    criterionId: criterion.id,
    contestantId: contestant.id,
    score: 88
  })
});
log('score save accepted');

try {
  await request(`/api/saas/events/${eventId}/scoring/${judge.id}/rounds/${round.id}/submit`, {
    method: 'POST'
  });
  console.log('ℹ submit accepted; scorecard may already be complete.');
} catch (err) {
  if (err.status === 400 && String(err.message).includes('incomplete')) {
    log('incomplete submit blocked');
  } else {
    throw err;
  }
}

const results = await request(`/api/saas/events/${eventId}/scoring-results`);
if (!results.overall) throw new Error('Results missing overall ranking.');
log('results endpoint works');

const audit = await request(`/api/saas/events/${eventId}/audit-logs`);
if (!Array.isArray(audit)) throw new Error('Audit logs endpoint failed.');
log('audit endpoint works');

console.log('SAAS_BACKEND_SMOKE_OK');
