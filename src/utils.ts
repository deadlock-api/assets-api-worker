import type { Context } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export type Bindings = {
  ASSETS_BUCKET: R2Bucket;
  ASSETS_KV: KVNamespace;
  RATE_LIMITER: RateLimit;
};

export type BaseEnv = { Bindings: Bindings };

export class NotFound extends HTTPException {
  constructor(userMessage: string) {
    super(404, {
      message: userMessage,
      res: Response.json({ message: userMessage }),
    });
  }
}

export class InternalError extends HTTPException {
  constructor(userMessage: string) {
    super(500, {
      message: userMessage,
      res: Response.json({ message: userMessage }),
    });
  }
}

// JSON types
export type JsonPrimitive = string | number | boolean | null | undefined;
export type JsonList = Array<JsonValue>;
export type JsonValue = JsonObject | JsonList | JsonPrimitive;
export interface JsonObject {
  [k: string | number | symbol]: JsonValue;
}

const DEFAULT_TTL = 60 * 60 * 24 * 7;

/**
 * Middleware which fetches `assets-api-data/latest_version.txt` and sets the version in the context
 * Overrideable by query param `client_version`
 */
export const versionMiddleware = createMiddleware<
  BaseEnv & {
    Variables: {
      version: string;
    };
  }
>(async (c, next) => {
  const versionQ = c.req.query("client_version");
  let version: string;
  if (versionQ && Number.isInteger(Number.parseInt(versionQ))) {
    version = versionQ;
  } else {
    const key = "assets-api-data/latest_version.txt";

    version = (await getCachedFileKV(c, key)).trim();
  }

  c.set("version", version);
  await next();
});

/**
 * Middleware which fetches `language` from query param and sets it in the context, otherwise defaults to `english`
 */
export const languageMiddleware = createMiddleware<
  BaseEnv & {
    Variables: {
      language: string;
    };
  }
>(async (c, next) => {
  const language = c.req.query("language");
  if (language && language.length > 0) {
    c.set("language", language);
  } else {
    c.set("language", "english");
  }
  await next();
});

/**
 * Middleware which caches the response for 7 days
 * Cache key is the request URL + version + language
 */
export const cacheMiddleware = createMiddleware<
  BaseEnv & { Variables: { version?: string; language?: string } }
>(async (c, next) => {
  let key = c.req.url;

  const version = c.get("version");
  const language = c.get("language");
  if (version) {
    key += `--${version}`;
  }
  if (language) {
    key += `--${language}`;
  }

  const cached = await caches.default.match(key);
  if (cached) {
    console.log(`cache hit for ${key}`);
    return cached;
  }
  await next();

  c.res.headers.set("Cache-Control", `public, max-age=${DEFAULT_TTL}`);

  const res = c.res.clone();
  c.executionCtx.waitUntil(caches.default.put(key, res));
});

/**
 * Middleware which rate limits the request
 */
export const rateLimitMiddleware = createMiddleware<
  BaseEnv & { Variables: { version?: string; language?: string } }
>(async (c, next) => {
  const info = getConnInfo(c);
  const ip = info.remote.address;
  const { success } = await c.env.RATE_LIMITER.limit({
    key: `rate-limit:${ip}`,
  });
  if (!success) {
    return c.json(
      {
        message: "Too many requests",
      },
      429,
    );
  }
  await next();
});

/**
 * Fetches a versioned JSON file from the bucket
 */
export const getVersionedJsonFile = async <T extends JsonValue = JsonValue>(
  c: Context<BaseEnv & { Variables: { version: string } }>,
  path: string,
  return_unparsed = false,
): Promise<T | string> => {
  const version = c.get("version");
  const key = `assets-api-data/versions/${version}/${path}.json`;

  if (return_unparsed) return getCachedFileKV(c, key);
  return getCachedJsonFileKV(c, key);
};

/**
 * Fetches a versioned language'd JSON file from the bucket
 */
export const getVersionedLanguageJsonFile = async <T extends JsonValue = JsonValue>(
  c: Context<BaseEnv & { Variables: { version: string; language: string } }>,
  path: string,
  return_unparsed = false,
): Promise<T | string> => {
  const version = c.get("version");
  const language = c.get("language");
  const key = `assets-api-data/versions/${version}/${path}/${language}.json`;

  if (return_unparsed) return getCachedFileKV(c, key);
  return getCachedJsonFileKV(c, key);
};

/**
 * Helper function to fetch and cache a JSON file from the bucket
 */
export const getCachedJsonFileKV = async <T extends JsonValue = JsonValue>(
  c: Context,
  key: string,
): Promise<T> => {
  const cached = await c.env.ASSETS_KV.get(key);
  if (cached) {
    console.info(`KV cache hit for ${key}`);
    return JSON.parse(cached) as T;
  }
  const json = await getJsonFile(c, key);
  c.executionCtx.waitUntil(
    c.env.ASSETS_KV.put(key, JSON.stringify(json), { expirationTtl: DEFAULT_TTL }),
  );
  return json as T;
};

/**
 * Helper function to fetch and cache a JSON file from the bucket
 */
export const getJsonFile = async <T extends JsonValue = JsonValue>(
  c: Context,
  key: string,
): Promise<T> => {
  const obj = await c.env.ASSETS_BUCKET.get(key);
  if (!obj) throw new NotFound(`requested object not found (${key})`);

  const json = await obj.json();
  if (!json) throw new InternalError(`requested object corrupted (${key})`);
  return json as T;
};

/**
 * Helper function to fetch and cache a file from the bucket
 */
export const getCachedFileKV = async (c: Context, key: string): Promise<string> => {
  const cached = await c.env.ASSETS_KV.get(key);
  if (cached) {
    console.info(`KV cache hit for ${key}`);
    return cached;
  }
  const text = await getFile(c, key);
  c.executionCtx.waitUntil(c.env.ASSETS_KV.put(key, text, { expirationTtl: DEFAULT_TTL }));
  return text;
};

/**
 * Helper function to fetch a file from the bucket
 */
export const getFile = async (c: Context, key: string): Promise<string> => {
  const obj = await c.env.ASSETS_BUCKET.get(key);
  if (!obj) throw new NotFound(`requested object not found (${key})`);

  const text = await obj.text();
  if (!text) throw new InternalError(`requested object corrupted (${key})`);
  return text;
};
