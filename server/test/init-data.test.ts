import { describe, expect, it } from 'vitest';
import { validateInitData } from '../src/api/init-data.js';
import { BOT_TOKEN, initDataFor, signInitData } from './helpers.js';

const user = { id: 42, first_name: 'Иван', username: 'ivan' };

describe('validateInitData', () => {
  it('accepts data signed with the bot token', () => {
    const result = validateInitData(initDataFor(user), BOT_TOKEN);
    expect(result?.user).toEqual({ id: 42, first_name: 'Иван', username: 'ivan', last_name: undefined });
  });

  it('rejects data signed with another token', () => {
    expect(validateInitData(initDataFor(user), '999:other-token')).toBeNull();
  });

  it('rejects tampered fields', () => {
    const raw = initDataFor(user).replace('%22ivan%22', '%22mallory%22');
    expect(validateInitData(raw, BOT_TOKEN)).toBeNull();
  });

  it('rejects data without a hash', () => {
    const raw = new URLSearchParams(initDataFor(user));
    raw.delete('hash');
    expect(validateInitData(raw.toString(), BOT_TOKEN)).toBeNull();
  });

  it('rejects stale data', () => {
    const dayAndMinuteAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60 - 60;
    expect(validateInitData(initDataFor(user, dayAndMinuteAgo), BOT_TOKEN)).toBeNull();
  });

  it('sorts fields by key, not by the joined pair', () => {
    // "a" < "a1" by key, but "a1=…" < "a=…" as strings because "1" < "=".
    const raw = signInitData({
      a: 'x',
      a1: 'y',
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify(user),
    });
    expect(validateInitData(raw, BOT_TOKEN)).not.toBeNull();
  });

  it('passes the start parameter through', () => {
    const raw = signInitData({
      auth_date: String(Math.floor(Date.now() / 1000)),
      start_param: 'c_17',
      user: JSON.stringify(user),
    });
    expect(validateInitData(raw, BOT_TOKEN)?.startParam).toBe('c_17');
  });
});
