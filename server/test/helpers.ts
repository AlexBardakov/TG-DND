import { createHmac } from 'node:crypto';
import type { UserFromGetMe } from 'grammy/types';
import { type Config, loadConfig } from '../src/config.js';

export const BOT_TOKEN = '123456:test-token';

export const botInfo = {
  id: 123456,
  is_bot: true,
  first_name: 'Test',
  username: 'test_bot',
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
} as UserFromGetMe;

export function testConfig(env: Record<string, string> = {}): Config {
  return loadConfig({
    BOT_TOKEN,
    MINI_APP_URL: 'https://dnd.example.test/',
    WEB_DIST_PATH: '/nonexistent',
    ...env,
  });
}

/** Signs init data the way Telegram does for a Mini App. */
export function signInitData(fields: Record<string, string>, botToken = BOT_TOKEN): string {
  const dataCheckString = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

export function initDataFor(
  user: { id: number; first_name: string; username?: string },
  authDate = Math.floor(Date.now() / 1000),
): string {
  return signInitData({
    auth_date: String(authDate),
    query_id: 'AAH-test',
    user: JSON.stringify(user),
  });
}
