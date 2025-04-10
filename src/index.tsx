import { Hono } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "hono/trailing-slash";
import heroes from "./heroes";
import items from "./items";
import {
  type Bindings,
  type JsonObject,
  cacheMiddleware,
  getCachedFileKV,
  getVersionedJsonFile,
  getVersionedLanguageJsonFile,
  languageMiddleware,
  rateLimitMiddleware,
  versionMiddleware,
} from "./utils";

const appBase = new Hono<{ Bindings: Bindings }>({ strict: true });

appBase.use(trimTrailingSlash());
appBase.use(rateLimitMiddleware);
appBase.use(cacheMiddleware);
appBase.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "HEAD"],
  }),
);

appBase.get("/", versionMiddleware, async (c) =>
  c.render(
    <html lang="en">
      <head>
        <title>Deadlock API - Assets</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <script
          id="api-reference"
          data-url="https://assets-bucket.deadlock-api.com/assets-api-data/openapi.json"
        />
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference" />
      </body>
    </html>,
  ),
);

const api_raw = new Hono<{ Bindings: Bindings }>({ strict: true });
api_raw.get("/heroes", versionMiddleware, async (c) => {
  const data = await getVersionedJsonFile<string>(c, "raw_heroes", true);
  return c.body(data, 200, {
    "Content-Type": "application/json",
  });
});
api_raw.get("/items", versionMiddleware, async (c) => {
  const data = await getVersionedJsonFile<string>(c, "raw_items", true);
  return c.body(data, 200, {
    "Content-Type": "application/json",
  });
});
api_raw.get("/generic_data", versionMiddleware, async (c) => {
  const data = await getVersionedJsonFile<string>(c, "generic_data", true);
  return c.body(data, 200, {
    "Content-Type": "application/json",
  });
});
appBase.route("/raw", api_raw);

const api_v1 = new Hono<{ Bindings: Bindings }>({ strict: true });
api_v1.get("/colors", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject>(c, "colors_data")),
);
api_v1.get("/map", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject>(c, "map_data")),
);
api_v1.get("/steam-info", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject>(c, "steam_info")),
);
api_v1.get("/icons", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject>(c, "icons_data")),
);
api_v1.get("/sounds", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject>(c, "sounds_data")),
);
appBase.route("/v1", api_v1);

const api_v2 = new Hono<{ Bindings: Bindings }>({ strict: true });
api_v2.route("/heroes", heroes);
api_v2.route("/items", items);
api_v2.get("/ranks", versionMiddleware, languageMiddleware, async (c) =>
  c.json(await getVersionedLanguageJsonFile<JsonObject[]>(c, "ranks")),
);
api_v2.get("/client-versions", async (c) => {
  c.header("Content-Type", "application/json");
  const data = await getCachedFileKV(c, "assets-api-data/client_versions.json");
  return c.body(data);
});
appBase.route("/v2", api_v2);

export default appBase;
