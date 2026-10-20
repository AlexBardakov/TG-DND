import { sql } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { type User, users } from './db/schema.js';

/** The fields shared by a Bot API `User` and the `user` of Mini App init data. */
export interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

/**
 * Creates or refreshes the user from Telegram data. Ids listed in
 * ADMIN_TG_IDS become admins; nobody is demoted here.
 */
export function upsertUser(db: Db, tg: TgUser, adminTgIds: ReadonlySet<number>): User {
  const isListedAdmin = adminTgIds.has(tg.id);
  const profile = {
    username: tg.username ?? null,
    firstName: tg.first_name,
    lastName: tg.last_name ?? null,
  };
  return db
    .insert(users)
    .values({ tgId: tg.id, ...profile, isAdmin: isListedAdmin })
    .onConflictDoUpdate({
      target: users.tgId,
      set: {
        ...profile,
        ...(isListedAdmin ? { isAdmin: true } : {}),
        updatedAt: sql`(unixepoch())`,
      },
    })
    .returning()
    .get();
}
