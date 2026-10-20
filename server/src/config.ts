import { z } from 'zod';

const envSchema = z
  .object({
    BOT_TOKEN: z.string().min(1),
    MINI_APP_URL: z.url(),
    BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
    PUBLIC_URL: z.url().optional(),
    // Telegram allows only A-Z, a-z, 0-9, _ and - in a webhook secret token.
    WEBHOOK_SECRET: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,256}$/)
      .optional(),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_PATH: z.string().min(1).default('data/tg-dnd.sqlite'),
    ADMIN_TG_IDS: z.string().default(''),
    CLUB_TIMEZONE: z.string().default('Europe/Moscow'),
    WEB_DIST_PATH: z.string().optional(),
  })
  .refine((env) => env.BOT_MODE === 'polling' || (env.PUBLIC_URL && env.WEBHOOK_SECRET), {
    message: 'BOT_MODE=webhook requires PUBLIC_URL and WEBHOOK_SECRET',
  });

export interface Config {
  botToken: string;
  miniAppUrl: string;
  botMode: 'polling' | 'webhook';
  publicUrl?: string;
  webhookSecret?: string;
  port: number;
  databasePath: string;
  adminTgIds: ReadonlySet<number>;
  clubTimezone: string;
  webDistPath?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;
  return {
    botToken: e.BOT_TOKEN,
    miniAppUrl: e.MINI_APP_URL,
    botMode: e.BOT_MODE,
    publicUrl: e.PUBLIC_URL?.replace(/\/+$/, ''),
    webhookSecret: e.WEBHOOK_SECRET,
    port: e.PORT,
    databasePath: e.DATABASE_PATH,
    adminTgIds: parseIds(e.ADMIN_TG_IDS),
    clubTimezone: e.CLUB_TIMEZONE,
    webDistPath: e.WEB_DIST_PATH,
  };
}

function parseIds(list: string): Set<number> {
  const ids = new Set<number>();
  for (const part of list.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const id = Number(trimmed);
    if (!Number.isSafeInteger(id)) throw new Error(`Invalid Telegram id in ADMIN_TG_IDS: ${trimmed}`);
    ids.add(id);
  }
  return ids;
}
