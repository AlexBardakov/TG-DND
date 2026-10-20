import { Bot, InlineKeyboard } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { upsertUser } from '../users.js';

const WELCOME_TEXT = [
  'Привет! Здесь клуб собирает партии для настольных ролевых игр.',
  'До первой встречи вы общаетесь с будущей партией анонимно, под псевдонимом.',
  'Откройте каталог и выберите игру.',
].join('\n');

/** The bot players start with: welcome, Mini App entry and, later, reminders. */
export function createMainBot(config: Config, db: Db, botInfo?: UserFromGetMe): Bot {
  const bot = new Bot(config.botToken, botInfo ? { botInfo } : undefined);
  const privateChats = bot.chatType('private');

  privateChats.command('start', async (ctx) => {
    upsertUser(db, ctx.from, config.adminTgIds);
    await ctx.reply(WELCOME_TEXT, {
      reply_markup: new InlineKeyboard().webApp('Выбрать игру', config.miniAppUrl),
    });
  });

  return bot;
}

/** Sets what users see in the chat with the bot before the first message. */
export async function configureMainBot(bot: Bot, config: Config): Promise<void> {
  await bot.api.setMyCommands([{ command: 'start', description: 'Открыть каталог игр' }]);
  await bot.api.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Игры', web_app: { url: config.miniAppUrl } },
  });
}
