import PocketBase from 'pocketbase';
import "https://deno.land/std@0.178.0/dotenv/load.ts";
import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";
import { parseData, readCsv } from "./utils/csv.ts";
import { createSchema } from "./utils/pocketbase.ts";
import { Collection } from "./types/pocketbase.ts";

/**
 * Structures and populates a new collection from a CSV file.
 */
async function importCsv() {
  // config data
  const pbUrl = Deno.env.get("POCKETBASE_URL") ?? "http://localhost:8090";
  const adminName = Deno.env.get("ADMIN_EMAIL") ?? "";
  const adminPass = Deno.env.get("ADMIN_PASSWORD") ?? "";

  // parse CLI args
  const options = parse(Deno.args, {
    string: ["input", "delimiter", "quote"],
    boolean: ["id", "lf"],
    default: {
      /**
       * Name of the CSV file to import.
       */
      input: null,
      /**
       * Value separator (defaults to `,`).
       */
      delimiter: ",",
      /**
       * Quote character (defaults to `'`).
       */
      quote: "'",
      /**
       * Flag to always set `_id` column type to Plain text (detected by default).
       */
      id: false,
      /**
       * Whether LF end-of-line should be used (defaults to CRLF).
       */
      lf: false,
    },
  });

  if (options.input === null) {
    console.error("%cOptionError: CSV file name not supplied", "color: red");
    Deno.exit(-1);
  }

  // read the file
  const data = await readCsv(options.input, options);
  
  if (data === null) {
    Deno.exit(-1);
    return
  }
  // sanitize the file name for collection name
  const collectName = options.input.replace(".csv", "");

  // connect to pocketbase
  const pb = new PocketBase(pbUrl);

  // authenticate as super admin
  const _authResponse = await pb.admins.authWithPassword(adminName, adminPass);

  // collection schema object
  const schema = createSchema(data, options.id, "csv");

  const creationDate = new Date().toISOString();

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
  await pb.collections.import([collection]);

  console.log(
    `%c[Import] Collection '${collectName}' created!`,
    "color: green",
  );

  // rows to be sent via PocketBase API
  const rows = parseData(data, schema);

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

importCsv();
