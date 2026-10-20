export interface Me {
  id: number;
  firstName: string;
  username: string | null;
  isGm: boolean;
  isAdmin: boolean;
}

export class NotInTelegramError extends Error {}

async function request<T>(path: string): Promise<T> {
  const initData = window.Telegram?.WebApp.initData;
  if (!initData) throw new NotInTelegramError();
  const response = await fetch(path, { headers: { authorization: `tma ${initData}` } });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

export const fetchMe = () => request<Me>('/api/me');
