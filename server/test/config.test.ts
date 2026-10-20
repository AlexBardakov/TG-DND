import { describe, expect, it } from 'vitest';
import { testConfig } from './helpers.js';

describe('loadConfig', () => {
  it('defaults to polling and parses admin ids', () => {
    const config = testConfig({ ADMIN_TG_IDS: ' 1, 22 ,,333' });
    expect(config.botMode).toBe('polling');
    expect([...config.adminTgIds]).toEqual([1, 22, 333]);
  });

  it('requires a public URL and secret for webhooks', () => {
    expect(() => testConfig({ BOT_MODE: 'webhook' })).toThrow(/PUBLIC_URL and WEBHOOK_SECRET/);
  });

  it('rejects a webhook secret Telegram would not accept', () => {
    expect(() =>
      testConfig({ BOT_MODE: 'webhook', PUBLIC_URL: 'https://x.test', WEBHOOK_SECRET: 'has spaces' }),
    ).toThrow(/WEBHOOK_SECRET/);
  });

  it('drops a trailing slash from the public URL', () => {
    const config = testConfig({ BOT_MODE: 'webhook', PUBLIC_URL: 'https://x.test/', WEBHOOK_SECRET: 's' });
    expect(config.publicUrl).toBe('https://x.test');
  });
});
