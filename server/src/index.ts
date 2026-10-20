import { buildServer } from './api/server.js';
import { configureMainBot, createMainBot } from './bot/main-bot.js';
import { loadConfig } from './config.js';
import { openDb } from './db/client.js';

const config = loadConfig();
const db = openDb(config.databasePath);
const bot = createMainBot(config, db);
const app = buildServer({ config, db, bot });

bot.catch((err) => {
  app.log.error({ err: err.error, updateId: err.ctx.update.update_id }, 'Bot update failed');
});

await bot.init();
await configureMainBot(bot, config);
await app.listen({ port: config.port, host: '0.0.0.0' });

if (config.botMode === 'webhook') {
  await bot.api.setWebhook(`${config.publicUrl}/webhook/main`, {
    secret_token: config.webhookSecret,
  });
  app.log.info(`Webhook set for @${bot.botInfo.username}`);
} else {
  void bot.start({ onStart: (me) => app.log.info(`Polling updates for @${me.username}`) });
}

async function shutdown(): Promise<void> {
  if (bot.isRunning()) await bot.stop();
  await app.close();
  db.$client.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
