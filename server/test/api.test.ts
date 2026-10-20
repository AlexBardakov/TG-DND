import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/api/server.js';
import { createMainBot } from '../src/bot/main-bot.js';
import { openDb } from '../src/db/client.js';
import { users } from '../src/db/schema.js';
import { botInfo, initDataFor, testConfig } from './helpers.js';

function setup(env: Record<string, string> = {}) {
  const config = testConfig(env);
  const db = openDb(':memory:');
  const bot = createMainBot(config, db, botInfo);
  const app = buildServer({ config, db, bot, logger: false });
  return { app, db };
}

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

describe('API', () => {
  it('reports health', async () => {
    const { app } = setup();
    close = () => app.close();
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('refuses /api/me without init data', async () => {
    const { app } = setup();
    close = () => app.close();
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    expect(response.statusCode).toBe(401);
  });

  it('refuses /api/me with forged init data', async () => {
    const { app } = setup();
    close = () => app.close();
    const forged = initDataFor({ id: 7, first_name: 'Eve' }).replace(/hash=[0-9a-f]+/, `hash=${'0'.repeat(64)}`);
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `tma ${forged}` },
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns and stores the Mini App user', async () => {
    const { app, db } = setup();
    close = () => app.close();
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `tma ${initDataFor({ id: 42, first_name: 'Иван', username: 'ivan' })}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ firstName: 'Иван', username: 'ivan', isGm: false, isAdmin: false });
    expect(db.select().from(users).all()).toHaveLength(1);
  });

  it('makes users from ADMIN_TG_IDS admins', async () => {
    const { app } = setup({ ADMIN_TG_IDS: '42, 43' });
    close = () => app.close();
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `tma ${initDataFor({ id: 43, first_name: 'Анна' })}` },
    });
    expect(response.json()).toMatchObject({ isAdmin: true });
  });

  it('accepts webhook updates only with the secret token', async () => {
    const { app } = setup({
      BOT_MODE: 'webhook',
      PUBLIC_URL: 'https://dnd.example.test',
      WEBHOOK_SECRET: 'secret_123',
    });
    close = () => app.close();
    const update = { update_id: 1 };
    const withoutSecret = await app.inject({ method: 'POST', url: '/webhook/main', payload: update });
    expect(withoutSecret.statusCode).toBe(401);
    const withSecret = await app.inject({
      method: 'POST',
      url: '/webhook/main',
      payload: update,
      headers: { 'x-telegram-bot-api-secret-token': 'secret_123' },
    });
    expect(withSecret.statusCode).toBe(200);
  });
});
