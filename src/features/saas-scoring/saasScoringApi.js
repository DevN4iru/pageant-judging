async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data;
}

export function getEvents() {
  return request('/api/saas/events');
}

export function judgeLogin(eventId, pin) {
  return request(`/api/saas/events/${eventId}/judge-login`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  });
}

export function getJudgeDesk(eventId, judgeId) {
  return request(`/api/saas/events/${eventId}/scoring/${judgeId}/desk`);
}

export function saveScore(eventId, judgeId, payload) {
  return request(`/api/saas/events/${eventId}/scoring/${judgeId}/scores`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function submitRound(eventId, judgeId, roundId) {
  return request(`/api/saas/events/${eventId}/scoring/${judgeId}/rounds/${roundId}/submit`, {
    method: 'POST'
  });
}

export function getScoringResults(eventId) {
  return request(`/api/saas/events/${eventId}/scoring-results`);
}
