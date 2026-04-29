import { kv } from '@vercel/kv';

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch {
    return null; // fail open
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await kv.set(key, value, { ex: ttlSeconds });
  } catch {
    // fail silent — cache is opportunistic
  }
}

export async function kvDel(key: string): Promise<void> {
  try {
    await kv.del(key);
  } catch {}
}

export async function kvLPush<T>(listKey: string, value: T, maxLen = 200): Promise<void> {
  try {
    await kv.lpush(listKey, JSON.stringify(value));
    await kv.ltrim(listKey, 0, maxLen - 1);
  } catch {}
}

export async function kvLRange<T>(listKey: string, start = 0, end = -1): Promise<T[]> {
  try {
    const items = await kv.lrange<string>(listKey, start, end);
    return items.map((i) => (typeof i === 'string' ? JSON.parse(i) : i));
  } catch {
    return [];
  }
}
