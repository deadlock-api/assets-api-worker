import { arktypeValidator } from "@hono/arktype-validator";
import { type } from "arktype";
import { Hono } from "hono";
import {
  type Bindings,
  JsonNotFound,
  type JsonObject,
  getVersionedLanguageJsonFile,
  languageMiddleware,
  versionMiddleware,
} from "./utils";

const heroes = new Hono<{ Bindings: Bindings }>({ strict: true });

heroes.get("", versionMiddleware, languageMiddleware, async (c) =>
  c.json(await getVersionedLanguageJsonFile<JsonObject[]>(c, "heroes")),
);

heroes.get(
  "/:id",
  arktypeValidator("param", type({ id: type("string.integer.parse").to("number > 0") })),
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

heroes.get(
  "/by-name/:name",
  arktypeValidator("param", type({ name: type("string") })),
  versionMiddleware,
  languageMiddleware,
  async (c) => {
    const json = await getVersionedLanguageJsonFile<JsonObject[]>(c, "heroes");

    const { name } = c.req.valid("param");
    const nameLower = name.toLowerCase();
    const classNameMatch = [nameLower, `hero_${nameLower}`];

    const hero = json.find((hero: JsonObject) => {
      const className = (hero?.class_name as string).toLowerCase();
      const heroName = (hero?.name as string).toLowerCase();
      return heroName === nameLower || classNameMatch.includes(className);
    });

    return c.json(hero);
  },
);

export default heroes;
