import { type } from "arktype";
import { arktypeValidator } from "@hono/arktype-validator";
import {
  JsonNotFound,
  type Bindings,
  type JsonObject,
  versionMiddleware,
  languageMiddleware,
  getVersionedLanguageJsonFile,
} from "./utils";
import { Hono } from "hono";
import { trimTrailingSlash } from "hono/trailing-slash";

const appBase = new Hono<{ Bindings: Bindings }>({ strict: true });

const api = new Hono<{ Bindings: Bindings }>({ strict: true });

appBase.use(trimTrailingSlash());

appBase.get("/", versionMiddleware, async (c) => {
  const version = c.get("version");
  return c.render(
    <>
      <h1>Hello! This is the Deadlock assets API. </h1>
      <h2>
        You're probably looking for <a href="/v3">/v3</a>
      </h2>
      <p>Latest game version: {version}</p>
    </>,
  );
});

api.get("/", versionMiddleware, async (c) => {
  const version = c.get("version");

  return c.render(
    <>
      <h1>Deadlock Assets API V3</h1>
      <p>Latest game version: {version}</p>
      <p>This is a placeholder for the API docs.</p>

      <div>
        <h2>Routes</h2>
        <ul>
          <li>
            <a href="/v3/heroes">/v3/heroes</a> - Get all heroes
          </li>
          <li>
            <a href="/v3/heroes/1">/v3/heroes/:id</a> - Get a hero by id
          </li>
        </ul>
      </div>
    </>,
  );
});

api.get("/heroes", versionMiddleware, languageMiddleware, async (c) => {
  const json = await getVersionedLanguageJsonFile<JsonObject[]>(c, "heroes");

  return c.json(json);
});

api.get(
  "/heroes/:id",
  arktypeValidator(
    "param",
    type({ id: type("string.integer.parse").to("number > 0") }),
  ),
  versionMiddleware,
  languageMiddleware,
  async (c) => {
    const json = await getVersionedLanguageJsonFile<JsonObject[]>(c, "heroes");

    const { id } = c.req.valid("param");

    const hero = json.find((hero: JsonObject) => hero?.id === id);
    if (!hero) throw new JsonNotFound(`hero not found (id: ${id})`);

    return c.json(hero);
  },
);

appBase.route("/v3", api);

export default appBase;
