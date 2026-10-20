import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TgUser } from '../users.js';

export interface InitData {
  user: TgUser;
  authDate: Date;
  startParam?: string;
}

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Validates Mini App init data as described in
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * and returns it, or null when the signature is wrong or the data is stale.
 */
export function validateInitData(
  raw: string,
  botToken: string,
  { maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS, now = Date.now() } = {},
): InitData | null {
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest();
  if (!timingSafeEqual(Buffer.from(hash, 'hex'), expected)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isSafeInteger(authDate) || now / 1000 - authDate > maxAgeSeconds) return null;

  const user = parseUser(params.get('user'));
  if (!user) return null;

  return {
    user,
    authDate: new Date(authDate * 1000),
    startParam: params.get('start_param') ?? undefined,
  };
}

function parseUser(json: string | null): TgUser | null {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== 'object' || value === null) return null;
    const { id, first_name, last_name, username } = value as Record<string, unknown>;
    if (typeof id !== 'number' || typeof first_name !== 'string') return null;
    return {
      id,
      first_name,
      last_name: typeof last_name === 'string' ? last_name : undefined,
      username: typeof username === 'string' ? username : undefined,
    };
  } catch {
    return null;
  }
}
