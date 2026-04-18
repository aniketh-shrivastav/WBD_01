const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false";

let client;
let connectPromise;

function isReady() {
  return Boolean(client && client.isReady);
}

async function getClient() {
  if (!REDIS_ENABLED) return null;

  if (!client) {
    client = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 2000),
        reconnectStrategy: () => false,
      },
    });
    client.on("error", () => {
      // Keep request flow resilient when Redis is unavailable.
    });
  }

  if (!client.isReady) {
    if (!connectPromise) {
      connectPromise = client.connect().catch(() => null);
    }
    await connectPromise;
  }

  if (!client.isReady) {
    return null;
  }

  return client;
}

async function getJson(key) {
  const c = await getClient();
  if (!c) return null;

  const raw = await c.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setJson(key, value, ttlSeconds = 60) {
  const c = await getClient();
  if (!c) return false;

  const payload = JSON.stringify(value);
  await c.set(key, payload, { EX: ttlSeconds });
  return true;
}

async function deleteKey(key) {
  const c = await getClient();
  if (!c) return 0;
  return c.del(key);
}

async function deleteByPattern(pattern) {
  const c = await getClient();
  if (!c) return 0;

  let cursor = 0;
  let deleted = 0;

  do {
    const result = await c.scan(cursor, { MATCH: pattern, COUNT: 200 });
    cursor = Number(result.cursor);
    const keys = result.keys || [];
    if (keys.length) {
      deleted += await c.del(keys);
    }
  } while (cursor !== 0);

  return deleted;
}

async function withCache(key, ttlSeconds, fetcher, options = {}) {
  const bypass = Boolean(options.bypassCache);

  if (!bypass) {
    const cached = await getJson(key);
    if (cached !== null) {
      return { data: cached, cacheHit: true };
    }
  }

  const fresh = await fetcher();
  if (!bypass) {
    await setJson(key, fresh, ttlSeconds);
  }

  return { data: fresh, cacheHit: false };
}

async function closeClient() {
  if (!client) return;
  try {
    if (client.isOpen) {
      await client.quit();
    }
  } catch {
    // Ignore close errors in shutdown path.
  } finally {
    client = null;
    connectPromise = null;
  }
}

module.exports = {
  isReady,
  getClient,
  getJson,
  setJson,
  deleteKey,
  deleteByPattern,
  withCache,
  closeClient,
};
