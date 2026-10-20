import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyRequest } from 'fastify';
import { type Bot, webhookCallback } from 'grammy';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { upsertUser } from '../users.js';
import { type InitData, validateInitData } from './init-data.js';

// Same relative path from src/api and dist/api.
const defaultWebDist = fileURLToPath(new URL('../../../web/dist', import.meta.url));

export interface ServerDeps {
  config: Config;
  db: Db;
  bot: Bot;
  logger?: boolean;
}

export function buildServer({ config, db, bot, logger = true }: ServerDeps) {
  const app = Fastify({ logger });

  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/me', async (request, reply) => {
    const initData = readInitData(request, config.botToken);
    if (!initData) return reply.code(401).send({ error: 'unauthorized' });
    const user = upsertUser(db, initData.user, config.adminTgIds);
    return {
      id: user.id,
      firstName: user.firstName,
      username: user.username,
      isGm: user.isGm,
      isAdmin: user.isAdmin,
    };
  });

  if (config.botMode === 'webhook') {
    app.post(
      '/webhook/main',
      webhookCallback(bot, 'fastify', { secretToken: config.webhookSecret }),
    );
  }

  const webDist = resolve(config.webDistPath ?? defaultWebDist);
  if (existsSync(webDist)) {
    app.register(fastifyStatic, { root: webDist });
    // The Mini App is a single page: unknown non-API paths get its index.
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith('/api/')
        ? reply.code(404).send({ error: 'not found' })
        : reply.sendFile('index.html'),
    );
  }

  return app;
}

/** Mini App requests carry init data as `Authorization: tma <initData>`. */
function readInitData(request: FastifyRequest, botToken: string): InitData | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('tma ')) return null;
  return validateInitData(header.slice('tma '.length), botToken);
}
