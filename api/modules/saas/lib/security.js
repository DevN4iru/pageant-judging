const crypto = require('crypto');

const loginAttempts = new Map();

function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.pbkdf2Sync(String(secret), salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${digest}`;
}

function verifySecret(secret, stored) {
  if (!stored) return false;

  if (stored.startsWith('pbkdf2_sha256$')) {
    const [, iterationsRaw, salt, expected] = stored.split('$');
    const iterations = Number(iterationsRaw);
    const actual = crypto.pbkdf2Sync(String(secret), salt, iterations, 32, 'sha256').toString('hex');

    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  }

  // Backward compatibility for old local base64 PINs. New resets will replace these.
  const oldBase64 = Buffer.from(String(secret).trim()).toString('base64');
  return stored === oldBase64;
}

function rateLimitKey({ eventId, ip, pin }) {
  return `${eventId}:${ip || 'unknown'}:${String(pin || '').slice(0, 12)}`;
}

function assertJudgeLoginAllowed({ eventId, ip, pin }) {
  const key = rateLimitKey({ eventId, ip, pin });
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 12;
  const current = loginAttempts.get(key) || { count: 0, startedAt: now };

  if (now - current.startedAt > windowMs) {
    loginAttempts.set(key, { count: 1, startedAt: now });
    return;
  }

  current.count += 1;
  loginAttempts.set(key, current);

  if (current.count > maxAttempts) {
    const err = new Error('Too many PIN attempts. Wait a minute and try again.');
    err.statusCode = 429;
    throw err;
  }
}

module.exports = {
  hashSecret,
  verifySecret,
  assertJudgeLoginAllowed
};
