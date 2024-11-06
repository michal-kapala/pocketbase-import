import PocketBase from 'pocketbase';
import "https://deno.land/std@0.178.0/dotenv/load.ts";
import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";
import { readJson, resolveConflicts } from "./utils/json.ts";
import { createSchema } from "./utils/pocketbase.ts";
import { Collection } from './types/pocketbase.ts'

/**
 * Structures and populates a new collection from a JSON file.
 */
async function importJson() {
  // config data
  const pbUrl = Deno.env.get("POCKETBASE_URL") ?? "http://localhost:8090";
  const adminName = Deno.env.get("ADMIN_EMAIL") ?? "";
  const adminPass = Deno.env.get("ADMIN_PASSWORD") ?? "";

  // parse CLI args
  const options = parse(Deno.args, {
    string: ["input"],
    boolean: ["id"],
    default: {
      /**
       * Name of the JSON file to import (with extension).
       */
      input: null,
      /**
       * Flag to always set `_id` column type to Plain text (detected by default).
       */
      id: false,
    },
  });

  if (options.input === null) {
    console.error("%cOptionError: JSON file name not supplied", "color: red");
    Deno.exit(-1);
  }

  // read the file
  const data = await readJson(options.input);

  // sanitize the file name for collection name
  const collectName = options.input.replace(".json", "");

  // connect to pocketbase
  const pb = new PocketBase(pbUrl);

  // authenticate as super admin
  const _authResponse = await pb.admins.authWithPassword(adminName, adminPass);

  // collection schema object
  const schema = createSchema(data, options.id, "json");

  // the new collection
  const collection: Collection = {
    name: collectName,
    type: "base",
    system: false,
    schema,
    indexes: [],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    options: {},
  };

  // show the submitted collection
  console.log(collection);

  // create the new collection
  // import will fail if a collection with the same name exists
  await pb.collections.import([collection], false);

  console.log(
    `%c[Import] Collection '${collectName}' created!`,
    "color: green",
  );

  // prefix conflicting column names
  const rows = resolveConflicts(data);

  console.log(`[Import] Importing ${rows.length} rows...`);

  // number of successfully inserted rows
  let insertCount = 0;

  for (insertCount; insertCount < rows.length; insertCount++) {
    try {
      await pb.collection(collectName).create(rows[insertCount], {
        "$autoCancel": false,
      });
    } catch (e) {
      // breaks on first error
      console.error(e);
      break;
    }
  }

  const color = insertCount === data.length ? "green" : "orange";
  console.log(
    `%c[Import] Imported rows: ${insertCount}/${data.length}`,
    `color: ${color}`,
  );
}

importJson();
