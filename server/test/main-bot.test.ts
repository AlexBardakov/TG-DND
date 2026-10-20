import type { Update } from 'grammy/types';
import { describe, expect, it } from 'vitest';
import { createMainBot } from '../src/bot/main-bot.js';
import { openDb } from '../src/db/client.js';
import { users } from '../src/db/schema.js';
import { botInfo, testConfig } from './helpers.js';

function startUpdate(chatType: 'private' | 'group'): Update {
  const from = { id: 42, is_bot: false, first_name: 'Иван', username: 'ivan' };
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat:
        chatType === 'private'
          ? { id: 42, type: 'private', first_name: 'Иван' }
          : { id: -100, type: 'group', title: 'Group' },
      from,
      text: '/start',
      entities: [{ type: 'bot_command', offset: 0, length: 6 }],
    },
  };
}

function setup() {
  const config = testConfig();
  const db = openDb(':memory:');
  const bot = createMainBot(config, db, botInfo);
  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as never;
  });
  return { bot, db, calls };
}

describe('main bot /start', () => {
  it('greets in a private chat with a Mini App button and stores the user', async () => {
    const { bot, db, calls } = setup();
    await bot.handleUpdate(startUpdate('private'));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('sendMessage');
    expect(calls[0]?.payload.reply_markup).toEqual({
      inline_keyboard: [[{ text: 'Выбрать игру', web_app: { url: 'https://dnd.example.test/' } }]],
    });
    expect(db.select().from(users).all()).toMatchObject([{ tgId: 42, firstName: 'Иван' }]);
  });

  it('ignores /start in groups', async () => {
    const { bot, db, calls } = setup();
    await bot.handleUpdate(startUpdate('group'));

    expect(calls).toHaveLength(0);
    expect(db.select().from(users).all()).toHaveLength(0);
  });
});
