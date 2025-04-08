import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export type Bindings = {
  ASSETS_BUCKET: R2Bucket;
  ASSETS_KV: KVNamespace;
};

export type BaseEnv = { Bindings: Bindings };

export class JsonNotFound extends HTTPException {
  constructor(userMessage: string) {
    super(404, {
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

/**
 * Middleware which fetches `assets-api-data/versions/latest_version.txt` and sets the version in the context
 * Overrideable by query param `version`
 */
export const versionMiddleware = createMiddleware<
  BaseEnv & {
    Variables: {
      version: string;
    };
  }
>(async (c, next) => {
  const versionQ = c.req.query("version");
  if (versionQ && Number.isInteger(Number.parseInt(versionQ))) {
    c.set("version", versionQ);
  } else {
    const obj = await c.env.ASSETS_BUCKET.get("assets-api-data/versions/latest_version.txt");
    const objTxt = await obj?.text();
    if (!objTxt) throw new JsonNotFound("assets-api-data/versions/latest_version.txt not found");
    c.set("version", objTxt.trim());
  }
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
 * Fetches a versioned JSON file from the bucket
 */
export const getVersionedJsonFile = async <T extends JsonValue = JsonValue>(
  c: Context<BaseEnv & { Variables: { version: string } }>,
  path: string,
): Promise<T> => {
  const version = c.get("version");
  const obj = await c.env.ASSETS_BUCKET.get(`assets-api-data/versions/${version}/${path}`);
  if (!obj) throw new JsonNotFound(`requested object not found (ver ${version}/${path})`);
  const json = await obj.json();
  if (!json) throw new JsonNotFound(`requested object corrupted (ver ${version}/${path})`);
  return json as T;
};

/**
 * Fetches a versioned language'd JSON file from the bucket
 */
export const getVersionedLanguageJsonFile = async <T extends JsonValue = JsonValue>(
  c: Context<BaseEnv & { Variables: { version: string; language: string } }>,
  path: string,
): Promise<T> => {
  const version = c.get("version");
  const language = c.get("language");
  const obj = await c.env.ASSETS_BUCKET.get(
    `assets-api-data/versions/${version}/${path}/${language}.json`,
  );
  if (!obj)
    throw new JsonNotFound(`requested object not found (ver ${version}/${path}/${language}.json)`);
  const json = await obj.json();
  if (!json)
    throw new JsonNotFound(`requested object corrupted (ver ${version}/${path}/${language}.json)`);
  return json as T;
};
