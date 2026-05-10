import { Redis } from "@upstash/redis";

type CacheRecord<T> = {
  value: T;
  freshUntil: number;
  expiresAt: number;
};

const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const memory = new Map<string, CacheRecord<unknown>>();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function refreshInBackground<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  waitUntil?: (promise: Promise<unknown>) => void,
) {
  const run = async () => {
    console.info(`[cache] stale refresh started: ${key}`);
    const value = await fetcher();
    await setCached(key, ttlSeconds, value);
    console.info(`[cache] stale refresh finished: ${key}`);
  };
  const promise = run().catch(() => undefined);
  if (waitUntil) {
    waitUntil(promise);
  } else {
    void promise;
  }
}

async function setCached<T>(key: string, ttlSeconds: number, value: T) {
  const now = nowSeconds();
  const record: CacheRecord<T> = {
    value,
    freshUntil: now + Math.floor(ttlSeconds * 0.9),
    expiresAt: now + ttlSeconds,
  };
  if (redis) {
    await redis.set(key, record, { ex: ttlSeconds });
  } else {
    memory.set(key, record);
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  options: { waitUntil?: (promise: Promise<unknown>) => void } = {},
) {
  const now = nowSeconds();
  const record = redis
    ? await redis.get<CacheRecord<T>>(key)
    : (memory.get(key) as CacheRecord<T> | undefined);

  if (record && record.expiresAt > now) {
    if (record.freshUntil <= now) {
      refreshInBackground(key, ttlSeconds, fetcher, options.waitUntil);
    }
    return record.value;
  }

  const value = await fetcher();
  await setCached(key, ttlSeconds, value);
  return value;
}
