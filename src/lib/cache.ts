// Lazy singleton — avoids crash at module init when KV env vars are missing
let _kv: import('@vercel/kv').VercelKV | null | undefined;

async function getKv(): Promise<import('@vercel/kv').VercelKV | null> {
  if (_kv !== undefined) return _kv;
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    _kv = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@vercel/kv') as { kv: import('@vercel/kv').VercelKV };
    _kv = mod.kv;
  } catch {
    _kv = null;
  }
  return _kv;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return (await (await getKv())?.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await (await getKv())?.set(key, value, { ex: ttlSeconds });
  } catch {
    // fail silent — cache is opportunistic
  }
}

export async function kvDel(key: string): Promise<void> {
  try {
    await (await getKv())?.del(key);
  } catch {}
}

export async function kvLPush<T>(listKey: string, value: T, maxLen = 200): Promise<void> {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.lpush(listKey, JSON.stringify(value));
    await kv.ltrim(listKey, 0, maxLen - 1);
  } catch {}
}

export async function kvLRange<T>(listKey: string, start = 0, end = -1): Promise<T[]> {
  try {
    const kv = await getKv();
    if (!kv) return [];
    const items = await kv.lrange<string>(listKey, start, end);
    return items.map((i) => (typeof i === 'string' ? JSON.parse(i) : i));
  } catch {
    return [];
  }
}
