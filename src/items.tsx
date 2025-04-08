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

const items = new Hono<{ Bindings: Bindings }>({ strict: true });

items.get("", versionMiddleware, languageMiddleware, async (c) =>
  c.json(await getVersionedLanguageJsonFile<JsonObject[]>(c, "items")),
);

items.get(
  "/:id_or_classname",
  arktypeValidator("param", type({ id_or_classname: type("string") })),
  versionMiddleware,
  languageMiddleware,
  async (c) => {
    const json = await getVersionedLanguageJsonFile<JsonObject[]>(c, "items");

    const { id_or_classname } = c.req.valid("param");

    const id = Number.parseInt(id_or_classname);
    const isId = !Number.isNaN(id);

    const item = json.find((item: JsonObject) =>
      isId ? item?.id === id : item?.class_name === id_or_classname,
    );
    if (!item) throw new JsonNotFound(`item not found (id_or_classname: ${id_or_classname})`);

    return c.json(item);
  },
);

items.get(
  "/by-hero-id/:hero_id",
  arktypeValidator("param", type({ hero_id: type("string.integer.parse") })),
  versionMiddleware,
  languageMiddleware,
  async (c) => {
    const json = await getVersionedLanguageJsonFile<JsonObject[]>(c, "items");

    const { hero_id } = c.req.valid("param");

    const filter_class_names = [
      "citadel_ability_climb_rope",
      "citadel_ability_dash",
      "citadel_ability_sprint",
      "citadel_ability_melee_parry",
      "citadel_ability_jump",
      "citadel_ability_mantle",
      "citadel_ability_slide",
      "citadel_ability_zip_line",
      "citadel_ability_zipline_boost",
    ];
    const items = json.filter((item: JsonObject) => {
      const heroes = item?.heroes as number[];
      const class_name = item?.class_name as string;
      return heroes.includes(hero_id) && !filter_class_names.includes(class_name);
    });

    return c.json(items);
  },
);

items.get(
  "/by-slot-type/:item_slot_type",
  arktypeValidator("param", type({ item_slot_type: type("string") })),
  versionMiddleware,
  languageMiddleware,
  async (c) => {
    const json = await getVersionedLanguageJsonFile<JsonObject[]>(c, "items");

    const { item_slot_type } = c.req.valid("param");

    const item_slot_types = ["weapon", "ability", "upgrade", "tech", "armor"];

    if (!item_slot_types.includes(item_slot_type)) {
      throw new JsonNotFound(
        `item type not found (type: ${item_slot_type}) - must be one of ${item_slot_types.join(", ")})`,
      );
    }

    const items = json.filter((item: JsonObject) => item.type === item_slot_type);

    return c.json(items);
  },
);

export default items;
