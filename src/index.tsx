import { Hono } from "hono";
import { trimTrailingSlash } from "hono/trailing-slash";
import heroes from "./heroes";
import items from "./items";
import {
  type Bindings,
  type JsonObject,
  getVersionedJsonFile,
  getVersionedLanguageJsonFile,
  languageMiddleware,
  versionMiddleware,
} from "./utils";

const appBase = new Hono<{ Bindings: Bindings }>({ strict: true });

appBase.use(trimTrailingSlash());

appBase.get("/", versionMiddleware, async (c) =>
  c.render(<h1>TODO: Host OpenAPI Documentation</h1>),
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
  c.json(await getVersionedJsonFile<JsonObject[]>(c, "colors_data")),
);
api_v1.get("/map", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject[]>(c, "map_data")),
);
api_v1.get("/steam-info", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject[]>(c, "steam_info")),
);
api_v1.get("/icons", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject[]>(c, "icons_data")),
);
api_v1.get("/sounds", versionMiddleware, async (c) =>
  c.json(await getVersionedJsonFile<JsonObject[]>(c, "sounds_data")),
);
appBase.route("/v1", api_v1);

const api_v2 = new Hono<{ Bindings: Bindings }>({ strict: true });
api_v2.route("/heroes", heroes);
api_v2.route("/items", items);

api_v2.get("/ranks", versionMiddleware, languageMiddleware, async (c) =>
  c.json(await getVersionedLanguageJsonFile<JsonObject[]>(c, "ranks")),
);
appBase.route("/v2", api_v2);

export default appBase;
