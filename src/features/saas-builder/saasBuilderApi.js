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

export function getTemplates() {
  return request('/api/saas/templates');
}

export function getEvents() {
  return request('/api/saas/events');
}

export function getBuilder(eventId) {
  return request(`/api/saas/events/${eventId}/builder`);
}

export function getAuditLogs(eventId) {
  return request(`/api/saas/events/${eventId}/audit-logs`);
}

export function updateEventSettings(eventId, payload) {
  return request(`/api/saas/events/${eventId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function createContestant(eventId, payload) {
  return request(`/api/saas/events/${eventId}/contestants`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateContestant(eventId, contestantId, payload) {
  return request(`/api/saas/events/${eventId}/contestants/${contestantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deleteContestant(eventId, contestantId) {
  return request(`/api/saas/events/${eventId}/contestants/${contestantId}`, {
    method: 'DELETE'
  });
}

export function createJudge(eventId, payload) {
  return request(`/api/saas/events/${eventId}/judges`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateJudge(eventId, judgeId, payload) {
  return request(`/api/saas/events/${eventId}/judges/${judgeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deleteJudge(eventId, judgeId) {
  return request(`/api/saas/events/${eventId}/judges/${judgeId}`, {
    method: 'DELETE'
  });
}

export function setJudgePin(eventId, judgeId, pin) {
  return request(`/api/saas/events/${eventId}/judges/${judgeId}/credentials`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  });
}

export function createRound(eventId, payload) {
  return request(`/api/saas/events/${eventId}/rounds`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateRound(eventId, roundId, payload) {
  return request(`/api/saas/events/${eventId}/rounds/${roundId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deleteRound(eventId, roundId) {
  return request(`/api/saas/events/${eventId}/rounds/${roundId}`, {
    method: 'DELETE'
  });
}

export function createCriterion(eventId, roundId, payload) {
  return request(`/api/saas/events/${eventId}/rounds/${roundId}/criteria`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCriterion(eventId, roundId, criterionId, payload) {
  return request(`/api/saas/events/${eventId}/rounds/${roundId}/criteria/${criterionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function deleteCriterion(eventId, roundId, criterionId) {
  return request(`/api/saas/events/${eventId}/rounds/${roundId}/criteria/${criterionId}`, {
    method: 'DELETE'
  });
}

export function getScoringMonitor(eventId) {
  return request(`/api/saas/events/${eventId}/monitor`);
}

export function getResultSnapshots(eventId) {
  return request(`/api/saas/events/${eventId}/result-snapshots`);
}

export function createResultSnapshot(eventId, payload) {
  return request(`/api/saas/events/${eventId}/result-snapshots`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getDisplaySettings(eventId) {
  return request(`/api/saas/events/${eventId}/display-settings`);
}

export function updateDisplaySettings(eventId, payload) {
  return request(`/api/saas/events/${eventId}/display-settings`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function getPdfExports(eventId) {
  return request(`/api/saas/events/${eventId}/pdf-exports`);
}

export function createPdfExport(eventId, payload) {
  return request(`/api/saas/events/${eventId}/pdf-exports`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
