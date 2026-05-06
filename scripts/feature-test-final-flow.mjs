import { spawn } from 'node:child_process';

const PORT = Number(process.env.FEATURE_TEST_PORT || 3099);
const BASE = `http://127.0.0.1:${PORT}`;
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_PIN = process.env.ADMIN_PIN || '9999';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for feature test.');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function expectHttpError(path, options, expectedStatus, includesText) {
  try {
    await request(path, options);
  } catch (err) {
    assert(err.status === expectedStatus, `${path} expected HTTP ${expectedStatus}, got ${err.status}`);
    if (includesText) {
      assert(String(err.message).includes(includesText), `${path} error should include "${includesText}", got "${err.message}"`);
    }
    return;
  }

  throw new Error(`${path} should have failed with HTTP ${expectedStatus}`);
}

async function waitForApi() {
  const started = Date.now();

  while (Date.now() - started < 12000) {
    try {
      const health = await request('/api/health');
      if (health.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error('API did not become ready.');
}

function startApi() {
  const child = spawn(process.execPath, ['api/index.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL,
      ADMIN_PIN
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[api] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[api:err] ${chunk}`));

  return child;
}

async function main() {
  const apiProcess = startApi();

  try {
    await waitForApi();

    console.log('✓ API health');

    await request('/api/admin/login', {
      method: 'POST',
      body: { pin: ADMIN_PIN }
    });
    console.log('✓ Admin login');

    await expectHttpError('/api/admin/login', {
      method: 'POST',
      body: { pin: 'wrong' }
    }, 401, 'Invalid admin PIN');
    console.log('✓ Bad admin PIN rejected');

    const setup = await request('/api/setup');
    assert(setup.contestants.length === 8, 'Expected 8 contestants');
    assert(setup.criteria.length === 5, 'Expected 5 official pre-final criteria');

    const weightTotal = setup.criteria.reduce((sum, cr) => sum + Number(cr.weight), 0);
    assert(Math.abs(weightTotal - 1) < 0.00001, `Pre-final weights should total 1.00, got ${weightTotal}`);
    console.log('✓ Official criteria weights total 1.00');

    const beforeReady = await request('/api/final/readiness');
    assert(beforeReady.ready === false, 'Final Interview should be locked before pre-final submissions');
    assert(beforeReady.submitted_judges === 0, 'Expected 0 pre-final submissions at start');

    const finalSetupBefore = await request('/api/final/setup');
    assert(finalSetupBefore.ready === false, 'Final setup should not be ready before pre-final submissions');
    assert(finalSetupBefore.contestants.length === 0, 'Final setup should not expose fake Top 3 before lock');
    console.log('✓ Final Interview locked before Top 3 is official');

    await expectHttpError('/api/final/scores', {
      method: 'POST',
      body: {
        judgeId: 1,
        contestantId: setup.contestants[0].id,
        criteriaKey: 'beauty_poise',
        score: 90
      }
    }, 423, 'Final Interview is locked');
    console.log('✓ Final scoring blocked before pre-final lock');

    const judgePins = ['1111', '2222', '3333', '4444', '5555'];
    const judgeIds = [];

    for (const pin of judgePins) {
      const login = await request('/api/judge/login', {
        method: 'POST',
        body: { pin }
      });

      judgeIds.push(login.judge.id);
    }

    assert(judgeIds.length === 5, 'Expected 5 judge logins');
    console.log('✓ Judge login for all 5 judges');

    const rawScoreByCandidateNumber = new Map([
      [1, 70],
      [2, 74],
      [3, 78],
      [4, 82],
      [5, 86],
      [6, 91],
      [7, 95],
      [8, 99]
    ]);

    for (const judgeId of judgeIds) {
      for (const contestant of setup.contestants) {
        for (const criterion of setup.criteria) {
          await request('/api/scores', {
            method: 'POST',
            body: {
              judgeId,
              contestantId: contestant.id,
              criteriaId: criterion.id,
              score: rawScoreByCandidateNumber.get(contestant.number)
            }
          });
        }
      }

      await request(`/api/judge/${judgeId}/submit`, {
        method: 'POST'
      });
    }

    console.log('✓ Pre-final scores saved and all judges submitted');

    const preFinalResults = await request('/api/results');
    assert(preFinalResults[0].number === 8, `Expected Candidate 8 as pre-final rank 1, got Candidate ${preFinalResults[0]?.number}`);
    assert(preFinalResults[1].number === 7, `Expected Candidate 7 as pre-final rank 2, got Candidate ${preFinalResults[1]?.number}`);
    assert(preFinalResults[2].number === 6, `Expected Candidate 6 as pre-final rank 3, got Candidate ${preFinalResults[2]?.number}`);
    console.log('✓ Pre-final Top 3 ranking correct');

    const afterReady = await request('/api/final/readiness');
    assert(afterReady.ready === true, 'Final Interview should open after all pre-final judges submit');
    assert(afterReady.submitted_judges === 5, 'Expected 5 submitted pre-final judges');
    assert(afterReady.top_three.map((c) => c.number).join(',') === '8,7,6', 'Expected Top 3 numbers 8,7,6');
    console.log('✓ Final Interview opens only after official Top 3');

    const finalSetup = await request('/api/final/setup');
    assert(finalSetup.ready === true, 'Final setup should be ready');
    assert(finalSetup.contestants.length === 3, 'Final setup should expose exactly 3 contestants');

    const candidateOne = setup.contestants.find((c) => c.number === 1);
    await expectHttpError('/api/final/scores', {
      method: 'POST',
      body: {
        judgeId: judgeIds[0],
        contestantId: candidateOne.id,
        criteriaKey: 'beauty_poise',
        score: 95
      }
    }, 400, 'Top 3');
    console.log('✓ Non-Top-3 final scoring rejected');

    const finalScoresByCandidateNumber = new Map([
      [8, { beauty_poise: 88, wit_intelligence_answer: 86 }],
      [7, { beauty_poise: 92, wit_intelligence_answer: 90 }],
      [6, { beauty_poise: 100, wit_intelligence_answer: 100 }]
    ]);

    for (const judgeId of judgeIds) {
      for (const contestant of finalSetup.contestants) {
        const finalScoreSet = finalScoresByCandidateNumber.get(contestant.number);

        for (const criterion of finalSetup.criteria) {
          await request('/api/final/scores', {
            method: 'POST',
            body: {
              judgeId,
              contestantId: contestant.id,
              criteriaKey: criterion.key,
              score: finalScoreSet[criterion.key]
            }
          });
        }
      }

      await request(`/api/final/judge/${judgeId}/submit`, {
        method: 'POST'
      });
    }

    console.log('✓ Final Interview scores saved and all judges submitted');

    const finalResults = await request('/api/final/results');
    assert(finalResults.length === 3, 'Expected 3 final result rows');
    assert(finalResults[0].number === 6, `Expected Candidate 6 final winner, got Candidate ${finalResults[0]?.number}`);
    assert(Number(finalResults[0].final_score).toFixed(2) === '100.00', `Expected Candidate 3 final score 100.00, got ${finalResults[0]?.final_score}`);

    const finalStatuses = await request('/api/final/judges/status');
    assert(finalStatuses.filter((j) => j.submitted_at).length === 5, 'Expected all 5 final judges submitted');

    const finalDetails = await request('/api/final/details');
    assert(finalDetails.length === 30, `Expected 30 final detail rows, got ${finalDetails.length}`);

    console.log('✓ Final ranking, lock status, and detail rows correct');
    console.log('');
    console.log('ALL FEATURE TESTS PASSED');
  } finally {
    apiProcess.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('');
  console.error('FEATURE TEST FAILED');
  console.error(err);
  process.exit(1);
});
