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
