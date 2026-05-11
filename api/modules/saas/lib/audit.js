async function writeAudit(client, {
  organizationId,
  eventId,
  actorUserId = null,
  actorJudgeId = null,
  actorRole = 'admin',
  actionType,
  targetType,
  targetId,
  oldValue = null,
  newValue = null,
  reason = null,
  req = null
}) {
  await client.query(`
    INSERT INTO audit_logs (
      organization_id,
      event_id,
      actor_user_id,
      actor_judge_id,
      actor_role,
      action_type,
      target_type,
      target_id,
      old_value,
      new_value,
      reason,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    organizationId,
    eventId,
    actorUserId,
    actorJudgeId,
    actorRole,
    actionType,
    targetType,
    targetId === undefined || targetId === null ? null : String(targetId),
    oldValue === null ? null : JSON.stringify(oldValue),
    newValue === null ? null : JSON.stringify(newValue),
    reason,
    req?.ip || null,
    req?.headers?.['user-agent'] || null
  ]);
}

module.exports = {
  writeAudit
};
